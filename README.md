# LinkMe React Native SDK

Pure TypeScript React Native SDK for LinkMe — deep linking and attribution. No native modules required.

- Quick Start: See `QUICK_START.md`
- Repo docs: ../../docs/help/docs/setup/react-native.md
- Hosted docs: https://li-nk.me/help/setup/react-native
- Example app: See `example-expo/` directory
- Android troubleshooting: See [Android Troubleshooting](https://li-nk.me/help/setup/android#troubleshooting) section in Android setup docs

## Installation

```bash
npm install @linkme/react-native-sdk
```

### Expo Configuration

Add the config plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@linkme/react-native-sdk/plugin/app.plugin.js",
        {
          "hosts": ["link.example.com"],
          "associatedDomains": ["applinks:link.example.com"],
          "schemes": ["com.example.app"]
        }
      ]
    ]
  }
}
```

## Usage

Initialize the SDK in your root layout (e.g., `app/_layout.tsx`):

```typescript
import { configure, onLink, getInitialLink, claimDeferredIfAvailable, track } from '@linkme/react-native-sdk';

// ... inside your component
useEffect(() => {
  configure({
    appId: 'your-app-id',
    appKey: 'your-app-key',
    // ... other options
  }).then(() => {
    // 1. Listen for deep links (foreground)
    onLink((payload) => handlePayload(payload));

    // 2. Check for initial link (cold start)
    getInitialLink().then((payload) => {
      if (payload) handlePayload(payload);
      else {
        // 3. Check for deferred link (first install)
        claimDeferredIfAvailable().then((payload) => {
          if (payload) handlePayload(payload);
        });
      }
    });

    // 4. Track open
    track('open');
  });
}, []);
```

## UTM & Analytics

LinkMe automatically normalizes UTM parameters from deep links and deferred links. You can map these to your analytics provider (e.g., Firebase):

```typescript
function handlePayload(payload: LinkMePayload) {
  if (payload.utm) {
    // Example: Map to Firebase Analytics
    // analytics().logEvent('campaign_details', {
    //   source: payload.utm.source,
    //   medium: payload.utm.medium,
    //   campaign: payload.utm.campaign,
    //   term: payload.utm.term,
    //   content: payload.utm.content,
    // });
  }
}
```

The SDK uses React Native's built-in `Linking` API and requires an Expo config plugin for deep link configuration.

License: MIT
