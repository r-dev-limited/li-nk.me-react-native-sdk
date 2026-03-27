# LinkMe React Native SDK

React Native SDK for LinkMe — deep linking and attribution.

- **Main Site**: [li-nk.me](https://li-nk.me)
- **Documentation**: [React Native Setup](https://li-nk.me/docs/developer/setup/react-native)
- **Package**: [npm](https://www.npmjs.com/package/@li-nk.me/react-native-sdk)

## Installation

```bash
npm install @li-nk.me/react-native-sdk
```

## Basic Usage

```ts
import { configure, getInitialLink, onLink } from '@li-nk.me/react-native-sdk';

await configure({
  appId: 'your_app_id',
  appKey: 'your_app_key',
  debug: __DEV__,
});

const initial = await getInitialLink();
if (initial?.path) router.replace(initial.path);

const sub = onLink((payload) => {
  if (payload?.path) router.replace(payload.path);
});
// Later: sub.remove();
```

## API

| Function | Description |
| --- | --- |
| `configure(config)` | Initialize the SDK. |
| `getInitialLink()` | Get the payload that opened the app. |
| `handleUrl(url)` | Manually process a URL. Returns `boolean`. |
| `claimDeferredIfAvailable()` | Install Referrer (Android) / pasteboard (iOS) / fingerprint fallback. |
| `onLink(callback)` | Subscribe to future payloads. Returns `{ remove }`. |
| `track(event, properties?)` | Send analytics events. |
| `setUserId(userId)` | Associate a user ID. |
| `setAdvertisingConsent(granted)` | Toggle advertising identifier usage. |
| `setReady()` | Signal readiness to process queued URLs. |

### Config options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | `https://li-nk.me` | Your edge domain. |
| `appId` | `string` | — | Required. |
| `appKey` | `string` | — | Optional read-only key. |
| `sendDeviceInfo` | `boolean` | `true` | Include device metadata. |
| `includeVendorId` | `boolean` | — | iOS vendor identifier. |
| `includeAdvertisingId` | `boolean` | — | Ad ID (after consent). |
| `debug` | `boolean` | `false` | Log to console. |

### Class API

```ts
import LinkMeClient from '@li-nk.me/react-native-sdk';

const client = new LinkMeClient();
await client.configure({ appId: 'app_123' });
```

`LinkMeClient` exposes the same methods as the top-level functions.

## Debugging Deferred Links

- Pass `debug: true` (or `__DEV__`) to `configure` to emit `[LinkMe SDK]` logs for pasteboard and fingerprint claims.
- Check that Expo Clipboard is installed if you expect pasteboard-based iOS claims.
- Android deferred claims:
  - **Install Referrer** (deterministic): `/api/install-referrer`
  - **Fingerprint** (probabilistic fallback): `/api/deferred/claim`
- A `404` from `/api/deferred/claim` typically means `no_match` (no eligible click token to claim).

## App Events

`track("open")` and other events are sent to `POST /api/app-events` and require a write-capable API key when keys are enforced.

For full documentation, guides, and API reference, please visit our [Help Center](https://li-nk.me/docs/help).

## License

MIT
