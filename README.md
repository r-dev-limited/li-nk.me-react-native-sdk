# LinkMe React Native SDK

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
- React Native 0.72+ for bare apps, or Expo SDK 57 (the bundled example uses RN 0.86)
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

## License

Apache-2.0
