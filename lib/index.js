import { Linking, Platform } from 'react-native';
// Optional expo-clipboard for pasteboard support on iOS
let Clipboard = null;
try {
    // Dynamic import to make expo-clipboard optional
    Clipboard = require('expo-clipboard');
}
catch {
    // expo-clipboard not installed - pasteboard will be skipped
}
class LinkMeController {
    constructor(deps) {
        var _a, _b;
        this.ready = false;
        this.advertisingConsent = false;
        this.debug = false;
        this.lastPayload = null;
        this.listeners = new Set();
        this.pendingUrls = [];
        this.linkingSubscription = null;
        this.initialUrlChecked = false;
        const impl = (_a = deps === null || deps === void 0 ? void 0 : deps.fetchImpl) !== null && _a !== void 0 ? _a : globalThis === null || globalThis === void 0 ? void 0 : globalThis.fetch;
        if (typeof impl !== 'function') {
            throw new Error('fetch is not available; provide deps.fetchImpl');
        }
        this.fetchImpl = impl.bind(globalThis);
        this.linking = (_b = deps === null || deps === void 0 ? void 0 : deps.linking) !== null && _b !== void 0 ? _b : Linking;
    }
    async configure(config) {
        var _a;
        const normalized = normalizeConfig(config);
        this.config = normalized;
        this.advertisingConsent = !!config.includeAdvertisingId;
        const fallbackDev = Boolean(globalThis === null || globalThis === void 0 ? void 0 : globalThis.__DEV__);
        this.debug = (_a = normalized.debug) !== null && _a !== void 0 ? _a : fallbackDev;
        this.logDebug('configure', { baseUrl: normalized.baseUrl, debug: this.debug });
        this.subscribeToLinking();
        this.ready = true;
        await this.drainPending();
    }
    async getInitialLink() {
        var _a, _b;
        if (this.lastPayload) {
            return this.lastPayload;
        }
        if (this.initialUrlChecked) {
            return null;
        }
        this.initialUrlChecked = true;
        try {
            const url = await ((_b = (_a = this.linking) === null || _a === void 0 ? void 0 : _a.getInitialURL) === null || _b === void 0 ? void 0 : _b.call(_a));
            if (url) {
                return await this.processUrl(url);
            }
        }
        catch {
            /* noop */
        }
        return this.lastPayload;
    }
    async handleUrl(url) {
        if (!url) {
            return false;
        }
        if (!this.ready || !this.config) {
            this.pendingUrls.push(url);
            return false;
        }
        const payload = await this.processUrl(url);
        return payload != null;
    }
    async claimDeferredIfAvailable() {
        const cfg = this.config;
        if (!cfg) {
            this.logDebug('deferred.skip_no_config');
            return null;
        }
        this.logDebug('deferred.claim.start', { platform: Platform.OS });
        // 1. On iOS, try to read CID from pasteboard first (if expo-clipboard is available)
        if (Platform.OS === 'ios' && (Clipboard === null || Clipboard === void 0 ? void 0 : Clipboard.getStringAsync)) {
            this.logDebug('deferred.pasteboard.check');
            const pasteboardPayload = await this.tryClaimFromPasteboard(cfg);
            if (pasteboardPayload) {
                this.logDebug('deferred.pasteboard.payload');
                return pasteboardPayload;
            }
            this.logDebug('deferred.pasteboard.no_match');
        }
        // 2. Fallback to probabilistic fingerprint matching
        try {
            const body = {
                platform: Platform.OS,
            };
            const device = cfg.sendDeviceInfo === false ? undefined : this.buildDevicePayload();
            if (device) {
                body.device = device;
            }
            this.logDebug('deferred.fingerprint.request');
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/deferred/claim`, {
                method: 'POST',
                headers: this.buildHeaders(true),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                this.logDebug('deferred.fingerprint.http_error', { status: res.status });
                return null;
            }
            const payload = await this.parsePayload(res);
            if (payload) {
                this.logDebug('deferred.fingerprint.payload', { linkId: payload.linkId, duplicate: payload === null || payload === void 0 ? void 0 : payload.duplicate });
                this.emit(payload);
            }
            else {
                this.logDebug('deferred.fingerprint.no_match');
            }
            return payload;
        }
        catch (err) {
            this.logDebug('deferred.fingerprint.error', { message: err instanceof Error ? err.message : String(err) });
            return null;
        }
    }
    async tryClaimFromPasteboard(cfg) {
        try {
            if (!(Clipboard === null || Clipboard === void 0 ? void 0 : Clipboard.getStringAsync)) {
                this.logDebug('pasteboard.skip_module');
                return null;
            }
            this.logDebug('pasteboard.read');
            const pasteStr = await Clipboard.getStringAsync();
            if (!pasteStr) {
                this.logDebug('pasteboard.empty');
                return null;
            }
            // Check if the clipboard contains a li-nk.me URL with a cid parameter
            const cid = this.extractCidFromUrl(pasteStr, cfg.baseUrl);
            if (!cid) {
                this.logDebug('pasteboard.no_cid', { hasClipboard: true });
                return null;
            }
            this.logDebug('pasteboard.cid_found');
            // Resolve the CID to get the payload
            const payload = await this.resolveCidWithConfig(cfg, cid);
            if (payload) {
                this.emit(payload);
                // Track pasteboard claim
                this.logDebug('pasteboard.payload', { linkId: payload.linkId });
                void this.track('claim', { claim_type: 'pasteboard' });
            }
            else {
                this.logDebug('pasteboard.resolve_empty');
            }
            return payload;
        }
        catch (err) {
            this.logDebug('pasteboard.error', { message: err instanceof Error ? err.message : String(err) });
            return null;
        }
    }
    extractCidFromUrl(str, baseUrl) {
        try {
            const url = new URL(str);
            // Check if the URL is from our domain
            const baseHost = new URL(baseUrl).host;
            if (!url.host.endsWith(baseHost) && url.host !== baseHost.replace(/^www\./, '')) {
                this.logDebug('pasteboard.url_mismatch', { host: url.host });
                return null;
            }
            // Extract the cid parameter
            const cid = url.searchParams.get('cid');
            if (cid) {
                this.logDebug('pasteboard.url_cid_present');
            }
            else {
                this.logDebug('pasteboard.url_no_cid');
            }
            return cid || null;
        }
        catch (err) {
            this.logDebug('pasteboard.url_parse_error', { message: err instanceof Error ? err.message : String(err) });
            return null;
        }
    }
    async resolveCidWithConfig(cfg, cid) {
        try {
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/deeplink?cid=${encodeURIComponent(cid)}`, {
                method: 'GET',
                headers: this.buildHeaders(false),
            });
            if (!res.ok) {
                return null;
            }
            return this.parsePayload(res);
        }
        catch {
            return null;
        }
    }
    setUserId(userId) {
        this.userId = userId;
    }
    setAdvertisingConsent(granted) {
        this.advertisingConsent = granted;
    }
    async setReady() {
        this.ready = true;
        await this.drainPending();
    }
    async track(event, properties) {
        const cfg = this.config;
        if (!cfg || !event) {
            return;
        }
        try {
            const body = {
                event,
                platform: Platform.OS,
                timestamp: Math.floor(Date.now() / 1000),
            };
            if (this.userId) {
                body.userId = this.userId;
            }
            if (properties) {
                body.props = properties;
            }
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/app-events`, {
                method: 'POST',
                headers: this.buildHeaders(true),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                await res.text().catch(() => undefined);
            }
        }
        catch {
            /* noop */
        }
    }
    onLink(listener) {
        this.listeners.add(listener);
        return {
            remove: () => {
                this.listeners.delete(listener);
            },
        };
    }
    subscribeToLinking() {
        if (this.linkingSubscription || !this.linking || typeof this.linking.addEventListener !== 'function') {
            return;
        }
        const handler = (event) => {
            const incoming = typeof event === 'string' ? event : event === null || event === void 0 ? void 0 : event.url;
            if (incoming) {
                this.handleIncomingUrl(incoming);
            }
        };
        const maybeSubscription = this.linking.addEventListener('url', handler);
        if (maybeSubscription && typeof maybeSubscription.remove === 'function') {
            this.linkingSubscription = maybeSubscription;
        }
        else if (typeof this.linking.removeEventListener === 'function') {
            this.linkingSubscription = { remove: () => this.linking.removeEventListener('url', handler) };
        }
        else {
            this.linkingSubscription = { remove: () => { } };
        }
    }
    handleIncomingUrl(url) {
        if (!url) {
            return;
        }
        if (!this.ready || !this.config) {
            this.pendingUrls.push(url);
            return;
        }
        void this.processUrl(url);
    }
    async drainPending() {
        if (!this.ready || !this.config) {
            return;
        }
        while (this.pendingUrls.length > 0) {
            const url = this.pendingUrls.shift();
            if (url) {
                await this.processUrl(url);
            }
        }
    }
    async processUrl(url) {
        var _a;
        const cfg = this.config;
        if (!cfg) {
            return null;
        }
        const parsed = this.parseUrl(url);
        if (!parsed) {
            return null;
        }
        const cid = (_a = parsed.searchParams) === null || _a === void 0 ? void 0 : _a.get('cid');
        let payload = null;
        if (cid) {
            payload = await this.resolveCid(cid);
        }
        else if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            payload = await this.resolveUniversalLink(url);
        }
        if (payload) {
            this.emit(payload);
        }
        return payload;
    }
    parseUrl(url) {
        try {
            return new URL(url);
        }
        catch {
            try {
                return new URL(url, 'https://placeholder.local');
            }
            catch {
                return null;
            }
        }
    }
    async resolveCid(cid) {
        const cfg = this.config;
        if (!cfg) {
            return null;
        }
        try {
            const headers = this.buildHeaders(false);
            const device = cfg.sendDeviceInfo === false ? undefined : this.buildDevicePayload();
            if (device) {
                headers['x-linkme-device'] = JSON.stringify(device);
            }
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/deeplink?cid=${encodeURIComponent(cid)}`, {
                method: 'GET',
                headers,
            });
            if (!res.ok) {
                return null;
            }
            return await this.parsePayload(res);
        }
        catch {
            return null;
        }
    }
    async resolveUniversalLink(url) {
        const cfg = this.config;
        if (!cfg) {
            return null;
        }
        try {
            const body = { url };
            const device = cfg.sendDeviceInfo === false ? undefined : this.buildDevicePayload();
            if (device) {
                body.device = device;
            }
            const res = await this.fetchImpl(`${cfg.apiBaseUrl}/deeplink/resolve-url`, {
                method: 'POST',
                headers: this.buildHeaders(true),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                return null;
            }
            return await this.parsePayload(res);
        }
        catch {
            return null;
        }
    }
    buildHeaders(includeContentType) {
        var _a, _b;
        const headers = { Accept: 'application/json' };
        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }
        if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.appId) {
            headers['x-app-id'] = this.config.appId;
        }
        if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.appKey) {
            headers['x-api-key'] = this.config.appKey;
        }
        return headers;
    }
    buildDevicePayload() {
        const cfg = this.config;
        if (!cfg) {
            return undefined;
        }
        const device = {
            platform: Platform.OS,
        };
        const version = Platform.Version;
        if (version !== undefined) {
            device.osVersion = typeof version === 'string' ? version : String(version);
        }
        const locale = getLocale();
        if (locale) {
            device.locale = locale;
        }
        const timezone = getTimezone();
        if (timezone) {
            device.timezone = timezone;
        }
        const consent = {};
        if (cfg.includeVendorId) {
            consent.vendor = true;
        }
        if (this.advertisingConsent) {
            consent.advertising = true;
        }
        device.consent = consent;
        return device;
    }
    async parsePayload(res) {
        try {
            const json = (await res.json());
            return json !== null && json !== void 0 ? json : null;
        }
        catch (err) {
            this.logDebug('payload.parse_error', { message: err instanceof Error ? err.message : String(err) });
            return null;
        }
    }
    emit(payload) {
        this.lastPayload = payload;
        for (const listener of this.listeners) {
            try {
                listener(payload);
            }
            catch {
                /* noop */
            }
        }
    }
    logDebug(event, details) {
        if (!this.debug) {
            return;
        }
        try {
            if (details) {
                console.log(`[LinkMe SDK] ${event}`, details);
            }
            else {
                console.log(`[LinkMe SDK] ${event}`);
            }
        }
        catch {
            /* noop */
        }
    }
}
function normalizeConfig(config) {
    const baseUrl = (config === null || config === void 0 ? void 0 : config.baseUrl) || 'https://li-nk.me';
    const trimmed = baseUrl.replace(/\/$/, '');
    return {
        ...config,
        baseUrl: trimmed,
        apiBaseUrl: `${trimmed}/api`,
    };
}
function getLocale() {
    var _a;
    try {
        const intl = Intl === null || Intl === void 0 ? void 0 : Intl.DateTimeFormat;
        if (typeof intl === 'function') {
            const resolved = new intl().resolvedOptions();
            const locale = (_a = resolved === null || resolved === void 0 ? void 0 : resolved.locale) !== null && _a !== void 0 ? _a : resolved === null || resolved === void 0 ? void 0 : resolved.localeMatcher;
            return typeof locale === 'string' ? locale : undefined;
        }
    }
    catch {
        /* noop */
    }
    return undefined;
}
function getTimezone() {
    var _a;
    try {
        const intl = Intl === null || Intl === void 0 ? void 0 : Intl.DateTimeFormat;
        if (typeof intl === 'function') {
            const resolved = new intl().resolvedOptions();
            const tz = (_a = resolved === null || resolved === void 0 ? void 0 : resolved.timeZone) !== null && _a !== void 0 ? _a : resolved === null || resolved === void 0 ? void 0 : resolved.timeZoneName;
            return typeof tz === 'string' ? tz : undefined;
        }
    }
    catch {
        /* noop */
    }
    return undefined;
}
const defaultController = new LinkMeController();
export async function configure(config) {
    await defaultController.configure(config);
}
export function getInitialLink() {
    return defaultController.getInitialLink();
}
export function handleUrl(url) {
    return defaultController.handleUrl(url);
}
export function claimDeferredIfAvailable() {
    return defaultController.claimDeferredIfAvailable();
}
export function setUserId(userId) {
    defaultController.setUserId(userId);
    return Promise.resolve();
}
export function setAdvertisingConsent(granted) {
    defaultController.setAdvertisingConsent(granted);
    return Promise.resolve();
}
export function setReady() {
    return defaultController.setReady();
}
export function track(event, properties) {
    return defaultController.track(event, properties);
}
export function onLink(listener) {
    return defaultController.onLink(listener);
}
export class LinkMeClient {
    constructor(deps) {
        this.controller = new LinkMeController(deps);
    }
    configure(config) {
        return this.controller.configure(config);
    }
    getInitialLink() {
        return this.controller.getInitialLink();
    }
    handleUrl(url) {
        return this.controller.handleUrl(url);
    }
    claimDeferredIfAvailable() {
        return this.controller.claimDeferredIfAvailable();
    }
    setUserId(userId) {
        this.controller.setUserId(userId);
        return Promise.resolve();
    }
    setAdvertisingConsent(granted) {
        this.controller.setAdvertisingConsent(granted);
        return Promise.resolve();
    }
    setReady() {
        return this.controller.setReady();
    }
    track(event, properties) {
        return this.controller.track(event, properties);
    }
    onLink(listener) {
        return this.controller.onLink(listener);
    }
}
export default LinkMeClient;
