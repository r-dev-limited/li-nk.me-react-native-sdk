# LinkMe React Native SDK

For apps sharing a domain, the next SDK release supports Expo plugin surface scopes:

```json
{
  "plugins": [["@li-nk.me/react-native-sdk", {
    "hosts": ["links.example.com"],
    "pathPrefixes": { "links.example.com": ["/customer/i/"] }
  }]]
}
```

Use the canonical surface path for each app. The plugin preserves existing filters and rejects conflicting broad filters that would still capture the whole host; update those filters explicitly before prebuilding. Static path scopes apply on older Android versions too. Edge's dynamic rules refine the same scope on Android 15+. Signed-device verification is still required. This option is unreleased and is not in published 0.2.15.

Deep linking, deferred deep linking, and attribution for React Native and Expo apps.

[![npm](https://img.shields.io/npm/v/@li-nk.me/react-native-sdk)](https://www.npmjs.com/package/@li-nk.me/react-native-sdk)
[![License](https://img.shields.io/badge/license-Apache--2.0-green)](LICENSE)

- [Main Site](https://li-nk.me)
- [Setup Guide](https://help.li-nk.me/hc/link-me/en/developer-setup/react-native-setup-guide)
- [SDK Reference](https://help.li-nk.me/hc/link-me/en/sdks/react-native-sdk-reference)
- [Help Center](https://help.li-nk.me/hc/link-me/en)

## Quick start

### 1. Prerequisites

- A LinkMe app with iOS bundle ID and Android package name configured
- API keys (`appId` and `appKey`) from **App Settings > API Keys**
- React Native 0.72+ for bare apps, or Expo SDK 58 (the bundled example uses RN 0.88)
- Node.js 22+ for the SDK development and release tooling

The Expo config plugin is an optional peer dependency. Expo applications
already receive a compatible `@expo/config-plugins`; install that package
explicitly only when using the plugin with a custom Expo toolchain.

### 2. Install

```bash
npm install @li-nk.me/react-native-sdk

# Recommended for iOS pasteboard-based deferred linking
npx expo install expo-clipboard
```

### 3. Configure deep linking (Expo)

Add the config plugin to `app.json`:

```json
{
  "expo": {
    "scheme": "yourapp",
    "plugins": [
      [
        "@li-nk.me/react-native-sdk/plugin/app.plugin.js",
        {
          "hosts": ["links.yourco.com"],
          "associatedDomains": ["links.yourco.com"],
          "schemes": ["yourapp"]
        }
      ]
    ]
  }
}
```

The Expo config plugin automatically sets up Associated Domains (iOS) and App Links intent filters (Android). For bare React Native projects, configure these manually following the [iOS](https://help.li-nk.me/hc/link-me/en/developer-setup/ios-setup-guide) and [Android](https://help.li-nk.me/hc/link-me/en/developer-setup/android-setup-guide) setup guides.

### 4. Initialize and handle links

```tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  configure,
  getInitialLink,
  claimDeferredIfAvailable,
  onLink,
  track,
} from '@li-nk.me/react-native-sdk';

export function useLinkMe() {
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: { remove: () => void } | null = null;

    (async () => {
      await configure({
        appId: process.env.EXPO_PUBLIC_LINKME_APP_ID!,
        appKey: process.env.EXPO_PUBLIC_LINKME_APP_KEY,
        debug: __DEV__,
      });

      // Live links while app is open
      unsubscribe = onLink((payload) => {
        if (payload?.path) router.replace(payload.path as never);
      });

      // Cold-start link
      const initial = await getInitialLink();
      if (initial?.path) {
        router.replace(initial.path as never);
      } else {
        // Deferred deep link (first install)
        const deferred = await claimDeferredIfAvailable();
        if (deferred?.path) router.replace(deferred.path as never);
      }

      await track('open');
    })();

    return () => unsubscribe?.remove();
  }, [router]);
}
```

Call `useLinkMe()` from `app/_layout.tsx` (Expo Router) or inside your root navigator.

## Deferred deep linking

| Platform | Primary | Fallback |
| --- | --- | --- |
| iOS | Pasteboard (`cid` token via `expo-clipboard`) | Fingerprint (`/api/deferred/claim`) |
| Android | Play Install Referrer (`/api/install-referrer`) | Fingerprint (`/api/deferred/claim`) |

- Enable **Pasteboard for Deferred Links** in App Settings for deterministic iOS attribution
- iOS pasteboard claims only match `linkme:cid=...` tokens or URLs on your configured host
- Consumed clipboard tokens are cleared after successful claim

When a resolved payload has `forceRedirectWeb: true` and a non-empty `webFallbackUrl`, the SDK opens the browser and suppresses `onLink` delivery. `getInitialLink()` and deferred claims return `null` after that handoff.

## API reference

| Function | Description |
| --- | --- |
| `configure(config)` | Initialize the SDK |
| `getInitialLink()` | Get the payload that opened the app |
| `handleUrl(url)` | Manually process a URL (returns `boolean`) |
| `claimDeferredIfAvailable()` | Claim deferred deep link on first install |
| `onLink(callback)` | Subscribe to future payloads (returns `{ remove }`) |
| `dispose()` | Remove React Native listeners and reset controller state |
| `track(event, properties?)` | Send analytics events |
| `setUserId(userId)` | Associate a user ID; pass `null` to clear it |
| `setAdvertisingConsent(granted)` | Toggle advertising identifier usage |
| `setReady()` | Signal readiness to process queued URLs |

### Config options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `appId` | `string` | — | Required |
| `appKey` | `string` | — | Optional read-only key |
| `sendDeviceInfo` | `boolean` | `true` | Include device metadata |
| `includeVendorId` | `boolean` | — | iOS vendor identifier |
| `includeAdvertisingId` | `boolean` | — | Ad ID (requires consent) |
| `debug` | `boolean` | `false` | Log to console |

### Class API

```ts
import LinkMeClient from '@li-nk.me/react-native-sdk';

const client = new LinkMeClient();
await client.configure({ appId: 'app_123' });
```

`LinkMeClient` exposes the same methods as the top-level functions.

## Example app

The `example-expo/` directory contains a runnable Expo sample:

```bash
cd example-expo
cp .env.example .env  # fill in your keys
npx expo start
```

For SDK development, run `nvm install && nvm use` from the SDK root to select the patched Node 24.22.1 LTS runtime. CI also tests patched Node 22.23.4 and audits the independent SDK lockfile.

As of October 24, 2026, the SDK audit is clean, while `npm audit --prefix example-expo` reports eight affected packages in the demo's development tools. `node-forge` 1.4.0 has [an unpatched signature verification advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv), inherited through Expo's code-signing CLI. Detox and bunyamin depend on older `stream-json` releases affected by [prototype pollution](https://github.com/advisories/GHSA-mjw6-4jj6-33hc) and parser denial of service advisories. The patched `stream-json` 3.x release removes CommonJS subpaths these tools require, so a forced override breaks them. These dependencies are not shipped in the SDK; review upstream fixes before using the example tooling with untrusted certificates or JSON traces.

## License

Apache-2.0

## Claim metadata (unreleased)

Updated Edge claims can include `claimId`, `claimMethod`, `matchConfidence`,
`attributionStatus`, `contractVersion`, and `claimPolicyVersion`. These optional
fields are preserved in the payload. Treat `fingerprint_exact` / `inferred` as
heuristic attribution, not a verified install or authenticated identity.
Replaying a CID returns its saved outcome; `duplicate` is a deprecated legacy
projection and must not suppress a new link navigation based on shared IP/UA.

Supply your app ID for deferred matching. New apps have fingerprint fallback
disabled; enable inferred attribution explicitly in app settings if appropriate.
Enabled matching requires a unique exact IP/UA candidate within 30 minutes.
Explicit CID and Play referrer claims use the deterministic 72-hour token window,
subject to link expiry and current app/link/domain policy.


Fingerprint matches return campaign/claim metadata with `navigationAllowed: false`.
They withhold the CID, link ID, path, custom data, query parameters and destination
URLs. The SDK suppresses app-routing callbacks and automatic browser launches for
these responses. Web callers can inspect returned metadata explicitly; native
routing APIs may return no link. A claim receipt is not a redeemable link token.
An independently supplied valid CID/referrer can still authorize navigation with
`navigationAllowed: true`; it retains the original claim receipt and attribution
classification rather than generating another claim.

## Tracking credentials and acceptance (unreleased Edge)

Configure an app ID and a key with `can_ingest` for client telemetry. In Portal,
select **Client analytics and link reading**; it cannot manage links, settings,
or keys, and cannot read private management/visitor diagnostics. A read-only key cannot ingest events. Both event routes require validated
credentials even when link resolution permits optional keys.

The existing `track` API uses the legacy `/api/app-events` route. Its return does
not prove delivery, durable webhook acknowledgement, or a verified conversion.
The SDK currently has no durable telemetry queue and does not promise event-ID
retry semantics. New Edge stores legacy events with app scope; an omitted event
ID receives a server ID, so calling `track` again creates another event. Optional
`userId` is a caller-provided pseudonym, not authenticated identity.

For explicit persistence receipts and safe HTTP retries, `/api/app-events/v1`
accepts a versioned envelope with a stable `eventId`, `occurredAt`, SDK/version,
platform, consent and structured properties. Reuse the same event ID and content
on retry; a successful receipt is 202, changed content is 409. The route requires
`can_ingest`, bounds the body to 32 KiB, and rate-limits by app. Claim events are
server-owned. This SDK has not yet adopted the versioned sender/queue contract.

## Request deadlines and cancellation (unreleased)

`requestTimeoutMs` defaults to 15000 and covers the complete HTTP fetch and
response-body operation. Set a positive integer up to 2147483647 milliseconds;
invalid overrides fail during configuration. `cancelPendingRequests()` aborts
current transport signals and settles callers even if an injected fetch ignores
abort. Later requests remain usable. No implicit retry is added. Cancellation or
a timeout cannot retract work already accepted by the server.

Reconfiguring or disposing cancels pending network work. Changing `setUserId`
also invalidates pending results; an old response cannot emit a route, launch a
browser or replace current payload state. Reconfigure clears payload, identity
and attribution context. Listeners survive reconfiguration, receive future
results without automatic replay, and are removed by `dispose()`. A lifecycle
change inside one listener stops delivery of that result to later listeners.

Web link methods return `null` on transport failure; React Native `handleUrl`
returns `false` and deferred methods return no link. Tracking keeps its existing
best-effort `void` result. These changes cover HTTP operations. Native URL,
clipboard and Install Referrer discovery waits and the complete cross-platform
lifecycle matrix still require separate qualification.
