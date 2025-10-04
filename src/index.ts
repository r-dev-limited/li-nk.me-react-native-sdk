import { NativeModules, NativeEventEmitter, Linking, EmitterSubscription } from 'react-native';

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

let linkingSub: EmitterSubscription | null = null;

function ensureForwarding() {
    if (linkingSub) return;
    linkingSub = Linking.addEventListener('url', ({ url }: { url: string }) => {
        try {
            LinkMe?.handleUrl?.(url);
        } catch (_) { }
    });
    Linking.getInitialURL().then((url: string | null) => {
        if (url) {
            try {
                LinkMe?.handleUrl?.(url);
            } catch (_) { }
        }
    });
}

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
