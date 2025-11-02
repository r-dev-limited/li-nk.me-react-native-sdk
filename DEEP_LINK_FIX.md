# Deep Link Fix

## Problem
Expo Router intercepts all URLs before LinkMe SDK can process them.

## Solution
1. Added `LinkMeBridge.h/m` Objective-C shim (compiled via SPM) that exposes LinkMe configuration and URL handling to Objective-C callers.
2. AppDelegate imports `react_native_linkme/LinkMeBridge.h`, configures LinkMe during launch, and returns `YES` as soon as LinkMe handles a URL/user activity.
3. `LinkMeURLHandler.swift` centralizes native configuration (auto-loads from Info.plist, accepts runtime updates) and is invoked exclusively through `LinkMeBridge`.
4. `plugin/app.plugin.js` injects the AppDelegate glue and writes `LinkMeConfig` into Info.plist using the values from `app.json`.

## How It Works
```
URL → AppDelegate → LinkMeBridge → LinkMeURLHandler → LinkMe SDK
                      ↓ handled? YES → return immediately (Expo Router never sees it)
                      ↓ no → React Native Linking → Expo Router
```

## Files
- `ios/LinkMeBridge.h/.m` – Objective-C façade exposing configure/handle helpers
- `ios/LinkMeURLHandler.swift` – loads Info.plist config, talks to `LinkMe.shared`
- `ios/LinkMeModule.swift` – delegates JS configure() to native bridge, emits payloads
- `plugin/app.plugin.js` – AppDelegate integration + Info.plist config injection
- `example-expo/app.json` – provides native config values (baseUrl, appId, etc.)

## Rebuild
```bash
cd sdks/react-native/example-expo
rm -rf ios/build ios/Pods ios/Podfile.lock
npx expo prebuild --clean --platform ios
npx expo run:ios
```
