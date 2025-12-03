import { Linking } from 'react-native';
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
    /**
     * @deprecated Pasteboard is now controlled from the Portal (App Settings → iOS).
     * The SDK automatically checks pasteboard on iOS if expo-clipboard is installed.
     * This parameter is ignored.
     */
    enablePasteboard?: boolean;
    sendDeviceInfo?: boolean;
    includeVendorId?: boolean;
    includeAdvertisingId?: boolean;
};
type Listener = (payload: LinkMePayload) => void;
type LinkingLike = typeof Linking;
type FetchLike = typeof fetch;
type ControllerDeps = {
    fetchImpl?: FetchLike;
    linking?: LinkingLike;
};
export declare function configure(config: LinkMeConfig): Promise<void>;
export declare function getInitialLink(): Promise<LinkMePayload | null>;
export declare function handleUrl(url: string): Promise<boolean>;
export declare function claimDeferredIfAvailable(): Promise<LinkMePayload | null>;
export declare function setUserId(userId: string): Promise<void>;
export declare function setAdvertisingConsent(granted: boolean): Promise<void>;
export declare function setReady(): Promise<void>;
export declare function track(event: string, properties?: Record<string, any>): Promise<void>;
export declare function onLink(listener: Listener): {
    remove: () => void;
};
export declare class LinkMeClient {
    private readonly controller;
    constructor(deps?: ControllerDeps);
    configure(config: LinkMeConfig): Promise<void>;
    getInitialLink(): Promise<LinkMePayload | null>;
    handleUrl(url: string): Promise<boolean>;
    claimDeferredIfAvailable(): Promise<LinkMePayload | null>;
    setUserId(userId: string): Promise<void>;
    setAdvertisingConsent(granted: boolean): Promise<void>;
    setReady(): Promise<void>;
    track(event: string, properties?: Record<string, any>): Promise<void>;
    onLink(listener: Listener): {
        remove: () => void;
    };
}
export default LinkMeClient;
