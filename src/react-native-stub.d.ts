declare module 'react-native' {
    export const Linking: {
        addEventListener(event: 'url', listener: (ev: { url: string } | string) => any): any;
        removeEventListener?: (event: 'url', listener: (ev: { url: string } | string) => void) => void;
        getInitialURL(): Promise<string | null>;
        openURL?(url: string): Promise<unknown>;
    };
    export const NativeModules: Record<string, any>;
    export const Platform: {
        OS: string;
        Version?: string | number;
    };
}
