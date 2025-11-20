# React Native SDK - Quick Start Guide

## Installation

```bash
npm install @linkme/react-native-sdk
```

> The SDK is implemented entirely in TypeScript; no native modules or platform-specific code is required. It uses React Native's built-in `Linking` API for deep link handling.

## Basic Setup (Expo Router)

### 1. Configure app.json

```json
{
  "expo": {
    "scheme": "your-app-scheme",
    "plugins": [
      [
        "@linkme/react-native-sdk/plugin/app.plugin.js",
        {
          "hosts": ["your-domain.li-nk.me"],
          "associatedDomains": ["your-domain.li-nk.me"],
          "schemes": ["your-app-scheme"]
        }
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp"
    },
    "android": {
      "package": "com.yourcompany.yourapp"
    }
  }
}
```

### 2. Initialize in Root Layout

```typescript
// app/_layout.tsx
import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import {
    configure,
    getInitialLink,
    onLink,
    claimDeferredIfAvailable,
    track,
    LinkMePayload,
} from '@linkme/react-native-sdk';
import { useRouter } from 'expo-router';

export default function RootLayout() {
    const router = useRouter();
    const unsubRef = useRef<{ remove: () => void } | null>(null);
    const initializedRef = useRef(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Prevent double initialization in React strict mode
        if (initializedRef.current) return;
        initializedRef.current = true;

        (async () => {
            try {
                // Step 1: Configure SDK
                await configure({
                    appId: 'your-app-id',
                    appKey: 'your-app-key',
                    enablePasteboard: false,
                    sendDeviceInfo: true,
                    includeVendorId: true,
                    includeAdvertisingId: false,
                });

                // Step 2: Listen for deep links
                unsubRef.current = onLink((payload: LinkMePayload) => {
                    if (payload.path) {
                        const targetPath = payload.path.startsWith('/') 
                            ? payload.path 
                            : `/${payload.path}`;
                        router.replace(targetPath as any);
                    }
                });

                // Step 3: Check for initial link
                const initial = await getInitialLink();
                if (initial?.path) {
                    const targetPath = initial.path.startsWith('/') 
                        ? initial.path 
                        : `/${initial.path}`;
                    router.replace(targetPath as any);
                } else {
                    // Step 4: Check for deferred link
                    const deferred = await claimDeferredIfAvailable();
                    if (deferred?.path) {
                        const targetPath = deferred.path.startsWith('/') 
                            ? deferred.path 
                            : `/${deferred.path}`;
                        router.replace(targetPath as any);
                    }
                }

                // Step 5: Track app open
                await track('open');
            } catch (error) {
                console.error('LinkMe initialization error:', error);
            } finally {
                setIsReady(true);
            }
        })();

        return () => {
            unsubRef.current?.remove();
        };
    }, []);

    if (!isReady) {
        return null;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: true,
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Home' }} />
            <Stack.Screen name="profile" options={{ title: 'Profile' }} />
            {/* Add your other screens */}
        </Stack>
    );
}
```

## API Reference

### configure(config)
Initialize the SDK with your configuration.

```typescript
await configure({
    appId: 'your-app-id',
    appKey: 'your-app-key',
    enablePasteboard: false,        // Optional
    sendDeviceInfo: true,           // Optional
    includeVendorId: true,          // Optional
    includeAdvertisingId: false,    // Optional
});
```

### onLink(callback)
Listen for deep link payloads.

```typescript
const unsub = onLink((payload: LinkMePayload) => {
    console.log('Link received:', payload);
    // Navigate based on payload.path
});

// Clean up when done
unsub.remove();
```

### getInitialLink()
Get the link that opened the app (if any).

```typescript
const payload = await getInitialLink();
if (payload?.path) {
    router.push(payload.path);
}
```

### claimDeferredIfAvailable()
Claim a deferred deep link (for first-time installs).

```typescript
const payload = await claimDeferredIfAvailable();
if (payload?.path) {
    router.push(payload.path);
}
```

### track(event, properties?)
Track custom events.

```typescript
await track('open', { screen: 'home' });
await track('purchase', { amount: 99.99, currency: 'USD' });
```

### setUserId(userId)
Associate a user ID with the session.

```typescript
await setUserId('user-123');
```

### setAdvertisingConsent(granted)
Set advertising consent status.

```typescript
await setAdvertisingConsent(true);
```

## Payload Structure

```typescript
type LinkMePayload = {
    linkId?: string;                    // Unique link identifier
    path?: string;                      // Deep link path (e.g., "profile")
    params?: Record<string, string>;    // Query parameters
    utm?: Record<string, string>;       // UTM parameters
    custom?: Record<string, string>;    // Custom data
};
```

## Common Patterns

### Navigate with Parameters

```typescript
onLink((payload) => {
    if (payload.path && payload.params) {
        // Build path with query params
        const queryString = new URLSearchParams(payload.params).toString();
        const path = `${payload.path}?${queryString}`;
        router.push(path);
    }
});
```

### Handle UTM Parameters
LinkMe normalizes UTM parameters into a standard format. You can map these directly to your analytics provider (e.g., Firebase Analytics).

```typescript
import analytics from '@react-native-firebase/analytics';

onLink((payload) => {
    if (payload.utm) {
        // Log campaign details event
        analytics().logEvent('campaign_details', {
            source: payload.utm.source,
            medium: payload.utm.medium,
            campaign: payload.utm.campaign,
            term: payload.utm.term,
            content: payload.utm.content,
        });

        // Set default parameters for future events
        analytics().setDefaultEventParameters({
            source: payload.utm.source,
            medium: payload.utm.medium,
            campaign: payload.utm.campaign,
        });
    }
});
```

### Custom Data Handling

```typescript
onLink((payload) => {
    if (payload.custom) {
        // Handle custom data
        const productId = payload.custom.product_id;
        const referralCode = payload.custom.referral_code;
        // Use in your app logic
    }
});
```

## Testing

### Test Deep Links (iOS Simulator)

```bash
# Universal Link
xcrun simctl openurl booted "https://your-domain.li-nk.me/?path=profile"

# Custom Scheme
xcrun simctl openurl booted "your-app-scheme://open?path=profile"
```

### Test Deep Links (Android)

```bash
# Universal Link
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://your-domain.li-nk.me/?path=profile" \
  com.yourcompany.yourapp

# Custom Scheme
adb shell am start -W -a android.intent.action.VIEW \
  -d "your-app-scheme://open?path=profile" \
  com.yourcompany.yourapp
```

## Troubleshooting

### Deep links not working?

1. **Check configuration**: Verify `app.json` has correct domains
2. **Check bundle ID**: Must match your LinkMe app configuration
3. **Check signing**: iOS requires proper code signing for Universal Links
4. **Check logs**: Look for `[LinkMe Example]` logs in console

### Navigation not happening?

1. **Check payload**: Verify `payload.path` is present
2. **Check routes**: Ensure route exists in your app
3. **Check listener**: Verify `onLink()` callback is registered
4. **Check initialization**: Ensure SDK is configured before links arrive

### Deferred links not working?

1. **Test on real device**: Deferred links require real install flow
2. **Check timing**: Must be first app launch after install
3. **Check backend**: Verify LinkMe backend is storing deferred links
4. **Check logs**: Look for `[LinkMeKit] deferred claim` logs

## Best Practices

1. ✅ Initialize SDK in root layout
2. ✅ Set up listener before checking initial/deferred links
3. ✅ Always normalize paths (add leading `/` if missing)
4. ✅ Clean up listeners on unmount
5. ✅ Handle errors gracefully
6. ✅ Test on real devices
7. ✅ Track important events for analytics

## Support

- Documentation: https://li-nk.me/help/setup/react-native
- Issues: Check FIXES.md and TESTING_CHECKLIST.md
- Example: See `example-expo/` directory

## License

MIT

