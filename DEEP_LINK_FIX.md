# Deep Link Fix

## Problem
AppDelegate was not forwarding URLs to LinkMe native SDK. URLs only went to React Native's Linking API, so LinkMe SDK never saw them.

## Fix

### 1. AppDelegate.mm
```objc
// Added import
#import <LinkMeKit/LinkMeKit-Swift.h>

// Fixed openURL to forward to LinkMe SDK
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  BOOL linkMeHandled = [[LinkMe shared] handleWithUrl:url];
  BOOL reactHandled = [RCTLinkingManager application:application openURL:url options:options];
  return [super application:application openURL:url options:options] || linkMeHandled || reactHandled;
}

// Fixed continueUserActivity to forward to LinkMe SDK
- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  BOOL linkMeHandled = [[LinkMe shared] handleWithUserActivity:userActivity];
  BOOL reactHandled = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || linkMeHandled || reactHandled;
}
```

### 2. src/index.ts
Removed unnecessary JavaScript URL forwarding code (Linking.addEventListener, ensureForwarding, etc). Native SDK handles URLs at AppDelegate level.

## Rebuild
```bash
cd sdks/react-native/example-expo
npx expo prebuild --clean --platform ios
npx expo run:ios
```

## Test
- **Cold start**: Close app, click `https://0jk2u2h9.li-nk.me/?path=profile` → Opens to /profile
- **Hot link**: App running, click link → Navigates to target
- **Deferred**: Uninstall, click link, install, open → Navigates on first launch

