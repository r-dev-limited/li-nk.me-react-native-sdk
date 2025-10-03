declare module 'react-native' {
    export const NativeModules: any;
    export class NativeEventEmitter {
        constructor(module: any);
        addListener(event: string, listener: (...args: any[]) => void): { remove: () => void };
    }
    export const Linking: {
        addEventListener(event: 'url', listener: (ev: { url: string }) => void): any;
        getInitialURL(): Promise<string | null>;
    };
    export type EmitterSubscription = { remove: () => void };
}
