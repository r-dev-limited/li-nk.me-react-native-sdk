# Expo Router Deep Link Notes

## Current Architecture
- The React Native SDK is implemented entirely in TypeScript.
- Deep link events come from `Linking.getInitialURL()` and `Linking.addEventListener('url', ...)`.
- The SDK normalizes paths and invokes registered `onLink` listeners in JavaScript.
- No native bridge, Swift packages, or Gradle modules are required.

## Event Flow
```
URL tap → React Native Linking → LinkMe controller (TS) → onLink listeners → App routing
```

## Integration Checklist
1. Call `configure()` once on startup (for example, inside `app/_layout.tsx`).
2. Use `onLink()` to react to payloads and drive navigation.
3. Call `getInitialLink()` after configuring to handle cold-start URLs.
4. Optionally call `claimDeferredIfAvailable()` when no initial link is present.
5. Use `track()` for analytics events such as `open`, `install`, etc.

## Expo Specific Setup
- Configure your schemes and App/Android Links with the Expo config plugin (`@linkme/react-native-sdk/plugin/app.plugin.js`).
- No `expo prebuild` is required unless you need native customizations unrelated to LinkMe.
- For development builds, run `npx expo start --dev-client` and install the Dev Client once.

## Troubleshooting
- Verify `configure()` succeeds before handling links.
- Ensure the domain you are testing is present in `associatedDomains` (iOS) and `hosts` (Android) plugin options.
- Use `console.log` inside the `onLink` callback to inspect payloads.
- Remember to remove listeners on unmount via the returned `remove()` handle.
