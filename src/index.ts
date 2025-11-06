import { Linking, Platform } from 'react-native';

export type LinkMePayload = {
    linkId?: string;
    path?: string;
    params?: Record<string, string>;
    utm?: Record<string, string>;
    custom?: Record<string, string>;
};

export type LinkMeConfig = {
    baseUrl?: string;
    appId?: string;
    appKey?: string;
    enablePasteboard?: boolean;
    sendDeviceInfo?: boolean;
    includeVendorId?: boolean;
    includeAdvertisingId?: boolean;
};

type NormalizedConfig = LinkMeConfig & {
    baseUrl: string;
    apiBaseUrl: string;
};

type Listener = (payload: LinkMePayload) => void;

type LinkingLike = typeof Linking;

type FetchLike = typeof fetch;

type ControllerDeps = {
    fetchImpl?: FetchLike;
    linking?: LinkingLike;
};

class LinkMeController {
    private config: NormalizedConfig | undefined;
    private ready = false;
    private advertisingConsent = false;
    private userId: string | undefined;
    private lastPayload: LinkMePayload | null = null;
    private readonly listeners = new Set<Listener>();
    private readonly pendingUrls: string[] = [];
    private linkingSubscription: { remove: () => void } | null = null;
    private initialUrlChecked = false;
    private readonly fetchImpl: FetchLike;
    private readonly linking: LinkingLike | undefined;

    constructor(deps?: ControllerDeps) {
        const impl = deps?.fetchImpl ?? (globalThis as any)?.fetch;
        if (typeof impl !== 'function') {
            throw new Error('fetch is not available; provide deps.fetchImpl');
        }
        this.fetchImpl = impl.bind(globalThis);
        this.linking = deps?.linking ?? Linking;
    }

    async configure(config: LinkMeConfig): Promise<void> {
        const normalized = normalizeConfig(config);
        this.config = normalized;
        this.advertisingConsent = !!config.includeAdvertisingId;
        this.subscribeToLinking();
        this.ready = true;
        await this.drainPending();
    }

    async getInitialLink(): Promise<LinkMePayload | null> {
        if (this.lastPayload) {
            return this.lastPayload;
        }
        if (this.initialUrlChecked) {
            return null;
        }
        this.initialUrlChecked = true;
        try {
            const url = await this.linking?.getInitialURL?.();
            if (url) {
                return await this.processUrl(url);
            }
        } catch {
            /* noop */
        }
        return this.lastPayload;
    }

    async handleUrl(url: string): Promise<boolean> {
        if (!url) {
            return false;
        }
        if (!this.ready || !this.config) {
            this.pendingUrls.push(url);
            return false;
        }
        const payload = await this.processUrl(url);
        return payload != null;
    }

    async claimDeferredIfAvailable(): Promise<LinkMePayload | null> {
        const cfg = this.config;
        if (!cfg) {
            return null;
        }
        try {
            const body: Record<string, any> = {
                platform: Platform.OS,
            };
            const device = cfg.sendDeviceInfo === false ? undefined : this.buildDevicePayload();
            if (device) {
                body.device = device;
            }
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/deferred/claim`, {
                method: 'POST',
                headers: this.buildHeaders(true),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                return null;
            }
            const payload = await this.parsePayload(res);
            if (payload) {
                this.emit(payload);
            }
            return payload;
        } catch {
            return null;
        }
    }

    setUserId(userId: string): void {
        this.userId = userId;
    }

    setAdvertisingConsent(granted: boolean): void {
        this.advertisingConsent = granted;
    }

    async setReady(): Promise<void> {
        this.ready = true;
        await this.drainPending();
    }

    async track(event: string, properties?: Record<string, any>): Promise<void> {
        const cfg = this.config;
        if (!cfg || !event) {
            return;
        }
        try {
            const body: Record<string, any> = {
                event,
                platform: Platform.OS,
                timestamp: Math.floor(Date.now() / 1000),
            };
            if (this.userId) {
                body.userId = this.userId;
            }
            if (properties) {
                body.props = properties;
            }
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/app-events`, {
                method: 'POST',
                headers: this.buildHeaders(true),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                await res.text().catch(() => undefined);
            }
        } catch {
            /* noop */
        }
    }

    onLink(listener: Listener): { remove: () => void } {
        this.listeners.add(listener);
        return {
            remove: () => {
                this.listeners.delete(listener);
            },
        };
    }

    private subscribeToLinking(): void {
        if (this.linkingSubscription || !this.linking || typeof this.linking.addEventListener !== 'function') {
            return;
        }
        const handler = (event: { url: string } | string) => {
            const incoming = typeof event === 'string' ? event : event?.url;
            if (incoming) {
                this.handleIncomingUrl(incoming);
            }
        };
        const maybeSubscription = (this.linking as any).addEventListener('url', handler);
        if (maybeSubscription && typeof maybeSubscription.remove === 'function') {
            this.linkingSubscription = maybeSubscription;
        } else if (typeof (this.linking as any).removeEventListener === 'function') {
            this.linkingSubscription = { remove: () => (this.linking as any).removeEventListener('url', handler) };
        } else {
            this.linkingSubscription = { remove: () => { } };
        }
    }

    private handleIncomingUrl(url: string): void {
        if (!url) {
            return;
        }
        if (!this.ready || !this.config) {
            this.pendingUrls.push(url);
            return;
        }
        void this.processUrl(url);
    }

    private async drainPending(): Promise<void> {
        if (!this.ready || !this.config) {
            return;
        }
        while (this.pendingUrls.length > 0) {
            const url = this.pendingUrls.shift();
            if (url) {
                await this.processUrl(url);
            }
        }
    }

    private async processUrl(url: string): Promise<LinkMePayload | null> {
        const cfg = this.config;
        if (!cfg) {
            return null;
        }
        const parsed = this.parseUrl(url);
        if (!parsed) {
            return null;
        }
        const cid = parsed.searchParams?.get('cid');
        let payload: LinkMePayload | null = null;
        if (cid) {
            payload = await this.resolveCid(cid);
        } else if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            payload = await this.resolveUniversalLink(url);
        }
        if (payload) {
            this.emit(payload);
        }
        return payload;
    }

    private parseUrl(url: string): URL | null {
        try {
            return new URL(url);
        } catch {
            try {
                return new URL(url, 'https://placeholder.local');
            } catch {
                return null;
            }
        }
    }

    private async resolveCid(cid: string): Promise<LinkMePayload | null> {
        const cfg = this.config;
        if (!cfg) {
            return null;
        }
        try {
            const headers = this.buildHeaders(false);
            const device = cfg.sendDeviceInfo === false ? undefined : this.buildDevicePayload();
            if (device) {
                headers['x-linkme-device'] = JSON.stringify(device);
            }
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/deeplink?cid=${encodeURIComponent(cid)}`, {
                method: 'GET',
                headers,
            });
            if (!res.ok) {
                return null;
            }
            return await this.parsePayload(res);
        } catch {
            return null;
        }
    }

    private async resolveUniversalLink(url: string): Promise<LinkMePayload | null> {
        const cfg = this.config;
        if (!cfg) {
            return null;
        }
        try {
            const body: Record<string, any> = { url };
            const device = cfg.sendDeviceInfo === false ? undefined : this.buildDevicePayload();
            if (device) {
                body.device = device;
            }
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/deeplink/resolve-url`, {
                method: 'POST',
                headers: this.buildHeaders(true),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                return null;
            }
            return await this.parsePayload(res);
        } catch {
            return null;
        }
    }

    private buildHeaders(includeContentType: boolean): Record<string, string> {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.config?.appId) {
            headers['x-app-id'] = this.config.appId;
        }
        if (this.config?.appKey) {
            headers['x-api-key'] = this.config.appKey;
        }
        return headers;
    }

    private buildDevicePayload(): Record<string, any> | undefined {
        const cfg = this.config;
        if (!cfg) {
            return undefined;
        }
        const device: Record<string, any> = {
            platform: Platform.OS,
        };
        const version = Platform.Version as string | number | undefined;
        if (version !== undefined) {
            device.osVersion = typeof version === 'string' ? version : String(version);
        }
        const locale = getLocale();
        if (locale) {
            device.locale = locale;
        }
        const timezone = getTimezone();
        if (timezone) {
            device.timezone = timezone;
        }
        const consent: Record<string, any> = {};
        if (cfg.includeVendorId) {
            consent.vendor = true;
        }
        if (this.advertisingConsent) {
            consent.advertising = true;
        }
        device.consent = consent;
        return device;
    }

    private async parsePayload(res: Response): Promise<LinkMePayload | null> {
        try {
            const json = (await res.json()) as LinkMePayload;
            return json ?? null;
        } catch {
            return null;
        }
    }

    private emit(payload: LinkMePayload): void {
        this.lastPayload = payload;
        for (const listener of this.listeners) {
            try {
                listener(payload);
            } catch {
                /* noop */
            }
        }
    }
}

function normalizeConfig(config: LinkMeConfig): NormalizedConfig {
    const baseUrl = config?.baseUrl || 'https://li-nk.me';
    const trimmed = baseUrl.replace(/\/$/, '');
    return {
        ...config,
        baseUrl: trimmed,
        apiBaseUrl: `${trimmed}/api`,
    };
}

function getLocale(): string | undefined {
    try {
        const intl = (Intl as any)?.DateTimeFormat;
        if (typeof intl === 'function') {
            const resolved = new intl().resolvedOptions();
            const locale = resolved?.locale ?? resolved?.localeMatcher;
            return typeof locale === 'string' ? locale : undefined;
        }
    } catch {
        /* noop */
    }
    return undefined;
}

function getTimezone(): string | undefined {
    try {
        const intl = (Intl as any)?.DateTimeFormat;
        if (typeof intl === 'function') {
            const resolved = new intl().resolvedOptions();
            const tz = resolved?.timeZone ?? resolved?.timeZoneName;
            return typeof tz === 'string' ? tz : undefined;
        }
    } catch {
        /* noop */
    }
    return undefined;
}

const defaultController = new LinkMeController();

export async function configure(config: LinkMeConfig): Promise<void> {
    await defaultController.configure(config);
}

export function getInitialLink(): Promise<LinkMePayload | null> {
    return defaultController.getInitialLink();
}

export function handleUrl(url: string): Promise<boolean> {
    return defaultController.handleUrl(url);
}

export function claimDeferredIfAvailable(): Promise<LinkMePayload | null> {
    return defaultController.claimDeferredIfAvailable();
}

export function setUserId(userId: string): Promise<void> {
    defaultController.setUserId(userId);
    return Promise.resolve();
}

export function setAdvertisingConsent(granted: boolean): Promise<void> {
    defaultController.setAdvertisingConsent(granted);
    return Promise.resolve();
}

export function setReady(): Promise<void> {
    return defaultController.setReady();
}

export function track(event: string, properties?: Record<string, any>): Promise<void> {
    return defaultController.track(event, properties);
}

export function onLink(listener: Listener): { remove: () => void } {
    return defaultController.onLink(listener);
}

export class LinkMeClient {
    private readonly controller: LinkMeController;

    constructor(deps?: ControllerDeps) {
        this.controller = new LinkMeController(deps);
    }

    configure(config: LinkMeConfig): Promise<void> {
        return this.controller.configure(config);
    }

    getInitialLink(): Promise<LinkMePayload | null> {
        return this.controller.getInitialLink();
    }

    handleUrl(url: string): Promise<boolean> {
        return this.controller.handleUrl(url);
    }

    claimDeferredIfAvailable(): Promise<LinkMePayload | null> {
        return this.controller.claimDeferredIfAvailable();
    }

    setUserId(userId: string): Promise<void> {
        this.controller.setUserId(userId);
        return Promise.resolve();
    }

    setAdvertisingConsent(granted: boolean): Promise<void> {
        this.controller.setAdvertisingConsent(granted);
        return Promise.resolve();
    }

    setReady(): Promise<void> {
        return this.controller.setReady();
    }

    track(event: string, properties?: Record<string, any>): Promise<void> {
        return this.controller.track(event, properties);
    }

    onLink(listener: Listener): { remove: () => void } {
        return this.controller.onLink(listener);
    }
}

export default LinkMeClient;
