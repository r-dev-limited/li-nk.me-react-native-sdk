import { NativeModules, NativeEventEmitter, Linking, EmitterSubscription } from 'react-native';

const { LinkMe } = NativeModules as { LinkMe: any };

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

const eventEmitter = new NativeEventEmitter(LinkMe);

let linkingSub: EmitterSubscription | null = null;

function ensureForwarding() {
    if (linkingSub) return;
    linkingSub = Linking.addEventListener('url', ({ url }) => {
        try {
            LinkMe.handleUrl?.(url);
        } catch (_) { }
    });
    Linking.getInitialURL().then((url) => {
        if (url) {
            try {
                LinkMe.handleUrl?.(url);
            } catch (_) { }
        }
    });
}

export function configure(config: LinkMeConfig): Promise<void> {
    ensureForwarding();
    return LinkMe.configure(config);
}

export function getInitialLink(): Promise<LinkMePayload | null> {
    return LinkMe.getInitialLink();
}

export function claimDeferredIfAvailable(): Promise<LinkMePayload | null> {
    return LinkMe.claimDeferredIfAvailable();
}

export function setUserId(userId: string): Promise<void> {
    return LinkMe.setUserId(userId);
}

export function setAdvertisingConsent(granted: boolean): Promise<void> {
    return LinkMe.setAdvertisingConsent(granted);
}

export function setReady(): Promise<void> {
    return LinkMe.setReady?.() ?? Promise.resolve();
}

export function track(event: string, properties?: Record<string, any>): Promise<void> {
    return LinkMe.track(event, properties ?? null);
}

export function onLink(listener: (payload: LinkMePayload) => void): { remove: () => void } {
    const sub = eventEmitter.addListener('link', listener);
    return { remove: () => sub.remove() };
}
