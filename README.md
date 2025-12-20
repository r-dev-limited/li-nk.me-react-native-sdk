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
import { configure } from '@li-nk.me/react-native-sdk';

await configure({
  // Optional: only override when pointing at a local/dev LinkMe Edge instance.
  // Defaults to https://li-nk.me
  appId: 'your_app_id',
  appKey: 'your_app_key',
  debug: __DEV__, // Optional: surface verbose logs for deferred/pasteboard flows
});
```

For full documentation, guides, and API reference, please visit our [Help Center](https://li-nk.me/docs/help).

## Debugging Deferred Links

- Pass `debug: true` (or `__DEV__`) to `configure` to emit `[LinkMe SDK]` logs for pasteboard and fingerprint claims.
- Check that Expo Clipboard is installed if you expect pasteboard-based iOS claims.
- Android deferred claims:
  - **Install Referrer** (deterministic): `/api/install-referrer`
  - **Fingerprint** (probabilistic fallback): `/api/deferred/claim`
- A `404` from `/api/deferred/claim` typically means `no_match` (no eligible click token to claim).

## App Events

`track("open")` and other events are sent to `POST /api/app-events` and require a write-capable API key when keys are enforced.

## License

MIT
