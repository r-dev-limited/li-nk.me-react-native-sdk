var _a;
import { NativeModules, NativeEventEmitter, Linking } from 'react-native';
const LinkMe = (_a = NativeModules === null || NativeModules === void 0 ? void 0 : NativeModules.LinkMe) !== null && _a !== void 0 ? _a : null;
const urlSubscribers = new Set();
let lastEmittedUrl = null;
function emitUrl(rawUrl) {
    if (!rawUrl)
        return;
    if (rawUrl === lastEmittedUrl)
        return;
    lastEmittedUrl = rawUrl;
    const listeners = Array.from(urlSubscribers);
    for (const listener of listeners) {
        try {
            listener(rawUrl);
        }
        catch (_) { }
    }
}
function addUrlSubscriber(listener) {
    urlSubscribers.add(listener);
    return () => {
        urlSubscribers.delete(listener);
    };
}
if (LinkMe) {
    addUrlSubscriber((url) => {
        var _a;
        try {
            (_a = LinkMe === null || LinkMe === void 0 ? void 0 : LinkMe.handleUrl) === null || _a === void 0 ? void 0 : _a.call(LinkMe, url);
        }
        catch (_) { }
    });
}
const originalGetInitialURL = typeof Linking.getInitialURL === 'function'
    ? Linking.getInitialURL.bind(Linking)
    : null;
let initialUrlCaptured = false;
let initialUrlValue = null;
let initialUrlPromise = null;
if (originalGetInitialURL) {
    Linking.getInitialURL = () => {
        if (initialUrlCaptured) {
            return Promise.resolve(initialUrlValue);
        }
        if (!initialUrlPromise) {
            initialUrlPromise = Promise.resolve(originalGetInitialURL()).then((value) => {
                const url = value !== null && value !== void 0 ? value : null;
                initialUrlCaptured = true;
                initialUrlValue = url;
                emitUrl(url);
                return url;
            });
        }
        return initialUrlPromise;
    };
}
// Create a safe event emitter that does not throw when the native module is unavailable
const eventEmitter = LinkMe ? new NativeEventEmitter(LinkMe) : {
    addListener: (_event, _listener) => ({ remove: () => { } }),
};
let linkingSub = null;
function ensureForwarding() {
    if (linkingSub)
        return;
    linkingSub = Linking.addEventListener('url', ({ url }) => {
        emitUrl(url);
    });
    Linking.getInitialURL().then((url) => {
        emitUrl(url);
    });
}
ensureForwarding();
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
// Instance-based client for DI and testing parity with Node SDK
export class LinkMeClient {
    constructor(deps) {
        var _a, _b, _c;
        this.linkingSub = null;
        this.module = (_b = (_a = deps === null || deps === void 0 ? void 0 : deps.module) !== null && _a !== void 0 ? _a : NativeModules === null || NativeModules === void 0 ? void 0 : NativeModules.LinkMe) !== null && _b !== void 0 ? _b : null;
        this.emitter = (_c = deps === null || deps === void 0 ? void 0 : deps.emitter) !== null && _c !== void 0 ? _c : (this.module ? new NativeEventEmitter(this.module) : { addListener: (_e, _l) => ({ remove: () => { } }) });
        this.forwardUrl = (url) => {
            var _a, _b;
            if (!url)
                return;
            if (this.module === LinkMe) {
                return;
            }
            try {
                (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.handleUrl) === null || _b === void 0 ? void 0 : _b.call(_a, url);
            }
            catch (_) { }
        };
    }
    ensureForwarding() {
        if (this.linkingSub)
            return;
        this.linkingSub = Linking.addEventListener('url', ({ url }) => {
            emitUrl(url);
            this.forwardUrl(url);
        });
        Linking.getInitialURL().then((url) => {
            emitUrl(url);
            this.forwardUrl(url);
        });
    }
    configure(config) {
        var _a, _b, _c;
        this.ensureForwarding();
        return (_c = (_b = (_a = this.module) === null || _a === void 0 ? void 0 : _a.configure) === null || _b === void 0 ? void 0 : _b.call(_a, config)) !== null && _c !== void 0 ? _c : Promise.resolve();
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
