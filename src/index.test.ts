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
