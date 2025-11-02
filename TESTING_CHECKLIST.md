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

### 3. Start the Dev Client
```bash
npm run start -- --dev-client
```
Install the Expo Dev Client on your device/simulator once:
```bash
npx expo run:ios --device   # or --simulator
npx expo run:android --device
```
(Subsequent runs only need `expo start --dev-client`.)

## Test Scenarios

### Test 1: Cold Start with Universal Link (iOS / Android App Link)
1. Terminate the app.
2. Open a browser and navigate to `https://0jk2u2h9.li-nk.me/?path=profile`.
3. Tap the link.

**Expected:**
- Dev client launches the app.
- Console logs:
  - `[LinkMe Example] Initializing LinkMe SDK`
  - `[LinkMe Example] SDK configured`
  - `[LinkMe Example] Received payload: ...`
  - `[LinkMe Example] Navigating to: /profile`
- Router transitions to the Profile screen.

### Test 2: Hot Link (App Foreground)
1. Ensure the app is open on the Home screen.
2. Trigger the link again (`https://0jk2u2h9.li-nk.me/?path=settings`).

**Expected:**
- App remains foregrounded.
- Console shows `[LinkMe Example] Received payload:` with `path: "settings"`.
- Navigation updates to `/settings`.

### Test 3: Custom Scheme
1. With the app closed, run:
   - iOS: `xcrun simctl openurl booted "linkme-example://open?path=profile"`
   - Android: `adb shell am start -W -a android.intent.action.VIEW -d "linkme-example://open?path=profile" me.link.example`

**Expected:** App launches and routes to `/profile`.

### Test 4: Deferred Deep Link
1. Uninstall the app / clear dev client data.
2. Click the universal link (`https://0jk2u2h9.li-nk.me/?path=settings`).
3. Reinstall and launch the app.

**Expected:** First launch resolves the deferred link and navigates to `/settings`. Logs show `[LinkMe Example] Deferred link:` with payload.

### Test 5: Manual Claim Button
1. Open the Home screen.
2. Tap **Claim Deferred**.

**Expected:**
- Console logs the response from `/api/deferred/claim`.
- Latest payload state updates in the UI.

## Debug Tips
- Ensure `configure()` runs before any deep link handling (watch for `[LinkMe Example] SDK configured`).
- Check that your test domain is listed in `hosts` and `associatedDomains` within `app.json`.
- Use the **Latest Link** readout on the Home screen to verify payload contents.
- Remember to reset the dev client between deferred-link tests to clear fingerprint data.

