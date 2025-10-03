var _a;
import { NativeModules, NativeEventEmitter, Linking } from 'react-native';
const LinkMe = (_a = NativeModules === null || NativeModules === void 0 ? void 0 : NativeModules.LinkMe) !== null && _a !== void 0 ? _a : null;
// Create a safe event emitter that does not throw when the native module is unavailable
const eventEmitter = LinkMe ? new NativeEventEmitter(LinkMe) : {
    addListener: (_event, _listener) => ({ remove: () => { } }),
};
let linkingSub = null;
function ensureForwarding() {
    if (linkingSub)
        return;
    linkingSub = Linking.addEventListener('url', ({ url }) => {
        var _a;
        try {
            (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.handleUrl) === null || _a === void 0 ? void 0 : _a.call(LinkMe, url);
        }
        catch (_) { }
    });
    Linking.getInitialURL().then((url) => {
        var _a;
        if (url) {
            try {
                (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.handleUrl) === null || _a === void 0 ? void 0 : _a.call(LinkMe, url);
            }
            catch (_) { }
        }
    });
}
export function configure(config) {
    var _a, _b;
    ensureForwarding();
    return (_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.configure) === null || _a === void 0 ? void 0 : _a.call(LinkMe, config)) !== null && _b !== void 0 ? _b : Promise.resolve();
}
export function getInitialLink() {
    var _a, _b;
    return (_b = (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.getInitialLink) === null || _a === void 0 ? void 0 : _a.call(LinkMe)) !== null && _b !== void 0 ? _b : Promise.resolve(null);
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
