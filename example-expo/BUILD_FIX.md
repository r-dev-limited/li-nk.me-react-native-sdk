# iOS Build Fix - Swift Concurrency Errors

## Problem

Building the Expo example app fails with Swift concurrency errors in `expo-modules-core`:
- Non-final classes cannot conform to 'Sendable'
- Main actor isolation issues
- Concurrency-safety warnings

## Root Cause

Expo SDK 53 has not been fully updated for Swift 6's strict concurrency checking. These are upstream issues in Expo's code, not in our LinkMe SDK.

## Solution Applied

Updated `ios/Podfile` to disable strict concurrency checking for Expo modules:

```ruby
# Set Swift version and concurrency mode for all pod targets
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |config|
    # Disable strict concurrency for Expo modules to avoid Sendable warnings
    target_name_lower = target.name.downcase
    if target.name.start_with?('Expo') || 
       target.name.start_with?('expo-') ||
       target_name_lower.include?('expo') ||
       target_name_lower.include?('linking')
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      config.build_settings['SWIFT_UPCOMING_FEATURE_CONCISE_MAGIC_FILE'] = 'NO'
      config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    end
    
    # Set Swift version
    config.build_settings['SWIFT_VERSION'] ||= '5.0'
  end
end
```

## Steps to Apply

1. **Clean build artifacts**:
```bash
cd ios
rm -rf Pods Podfile.lock build
cd ..
```

2. **Reinstall pods**:
```bash
cd ios
pod install
cd ..
```

3. **Build the app**:
```bash
# For simulator
npx expo run:ios --simulator

# For device (requires device to be connected)
npx expo run:ios --device
```

## Alternative: Build from Xcode

If the command-line build still has issues:

1. Open Xcode:
```bash
open ios/LinkMeRNExample.xcworkspace
```

2. Select your target device/simulator

3. Build Settings → Search for "Swift Strict Concurrency"
   - Set to "Minimal" for all Expo targets

4. Build Settings → Search for "Treat Warnings as Errors"
   - Set to "No" for all Expo targets

5. Build and run (⌘R)

## Verification

After the build completes successfully, you should see:
- ✅ No Swift concurrency errors
- ✅ App launches on simulator/device
- ✅ LinkMe SDK properly initialized

## Testing Deep Links

Once the app is running, test deep links:

### Simulator
```bash
xcrun simctl openurl booted "https://0jk2u2h9.li-nk.me/?path=profile"
```

### Device
Use Safari to open the link or use a link testing service.

## Expected Behavior

1. **Cold Start**: App opens and navigates to the specified path
2. **Hot Link**: App foregrounds and navigates to the specified path
3. **Console Logs**: Should see LinkMe initialization and navigation logs

## Notes

- These Podfile changes only affect Expo modules
- Our LinkMe SDK code is not affected
- Expo will fix these issues in future SDK updates
- This is a temporary workaround for Expo SDK 53

