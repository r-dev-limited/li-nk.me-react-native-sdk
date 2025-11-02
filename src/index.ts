import { NativeModules, NativeEventEmitter, Linking, EmitterSubscription } from 'react-native';

const LinkMe: any = (NativeModules as any)?.LinkMe ?? null;

type UrlListener = (url: string) => void;

const urlSubscribers = new Set<UrlListener>();
let lastEmittedUrl: string | null = null;

function emitUrl(rawUrl: string | null | undefined) {
    if (!rawUrl) return;
    if (rawUrl === lastEmittedUrl) return;
    lastEmittedUrl = rawUrl;
    const listeners = Array.from(urlSubscribers);
    for (const listener of listeners) {
        try {
            listener(rawUrl);
        } catch (_) { }
    }
}

function addUrlSubscriber(listener: UrlListener): () => void {
    urlSubscribers.add(listener);
    return () => {
        urlSubscribers.delete(listener);
    };
}

if (LinkMe) {
    addUrlSubscriber((url) => {
        try {
            LinkMe?.handleUrl?.(url);
        } catch (_) { }
    });
}

const originalGetInitialURL = typeof Linking.getInitialURL === 'function'
    ? Linking.getInitialURL.bind(Linking)
    : null;

let initialUrlCaptured = false;
let initialUrlValue: string | null = null;
let initialUrlPromise: Promise<string | null> | null = null;

if (originalGetInitialURL) {
    Linking.getInitialURL = () => {
        if (initialUrlCaptured) {
            return Promise.resolve(initialUrlValue);
        }
        if (!initialUrlPromise) {
            initialUrlPromise = Promise.resolve(originalGetInitialURL()).then((value) => {
                const url = value ?? null;
                initialUrlCaptured = true;
                initialUrlValue = url;
                emitUrl(url);
                return url;
            });
        }
        return initialUrlPromise;
    };
}

export type LinkMePayload = {
    linkId?: string;
    path?: string;
    params?: Record<string, string>;
    utm?: Record<string, string>;
    custom?: Record<string, string>;
};

export type LinkMeConfig = {
    baseUrl: string;
    appId?: string;
    appKey?: string;
    enablePasteboard?: boolean;
    sendDeviceInfo?: boolean;
    includeVendorId?: boolean;
    includeAdvertisingId?: boolean;
};

// Create a safe event emitter that does not throw when the native module is unavailable
const eventEmitter: { addListener: (event: string, listener: (payload: LinkMePayload) => void) => { remove: () => void } } =
    LinkMe ? new NativeEventEmitter(LinkMe) : {
        addListener: (_event: string, _listener: (payload: LinkMePayload) => void) => ({ remove: () => { } }),
    };

let linkingSub: EmitterSubscription | null = null;

function ensureForwarding() {
    if (linkingSub) return;
    linkingSub = Linking.addEventListener('url', ({ url }: { url: string }) => {
        emitUrl(url);
    });
    Linking.getInitialURL().then((url: string | null) => {
        emitUrl(url);
    });
}

ensureForwarding();

export function configure(config: LinkMeConfig): Promise<void> {
    ensureForwarding();
    return LinkMe?.configure?.(config) ?? Promise.resolve();
}

export function getInitialLink(): Promise<LinkMePayload | null> {
    return LinkMe?.getInitialLink?.() ?? Promise.resolve(null);
}

export function claimDeferredIfAvailable(): Promise<LinkMePayload | null> {
    return LinkMe?.claimDeferredIfAvailable?.() ?? Promise.resolve(null);
}

export function setUserId(userId: string): Promise<void> {
    return LinkMe?.setUserId?.(userId) ?? Promise.resolve();
}

export function setAdvertisingConsent(granted: boolean): Promise<void> {
    return LinkMe?.setAdvertisingConsent?.(granted) ?? Promise.resolve();
}

export function setReady(): Promise<void> {
    return LinkMe?.setReady?.() ?? Promise.resolve();
}

export function track(event: string, properties?: Record<string, any>): Promise<void> {
    return LinkMe?.track?.(event, properties ?? null) ?? Promise.resolve();
}

export function onLink(listener: (payload: LinkMePayload) => void): { remove: () => void } {
    const sub = eventEmitter.addListener('link', listener);
    return { remove: () => sub.remove() };
}

// Instance-based client for DI and testing parity with Node SDK
export class LinkMeClient {
    private readonly module: any;
    private readonly emitter: { addListener: (event: string, listener: (payload: LinkMePayload) => void) => { remove: () => void } };
    private linkingSub: EmitterSubscription | null = null;
    private readonly forwardUrl: (url: string | null | undefined) => void;

    constructor(deps?: { module?: any; emitter?: NativeEventEmitter }) {
        this.module = deps?.module ?? (NativeModules as any)?.LinkMe ?? null;
        this.emitter = deps?.emitter ?? (this.module ? new NativeEventEmitter(this.module) : { addListener: (_e: string, _l: (p: LinkMePayload) => void) => ({ remove: () => { } }) });
        this.forwardUrl = (url: string | null | undefined) => {
            if (!url) return;
            if (this.module === LinkMe) {
                return;
            }
            try {
                this.module?.handleUrl?.(url);
            } catch (_) { }
        };
    }

    private ensureForwarding() {
        if (this.linkingSub) return;
        this.linkingSub = Linking.addEventListener('url', ({ url }: { url: string }) => {
            emitUrl(url);
            this.forwardUrl(url);
        });
        Linking.getInitialURL().then((url: string | null) => {
            emitUrl(url);
            this.forwardUrl(url);
        });
    }

    configure(config: LinkMeConfig): Promise<void> {
        this.ensureForwarding();
        return this.module?.configure?.(config) ?? Promise.resolve();
    }

    getInitialLink(): Promise<LinkMePayload | null> {
        return this.module?.getInitialLink?.() ?? Promise.resolve(null);
    }

    claimDeferredIfAvailable(): Promise<LinkMePayload | null> {
        return this.module?.claimDeferredIfAvailable?.() ?? Promise.resolve(null);
    }

    setUserId(userId: string): Promise<void> {
        return this.module?.setUserId?.(userId) ?? Promise.resolve();
    }

    setAdvertisingConsent(granted: boolean): Promise<void> {
        return this.module?.setAdvertisingConsent?.(granted) ?? Promise.resolve();
    }

    setReady(): Promise<void> {
        return this.module?.setReady?.() ?? Promise.resolve();
    }

    track(event: string, properties?: Record<string, any>): Promise<void> {
        return this.module?.track?.(event, properties ?? null) ?? Promise.resolve();
    }

    onLink(listener: (payload: LinkMePayload) => void): { remove: () => void } {
        const sub = this.emitter.addListener('link', listener);
        return { remove: () => sub.remove() };
    }
}

export default LinkMeClient;
