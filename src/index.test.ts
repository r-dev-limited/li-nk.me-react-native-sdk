import { LinkMeClient } from './index';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NativeModules, Platform } from 'react-native';

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(async () => ''),
  setStringAsync: jest.fn(async () => undefined),
  setString: jest.fn(),
}), { virtual: true });

const clipboard = require('expo-clipboard') as {
  getStringAsync: jest.Mock<Promise<string>, []>;
  setStringAsync: jest.Mock<Promise<void>, [string]>;
  setString: jest.Mock<void, [string]>;
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function linking(initialUrl: string | null = null) {
  const opened: string[] = [];
  let handler: ((event: { url: string }) => void) | undefined;
  return {
    opened,
    addEventListener: (_event: string, next: (event: { url: string }) => void) => {
      handler = next;
      return { remove: () => { handler = undefined; } };
    },
    getInitialURL: async () => initialUrl,
    openURL: async (url: string) => { opened.push(url); return true; },
    emit: (url: string) => handler?.({ url }),
  };
}

describe('LinkMeClient', () => {
  afterEach(() => jest.useRealTimers());

  it('bounds stalled fetch/body/event operations and cancels their transport signals', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn<Promise<Response>, [string, RequestInit?]>().mockImplementation(() => new Promise(() => {}));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: linking() as any });
    for (const requestTimeoutMs of [0, -1, NaN, Infinity, 1.5, 2_147_483_648]) {
      await expect(client.configure({ requestTimeoutMs })).rejects.toThrow(RangeError);
    }
    await client.configure({ baseUrl: 'https://li-nk.me', requestTimeoutMs: 30 });
    const request = client.handleUrl('https://li-nk.me/?cid=stalled1');
    await jest.advanceTimersByTimeAsync(30);
    await expect(request).resolves.toBe(false);
    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);

    fetchImpl.mockImplementationOnce(async () => ({ ok: true, status: 200, text: () => new Promise(() => {}) } as Response));
    const body = client.handleUrl('https://li-nk.me/?cid=stalled2');
    await jest.advanceTimersByTimeAsync(30);
    await expect(body).resolves.toBe(false);
    expect(fetchImpl.mock.calls[1][1]?.signal?.aborted).toBe(true);

    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const event = client.track('stalled');
      await jest.advanceTimersByTimeAsync(30);
      await expect(event).resolves.toBeUndefined();
      expect(fetchImpl.mock.calls[2][1]?.signal?.aborted).toBe(true);
      expect(jest.getTimerCount()).toBe(0);
    } finally { warning.mockRestore(); client.dispose(); }
  });

  it('cancels body reads across app/identity changes and disposal, even if transport ignores abort', async () => {
    const l = linking();
    let release!: (text: string) => void;
    let started!: () => void;
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200, text: () => { started(); return new Promise<string>(resolve => { release = resolve; }); } } as Response));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    const received: unknown[] = [];
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'old-app' });
    client.onLink(payload => received.push(payload));
    for (const change of ['configure', 'identity', 'dispose', 'cancel']) {
      const bodyStarted = new Promise<void>(resolve => { started = resolve; });
      const pending = client.handleUrl('https://li-nk.me/?cid=pending1');
      await bodyStarted;
      if (change === 'configure') await client.configure({ baseUrl: 'https://li-nk.me', appId: 'new-app' });
      if (change === 'identity') await client.setUserId('new-user');
      if (change === 'dispose') client.dispose();
      if (change === 'cancel') client.cancelPendingRequests();
      await expect(pending).resolves.toBe(false);
      expect((fetchImpl.mock.calls[fetchImpl.mock.calls.length - 1] as unknown as [string, RequestInit])[1].signal?.aborted).toBe(true);
      release(JSON.stringify({ path: '/old-app', forceRedirectWeb: true, webFallbackUrl: 'https://must-not-open.example' }));
      await Promise.resolve();
      expect(received).toEqual([]);
      expect(l.opened).toEqual([]);
      if (change === 'dispose') await client.configure({ baseUrl: 'https://li-nk.me' });
    }
    client.dispose();
  });

  it('stops remaining routing callbacks after a reentrant lifecycle change', async () => {
    for (const change of ['configure', 'identity', 'dispose', 'cancel']) {
      const client = new LinkMeClient({ fetchImpl: jest.fn(async () => jsonResponse({ path: '/route' })) as typeof fetch, linking: linking() as any });
      await client.configure({ baseUrl: 'https://li-nk.me' });
      const later = jest.fn();
      client.onLink(() => {
        if (change === 'configure') void client.configure({ baseUrl: 'https://li-nk.me', appId: 'new-app' });
        if (change === 'identity') void client.setUserId('new-user');
        if (change === 'dispose') client.dispose();
        if (change === 'cancel') client.cancelPendingRequests();
      });
      client.onLink(later);
      await client.handleUrl('https://li-nk.me/?cid=reentrant');
      expect(later).not.toHaveBeenCalled();
      client.dispose();
    }
  });

  it('drops unsent analytics on app switch and does not transfer old identity to the next event', async () => {
    const fetchImpl = jest.fn(async (_url: string, _init?: RequestInit) => jsonResponse(null, 204));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: linking() as any });
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-a' });
      await client.setUserId('user-a');
      const queued = client.track('old-event');
      await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-b' });
      await queued;
      expect(fetchImpl).not.toHaveBeenCalled();
      await client.track('new-event');
      expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({ 'x-app-id': 'app-b' });
      const body = JSON.parse(fetchImpl.mock.calls[0][1]?.body as string);
      expect(body).toMatchObject({ type: 'new-event' });
      expect(body).not.toHaveProperty('userId');
    } finally { warning.mockRestore(); client.dispose(); }
  });

  it.each(['android', 'ios'])('does not write old %s claim telemetry after a routing listener switches app', async platform => {
    (Platform as any).OS = platform;
    (NativeModules as any).LinkMeInstallReferrer = { getInstallReferrer: jest.fn(async () => 'cid=abcdef12') };
    clipboard.getStringAsync.mockResolvedValue('linkme:cid=abcdef12');
    const fetchImpl = jest.fn(async () => jsonResponse({ cid: 'abcdef12', path: '/old-app' }));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: linking() as any });
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-a' });
    client.onLink(() => { void client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-b' }); });
    await expect(client.claimDeferredIfAvailable()).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(clipboard.setStringAsync).not.toHaveBeenCalled();
    client.dispose();
  });

  it('does not clear the clipboard or send old claim telemetry after switching app during a clipboard read', async () => {
    (Platform as any).OS = 'ios';
    let clearStarted!: () => void;
    let release!: (value: string) => void;
    const started = new Promise<void>(resolve => { clearStarted = resolve; });
    clipboard.getStringAsync.mockResolvedValueOnce('linkme:cid=abcdef12').mockImplementationOnce(() => {
      clearStarted();
      return new Promise(resolve => { release = resolve; });
    });
    const fetchImpl = jest.fn(async () => jsonResponse({ cid: 'abcdef12', path: '/old-app' }));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: linking() as any });
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-a' });
    const old = client.claimDeferredIfAvailable();
    await started;
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-b' });
    release('linkme:cid=abcdef12');
    await expect(old).resolves.toBeNull();
    expect(clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    client.dispose();
  });

  it('does not return the new app payload to an old initial-URL caller', async () => {
    let release!: (url: string | null) => void;
    const l = { ...linking(), getInitialURL: () => new Promise<string | null>(resolve => { release = resolve; }) };
    const fetchImpl = jest.fn(async () => jsonResponse({ cid: 'new12345', path: '/new-app' }));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-a' });
    const old = client.getInitialLink();
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-b' });
    await client.handleUrl('https://li-nk.me/?cid=new12345');
    release(null);
    await expect(old).resolves.toBeNull();
    await expect(client.getInitialLink()).resolves.toMatchObject({ path: '/new-app' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    client.dispose();
  });
  beforeEach(() => {
    (Platform as any).OS = 'android';
    (Platform as any).Version = 35;
    delete (NativeModules as any).LinkMeInstallReferrer;
    clipboard.getStringAsync.mockReset().mockResolvedValue('');
    clipboard.setStringAsync.mockReset().mockResolvedValue(undefined);
    clipboard.setString.mockReset();
  });

  it('does not consume the initial URL before configure', async () => {
    const l = linking('https://li-nk.me/?cid=abc12345');
    const fetchImpl = jest.fn(async () => jsonResponse({ cid: 'abc12345', path: '/welcome' }));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });

    await expect(client.getInitialLink()).resolves.toBeNull();
    await client.configure({ baseUrl: 'https://li-nk.me' });
    await expect(client.getInitialLink()).resolves.toMatchObject({ cid: 'abc12345', path: '/welcome' });
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('/api/deeplink?cid=abc12345'), expect.anything());
  });

  it('opens forced web redirects without emitting them', async () => {
    const l = linking();
    const fetchImpl = jest.fn(async () => jsonResponse({ forceRedirectWeb: true, webFallbackUrl: 'https://example.test' }));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    const emitted: unknown[] = [];
    await client.configure({ baseUrl: 'https://li-nk.me' });
    client.onLink((payload) => emitted.push(payload));

    await expect(client.handleUrl('https://li-nk.me/?cid=abc12345')).resolves.toBe(true);
    expect(l.opened).toEqual(['https://example.test']);
    expect(emitted).toHaveLength(0);
  });

  it('sends the Edge analytics contract and ignores malformed payloads', async () => {
    const l = linking();
    const fetchImpl = jest
      .fn<Promise<Response>, [string, RequestInit?]>()
      .mockResolvedValueOnce(jsonResponse({ cid: 'abc12345', path: '/welcome' }))
      .mockResolvedValueOnce(jsonResponse({ type: 'open' }, 204))
      .mockResolvedValueOnce(jsonResponse({}));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me' });
    await client.handleUrl('https://li-nk.me/?cid=abc12345');
    await client.track('open', { page: 'home' });
    const eventBody = JSON.parse(fetchImpl.mock.calls[1][1]?.body as string);
    expect(eventBody).toMatchObject({ type: 'open', cid: 'abc12345', detail: JSON.stringify({ page: 'home' }) });
    await expect(client.handleUrl('https://li-nk.me/?cid=bad12345')).resolves.toBe(false);
  });

  it('suppresses routing and browser launch for inferred metadata-only responses', async () => {
    const l = linking();
    const fetchImpl = jest.fn(async () => jsonResponse({ navigationAllowed: false, claimId: 'inferred', utm: { utm_source: 'campaign' }, forceRedirectWeb: true, webFallbackUrl: 'https://must-not-open.example' }));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app' });
    const routed: unknown[] = [];
    client.onLink(payload => routed.push(payload));
    await client.claimDeferredIfAvailable();
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('/deferred/claim'), expect.anything());
    expect(routed).toEqual([]);
    expect(l.opened).toEqual([]);
    fetchImpl.mockImplementationOnce(async () => jsonResponse({ navigationAllowed: 'false', path: '/must-not-route' }));
    await expect(client.handleUrl('https://li-nk.me/?cid=abcd1234')).resolves.toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(routed).toEqual([]);
    expect(l.opened).toEqual([]);
  });

  it('retains claim policy metadata through URL resolution', async () => {
    const fixture = JSON.parse(readFileSync(resolve(__dirname, '../test-fixtures/link-payload.claim-policy-v2.json'), 'utf8'));
    const client = new LinkMeClient({ fetchImpl: jest.fn(async () => jsonResponse(fixture)) as typeof fetch, linking: linking() as any });
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app' });
    await client.handleUrl(`https://li-nk.me/?cid=${fixture.cid}`);
    await expect(client.getInitialLink()).resolves.toMatchObject({ claimId: fixture.claimId, claimMethod: 'direct_cid', matchConfidence: 'high', attributionStatus: 'deterministic', claimPolicyVersion: 2, contractVersion: 1 });
  });

  it('parses the shared v1 golden payload and ignores future fields', async () => {
    const fixture = JSON.parse(readFileSync(resolve(__dirname, '../test-fixtures/link-payload.valid.json'), 'utf8'));
    const l = linking();
    const fetchImpl = jest.fn(async () => jsonResponse(fixture));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me' });

    await expect(client.handleUrl('https://li-nk.me/?cid=cid-golden-001')).resolves.toBe(true);
    await expect(client.getInitialLink()).resolves.toMatchObject({
      cid: 'cid-golden-001',
      linkId: 'link-golden-001',
      path: '/welcome/春',
      duplicate: false,
    });
    expect(await client.getInitialLink()).not.toHaveProperty('fixtureVersion');
  });

  it('queues URLs received before configure and drains them after readiness', async () => {
    const l = linking();
    const fetchImpl = jest.fn(async () => jsonResponse({ cid: 'queued123', path: '/queued' }));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await expect(client.handleUrl('https://li-nk.me/?cid=queued123')).resolves.toBe(false);
    await client.configure({ baseUrl: 'https://li-nk.me' });
    await expect(client.getInitialLink()).resolves.toMatchObject({ cid: 'queued123', path: '/queued' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('drops an in-flight response after reconfiguration', async () => {
    let releaseOldResponse!: (response: Response) => void;
    const oldResponse = new Promise<Response>((resolve) => {
      releaseOldResponse = resolve;
    });
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('old.example')) return oldResponse;
      return jsonResponse({ cid: 'new123', path: '/new' });
    });
    const l = linking();
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    const emitted: unknown[] = [];
    client.onLink((payload) => emitted.push(payload));

    await client.configure({ baseUrl: 'https://old.example' });
    await client.setUserId('old-user');
    const oldRequest = client.handleUrl('https://old.example/?cid=old123');
    await Promise.resolve();
    await client.configure({ baseUrl: 'https://new.example' });
    releaseOldResponse(jsonResponse({ cid: 'old123', path: '/old' }));

    await expect(oldRequest).resolves.toBe(false);
    expect(emitted).toHaveLength(0);
    await expect(client.handleUrl('https://new.example/?cid=new123')).resolves.toBe(true);
    expect(emitted).toHaveLength(1);
    await client.track('open');
    const calls = fetchImpl.mock.calls as Array<[string, RequestInit?]>;
    const lastCall = calls[calls.length - 1];
    const trackBody = JSON.parse(lastCall?.[1]?.body as string);
    expect(trackBody).not.toHaveProperty('userId');
  });

  it('resolves universal URLs, sends consent-gated device data, and rejects unsupported schemes', async () => {
    const l = linking();
    const fetchImpl = jest.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ linkId: 'universal-1', path: '/welcome' }));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me', includeAdvertisingId: true });
    await expect(client.handleUrl('https://li-nk.me/welcome')).resolves.toBe(true);
    await expect(client.handleUrl('myapp://welcome')).resolves.toBe(false);
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/deeplink/resolve-url');
    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(request.body as string);
    expect(body.device).toMatchObject({ platform: 'android', consent: { advertising: true } });
    expect((request.headers as any)['x-app-id']).toBeUndefined();
  });

  it('claims Android install referrers and falls back when the module or referrer is unusable', async () => {
    (NativeModules as any).LinkMeInstallReferrer = {
      getInstallReferrer: jest.fn(async () => 'utm_source=fixture&cid=abcdef12'),
    };
    const l = linking();
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('/install-referrer')) return jsonResponse({ cid: 'abcdef12', linkId: 'referrer-link' });
      if (url.includes('/app-events')) return jsonResponse(null, 204);
      return jsonResponse({ cid: 'fallback12', linkId: 'fingerprint-link' });
    });
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me' });
    await expect(client.claimDeferredIfAvailable()).resolves.toMatchObject({ cid: 'abcdef12', linkId: 'referrer-link' });
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/install-referrer'))).toBe(true);

    (NativeModules as any).LinkMeInstallReferrer.getInstallReferrer.mockResolvedValueOnce('');
    await expect(client.claimDeferredIfAvailable()).resolves.toMatchObject({ cid: 'fallback12', linkId: 'fingerprint-link' });
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/deferred/claim'))).toBe(true);
  });

  it('continues to fingerprint matching after a stale referrer response and suppresses forced redirects', async () => {
    (NativeModules as any).LinkMeInstallReferrer = { getInstallReferrer: jest.fn(async () => 'cid=abcdef12') };
    const l = linking();
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('/install-referrer')) return jsonResponse({}, 200);
      if (url.includes('/deferred/claim')) return jsonResponse({ cid: 'fallback12', linkId: 'fingerprint-link' });
      return jsonResponse(null, 204);
    });
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me' });
    await expect(client.claimDeferredIfAvailable()).resolves.toMatchObject({ cid: 'fallback12' });
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/deferred/claim'))).toBe(true);

    (NativeModules as any).LinkMeInstallReferrer.getInstallReferrer.mockResolvedValueOnce('cid=abcdef12');
    fetchImpl.mockImplementationOnce(async () => jsonResponse({ forceRedirectWeb: true, webFallbackUrl: 'https://example.test' }));
    await expect(client.claimDeferredIfAvailable()).resolves.toBeNull();
    expect(l.opened).toContain('https://example.test');
  });

  it('uses iOS pasteboard tokens, clears consumed CIDs, and falls back for non-LinkMe content', async () => {
    (Platform as any).OS = 'ios';
    clipboard.getStringAsync.mockResolvedValue('linkme:cid=abcdef12');
    const l = linking();
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('/deeplink?cid=abcdef12')) return jsonResponse({ linkId: 'paste-link', path: '/paste' });
      if (url.includes('/app-events')) return jsonResponse(null, 204);
      return jsonResponse({ cid: 'fingerprint12', path: '/fallback' });
    });
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me' });
    await expect(client.claimDeferredIfAvailable()).resolves.toMatchObject({ cid: 'abcdef12', linkId: 'paste-link' });
    expect(clipboard.setStringAsync).toHaveBeenCalledWith('');

    clipboard.getStringAsync.mockResolvedValue('https://evil.example/?cid=abcdef12');
    await expect(client.claimDeferredIfAvailable()).resolves.toMatchObject({ cid: 'fingerprint12' });
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes('/deferred/claim'))).toBe(true);
  });

  it('handles pasteboard URL parsing, clear failures, and optional clipboard APIs', async () => {
    (Platform as any).OS = 'ios';
    clipboard.getStringAsync.mockResolvedValue('https://li-nk.me/?cid=abcdef12');
    clipboard.setStringAsync.mockRejectedValueOnce(new Error('denied'));
    const l = linking();
    const fetchImpl = jest.fn(async (url: string) => url.includes('/deeplink?cid=abcdef12')
      ? jsonResponse({ cid: 'abcdef12', path: '/paste' })
      : jsonResponse(null, 204));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me' });
    await expect(client.claimDeferredIfAvailable()).resolves.toMatchObject({ path: '/paste' });

    clipboard.getStringAsync.mockResolvedValue('not a URL');
    await expect(client.claimDeferredIfAvailable()).resolves.toBeNull();
    clipboard.getStringAsync.mockRejectedValueOnce(new Error('pasteboard denied'));
    await expect(client.claimDeferredIfAvailable()).resolves.toBeNull();
  });

  it('tracks string and object details, reports transport errors, and resets identity on disposal', async () => {
    const l = linking();
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ cid: 'track1234', linkId: 'track-link', path: '/track' }))
      .mockResolvedValueOnce(new Response('bad', { status: 500 }))
      .mockRejectedValueOnce(new Error('offline'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const client = new LinkMeClient({ fetchImpl: fetchImpl as any, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me', appId: 'app-1', appKey: 'key-1' });
    await client.handleUrl('https://li-nk.me/?cid=track1234');
    await client.setUserId('user-1');
    await client.track('open', 'raw-detail' as any);
    await client.track('error', { reason: 'test' });
    expect(warn).toHaveBeenCalled();
    client.dispose();
    expect(await client.getInitialLink()).toBeNull();
    warn.mockRestore();
  });

  it('removes linking listeners and handles initial URL and malformed URL failures', async () => {
    const l = linking(null);
    (l as any).getInitialURL = jest.fn(async () => { throw new Error('initial URL failure'); });
    const fetchImpl = jest.fn(async () => jsonResponse({}));
    const client = new LinkMeClient({ fetchImpl: fetchImpl as typeof fetch, linking: l as any });
    await client.configure({ baseUrl: 'https://li-nk.me' });
    await expect(client.getInitialLink()).resolves.toBeNull();
    await expect(client.handleUrl('http://[invalid')).resolves.toBe(false);
    client.dispose();
    l.emit('https://li-nk.me/?cid=abcdef12');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
