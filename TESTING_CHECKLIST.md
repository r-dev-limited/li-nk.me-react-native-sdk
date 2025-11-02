# React Native SDK Testing Checklist

## Pre-Testing Setup

### 1. Build the SDK
```bash
cd sdks/react-native
npm run build
```

### 2. Install Example App Dependencies
```bash
cd example-expo
npm install
```

### 3. Prebuild Native Projects
```bash
npx expo prebuild
```

## iOS Testing

### Setup
1. Open Xcode: `open ios/linkmerneexample.xcworkspace`
2. Configure signing with your team
3. Ensure device is connected or simulator is running

### Test Cases

#### Test 1: Cold Start with Deep Link (Universal Link)
**Scenario**: App is completely closed, user clicks a LinkMe URL

**Steps**:
1. Close app completely (swipe up from app switcher)
2. Open Safari on device/simulator
3. Navigate to: `https://0jk2u2h9.li-nk.me/?path=profile`
4. Tap the link

**Expected Result**:
- App opens
- Console shows: `[LinkMe Example] Initializing LinkMe SDK`
- Console shows: `[LinkMe Example] SDK configured`
- Console shows: `[LinkMe Example] Received payload:` with path: "profile"
- App navigates to Profile screen
- Profile screen displays "Profile Page"

**Logs to Check**:
```
[LinkMe Example] Initializing LinkMe SDK
[LinkMe Example] SDK configured
[LinkMe Example] Listener registered
[LinkMe Example] Initial link: null
[LinkMe Example] No initial link, checking deferred
[LinkMeKit] POST /api/deferred/claim
[LinkMeKit] deferred claim payload=...
[LinkMe Example] Deferred link: {path: "profile", ...}
[LinkMe Example] Navigating to deferred path: /profile
```

#### Test 2: Hot Link (App Already Running)
**Scenario**: App is already open, user clicks a LinkMe URL

**Steps**:
1. Ensure app is open and on Home screen
2. Open Safari in split view or on another device
3. Navigate to: `https://0jk2u2h9.li-nk.me/?path=settings`
4. Tap the link

**Expected Result**:
- App comes to foreground
- Console shows: `[LinkMeModule] handleUrl url=...`
- Console shows: `[LinkMe Example] Received payload:` with path: "settings"
- App navigates to Settings screen
- Settings screen displays "Settings Page"

**Logs to Check**:
```
[LinkMeModule] handleUrl url=https://0jk2u2h9.li-nk.me/?path=settings
[LinkMeKit] POST /api/deeplink/resolve-url
[LinkMeKit] resolve-url payload=...
[LinkMeModule] Emitting link event payload=...
[LinkMe Example] Received payload: {path: "settings", ...}
[LinkMe Example] Navigating to: /settings
```

#### Test 3: Custom URL Scheme
**Scenario**: App is closed, user opens via custom scheme

**Steps**:
1. Close app completely
2. Open Terminal on Mac
3. Run: `xcrun simctl openurl booted "linkme-example://open?path=profile"`

**Expected Result**:
- App opens
- Navigates to Profile screen

#### Test 4: Deferred Deep Link (First Install)
**Scenario**: User clicks link before app is installed

**Steps**:
1. Uninstall app from device/simulator
2. Open Safari and navigate to: `https://0jk2u2h9.li-nk.me/?path=settings`
3. Install and open app

**Expected Result**:
- App opens to Settings screen on first launch
- Console shows deferred link was claimed

**Note**: This requires the LinkMe backend to properly store the deferred link. May need to test on real device with actual install flow.

#### Test 5: Path Normalization
**Scenario**: Test that paths with and without leading slash work

**Steps**:
1. Test with path: `profile` (no leading slash)
2. Test with path: `/profile` (with leading slash)

**Expected Result**:
- Both should navigate to `/profile` correctly

## Android Testing

### Setup
1. Ensure Android device is connected or emulator is running
2. Run: `npx expo run:android --device`

### Test Cases

Follow the same test cases as iOS, but use:
- ADB command for custom scheme: `adb shell am start -W -a android.intent.action.VIEW -d "linkme-example://open?path=profile" me.link.example`
- Android Chrome for universal links

**Expected Logs** (similar to iOS):
```
[LinkMeModule] handleUrl url=...
[LinkMe Example] Received payload: ...
[LinkMe Example] Navigating to: ...
```

## Common Issues and Debugging

### Issue: "No initial link" but link was clicked
**Possible Causes**:
- Associated domains not configured correctly
- App not signed with correct team
- Universal links not working (test with custom scheme first)

**Debug Steps**:
1. Check console for URL capture
2. Verify `Linking.getInitialURL()` returns the URL
3. Check if URL is being queued in `pendingUrls`

### Issue: Payload has no path
**Possible Causes**:
- Backend not returning path in response
- Link not configured with path parameter

**Debug Steps**:
1. Check backend logs for `/api/deeplink` or `/api/deferred/claim` requests
2. Verify link configuration includes `path` parameter
3. Check native module logs for payload contents

### Issue: Navigation not happening
**Possible Causes**:
- Expo Router not configured correctly
- Path doesn't match any route

**Debug Steps**:
1. Check if `onLink` callback is triggered
2. Verify path calculation: `payload.path.startsWith('/') ? payload.path : \`/\${payload.path}\``
3. Check Expo Router configuration in `_layout.tsx`

### Issue: SDK not configured error
**Possible Causes**:
- `configure()` not called
- `configure()` failed silently

**Debug Steps**:
1. Check for `[LinkMe Example] SDK configured` log
2. Look for any errors in `configure()` call
3. Verify native module is available: check `LinkMe` is not null

## Performance Checks

### Initialization Time
- SDK should configure in < 100ms
- Initial link check should complete in < 200ms
- Deferred link claim should complete in < 1s

### Memory Usage
- SDK should not leak memory
- Event listeners should be properly cleaned up on unmount

### Network Requests
- Should see POST to `/api/deferred/claim` on cold start
- Should see POST to `/api/deeplink/resolve-url` for universal links
- Should see POST to `/api/app-events` for track calls

## Success Criteria

All tests pass with:
- ✅ Correct navigation to specified paths
- ✅ Proper payload extraction (linkId, path, params, utm, custom)
- ✅ No crashes or errors in console
- ✅ Clean initialization flow
- ✅ Proper cleanup on app close

## Regression Tests

After any SDK changes, verify:
1. Cold start with deep link still works
2. Hot link still works
3. Deferred links still work
4. Custom URL schemes still work
5. Navigation logic still works
6. Event listeners still clean up properly

