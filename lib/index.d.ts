import { NativeEventEmitter } from 'react-native';
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
export declare function configure(config: LinkMeConfig): Promise<void>;
export declare function getInitialLink(): Promise<LinkMePayload | null>;
export declare function handleUrl(url: string): Promise<boolean>;
export declare function claimDeferredIfAvailable(): Promise<LinkMePayload | null>;
export declare function setUserId(userId: string): Promise<void>;
export declare function setAdvertisingConsent(granted: boolean): Promise<void>;
export declare function setReady(): Promise<void>;
export declare function track(event: string, properties?: Record<string, any>): Promise<void>;
export declare function onLink(listener: (payload: LinkMePayload) => void): {
    remove: () => void;
};
export declare class LinkMeClient {
    private readonly module;
    private readonly emitter;
    constructor(deps?: {
        module?: any;
        emitter?: NativeEventEmitter;
    });
    configure(config: LinkMeConfig): Promise<void>;
    getInitialLink(): Promise<LinkMePayload | null>;
    claimDeferredIfAvailable(): Promise<LinkMePayload | null>;
    setUserId(userId: string): Promise<void>;
    setAdvertisingConsent(granted: boolean): Promise<void>;
    setReady(): Promise<void>;
    track(event: string, properties?: Record<string, any>): Promise<void>;
    onLink(listener: (payload: LinkMePayload) => void): {
        remove: () => void;
    };
}
export default LinkMeClient;
