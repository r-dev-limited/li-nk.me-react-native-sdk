import { NativeModules, NativeEventEmitter } from 'react-native';

const LinkMe: any = (NativeModules as any)?.LinkMe ?? null;

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

export async function configure(config: LinkMeConfig): Promise<void> {
    await (LinkMe?.configure?.(config) ?? Promise.resolve());
}

export function getInitialLink(): Promise<LinkMePayload | null> {
    return LinkMe?.getInitialLink?.() ?? Promise.resolve(null);
}

export function handleUrl(url: string): Promise<boolean> {
    if (!LinkMe?.handleUrl) {
        return Promise.resolve(false);
    }
    try {
        return Promise.resolve(LinkMe.handleUrl(url)).catch((err: any) => {
            console.error('[LinkMe SDK] Error in handleUrl:', err);
            return false;
        });
    } catch (err) {
        console.error('[LinkMe SDK] Error calling handleUrl:', err);
        return Promise.resolve(false);
    }
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

    constructor(deps?: { module?: any; emitter?: NativeEventEmitter }) {
        this.module = deps?.module ?? (NativeModules as any)?.LinkMe ?? null;
        this.emitter = deps?.emitter ?? (this.module ? new NativeEventEmitter(this.module) : { addListener: (_e: string, _l: (p: LinkMePayload) => void) => ({ remove: () => { } }) });
    }

    async configure(config: LinkMeConfig): Promise<void> {
        await (this.module?.configure?.(config) ?? Promise.resolve());
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
