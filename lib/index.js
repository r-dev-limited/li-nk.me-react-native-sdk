var _a;
import { NativeModules, NativeEventEmitter } from 'react-native';
const LinkMe = (_a = NativeModules === null || NativeModules === void 0 ? void 0 : NativeModules.LinkMe) !== null && _a !== void 0 ? _a : null;
// Create a safe event emitter that does not throw when the native module is unavailable
const eventEmitter = LinkMe ? new NativeEventEmitter(LinkMe) : {
    addListener: (_event, _listener) => ({ remove: () => { } }),
};
export async function configure(config) {
    var _a, _b;
    await ((_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.configure) === null || _a === void 0 ? void 0 : _a.call(LinkMe, config)) !== null && _b !== void 0 ? _b : Promise.resolve());
}
export function getInitialLink() {
    var _a, _b;
    return (_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.getInitialLink) === null || _a === void 0 ? void 0 : _a.call(LinkMe)) !== null && _b !== void 0 ? _b : Promise.resolve(null);
}
export function handleUrl(url) {
    if (!(LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.handleUrl)) {
        return Promise.resolve(false);
    }
    try {
        return Promise.resolve(LinkMe.handleUrl(url)).catch((err) => {
            console.error('[LinkMe SDK] Error in handleUrl:', err);
            return false;
        });
    }
    catch (err) {
        console.error('[LinkMe SDK] Error calling handleUrl:', err);
        return Promise.resolve(false);
    }
}
export function claimDeferredIfAvailable() {
    var _a, _b;
    return (_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.claimDeferredIfAvailable) === null || _a === void 0 ? void 0 : _a.call(LinkMe)) !== null && _b !== void 0 ? _b : Promise.resolve(null);
}
export function setUserId(userId) {
    var _a, _b;
    return (_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.setUserId) === null || _a === void 0 ? void 0 : _a.call(LinkMe, userId)) !== null && _b !== void 0 ? _b : Promise.resolve();
}
export function setAdvertisingConsent(granted) {
    var _a, _b;
    return (_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.setAdvertisingConsent) === null || _a === void 0 ? void 0 : _a.call(LinkMe, granted)) !== null && _b !== void 0 ? _b : Promise.resolve();
}
export function setReady() {
    var _a, _b;
    return (_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.setReady) === null || _a === void 0 ? void 0 : _a.call(LinkMe)) !== null && _b !== void 0 ? _b : Promise.resolve();
}
export function track(event, properties) {
    var _a, _b;
    return (_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.track) === null || _a === void 0 ? void 0 : _a.call(LinkMe, event, properties !== null && properties !== void 0 ? properties : null)) !== null && _b !== void 0 ? _b : Promise.resolve();
}
export function onLink(listener) {
    const sub = eventEmitter.addListener('link', listener);
    return { remove: () => sub.remove() };
}
// Instance-based client for DI and testing parity with Node SDK
export class LinkMeClient {
    constructor(deps) {
        var _a, _b, _c;
        this.module = (_b = (_a = deps === null || deps === void 0 ? void 0 : deps.module) !== null && _a !== void 0 ? _a : NativeModules === null || NativeModules === void 0 ? void 0 : NativeModules.LinkMe) !== null && _b !== void 0 ? _b : null;
        this.emitter = (_c = deps === null || deps === void 0 ? void 0 : deps.emitter) !== null && _c !== void 0 ? _c : (this.module ? new NativeEventEmitter(this.module) : { addListener: (_e, _l) => ({ remove: () => { } }) });
    }
    async configure(config) {
        var _a, _b, _c;
        await ((_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.configure) === null || _b === void 0 ? void 0 : _b.call(_a, config)) !== null && _c !== void 0 ? _c : Promise.resolve());
    }
    getInitialLink() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.getInitialLink) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : Promise.resolve(null);
    }
    claimDeferredIfAvailable() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.claimDeferredIfAvailable) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : Promise.resolve(null);
    }
    setUserId(userId) {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.setUserId) === null || _b === void 0 ? void 0 : _b.call(_a, userId)) !== null && _c !== void 0 ? _c : Promise.resolve();
    }
    setAdvertisingConsent(granted) {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.setAdvertisingConsent) === null || _b === void 0 ? void 0 : _b.call(_a, granted)) !== null && _c !== void 0 ? _c : Promise.resolve();
    }
    setReady() {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.setReady) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : Promise.resolve();
    }
    track(event, properties) {
        var _a, _b, _c;
        return (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.track) === null || _b === void 0 ? void 0 : _b.call(_a, event, properties !== null && properties !== void 0 ? properties : null)) !== null && _c !== void 0 ? _c : Promise.resolve();
    }
    onLink(listener) {
        const sub = this.emitter.addListener('link', listener);
        return { remove: () => sub.remove() };
    }
}
export default LinkMeClient;
