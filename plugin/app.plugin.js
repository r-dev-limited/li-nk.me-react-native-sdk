const { withEntitlementsPlist, withAndroidManifest, withAppDelegate, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function buildIOSConfig(props = {}) {
  const {
    baseUrl,
    appId,
    appKey,
    enablePasteboard = false,
    sendDeviceInfo = true,
    includeVendorId = true,
    includeAdvertisingId = false,
  } = props;

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl,
    appId: appId || null,
    appKey: appKey || null,
    enablePasteboard,
    sendDeviceInfo,
    includeVendorId,
    includeAdvertisingId,
  };
}

const withLinkMe = (config, props = {}) => {
  const schemes = ensureArray(props.schemes);
  const associatedDomains = ensureArray(props.associatedDomains);
  const hosts = ensureArray(props.hosts);
  const iosConfig = buildIOSConfig(props);

  const withIOSEntitlements = withEntitlementsPlist(config, (conf) => {
    if (associatedDomains.length) {
      const current = conf.modResults['com.apple.developer.associated-domains'] || [];
      const merged = Array.from(new Set([...current, ...associatedDomains.map((d) => `applinks:${d}`)]));
      conf.modResults['com.apple.developer.associated-domains'] = merged;
    }
    return conf;
  });

  const withIOSAppDelegate = withAppDelegate(withIOSEntitlements, (conf) => {
    let { contents } = conf.modResults;

    if (!contents.includes('LinkMeBridge.h')) {
      contents = contents.replace(
        /#import <React\/RCTLinkingManager\.h>/,
        '#import <React/RCTLinkingManager.h>\n#import <react_native_linkme/LinkMeBridge.h>'
      );
    }

    contents = contents.replace(
      /self\.initialProps = @\{\};\n/,
      'self.initialProps = @{};\n\n  [LinkMeBridge configureIfNeeded];\n'
    );

    contents = contents.replace(
      /- \(BOOL\)application:\(UIApplication \*\)application openURL:\(NSURL \*\)url options:\(NSDictionary<UIApplicationOpenURLOptionsKey,id> \*\)options \{[\s\S]*?\}/,
      `- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  if ([LinkMeBridge handleURL:url]) {
    return YES;
  }
  return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];
}`
    );

    contents = contents.replace(
      /- \(BOOL\)application:\(UIApplication \*\)application continueUserActivity:\(nonnull NSUserActivity \*\)userActivity restorationHandler:\(nonnull void \(\^\)\(NSArray<id<UIUserActivityRestoring>> \* _Nullable\)\)restorationHandler \{[\s\S]*?\}/,
      `- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  if ([LinkMeBridge handleUserActivity:userActivity]) {
    return YES;
  }
  BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || result;
}`
    );

    conf.modResults.contents = contents;
    return conf;
  });

  const withIOSInfoPlist = withInfoPlist(withIOSAppDelegate, (conf) => {
    if (iosConfig) {
      conf.modResults.LinkMeConfig = iosConfig;
    }
    return conf;
  });

  return withAndroidManifest(withIOSInfoPlist, (conf) => {
    const manifest = conf.modResults;
    const app = manifest.application?.find((it) => it['$']['android:name'] === '.MainApplication') || manifest.application?.[0];
    if (app) {
      app.activity = app.activity || [];
      const mainActivity = app.activity.find((a) => a['$']['android:name'] === '.MainActivity') || app.activity[0];
      if (mainActivity) {
        mainActivity['intent-filter'] = mainActivity['intent-filter'] || [];
        if (hosts.length) {
          hosts.forEach((host) => {
            mainActivity['intent-filter'].push({
              action: [{ '$': { 'android:name': 'android.intent.action.VIEW' } }],
              category: [
                { '$': { 'android:name': 'android.intent.category.DEFAULT' } },
                { '$': { 'android:name': 'android.intent.category.BROWSABLE' } },
              ],
              data: [{ '$': { 'android:scheme': 'https', 'android:host': host } }],
            });
          });
        }
        if (schemes.length) {
          schemes.forEach((scheme) => {
            mainActivity['intent-filter'].push({
              action: [{ '$': { 'android:name': 'android.intent.action.VIEW' } }],
              category: [
                { '$': { 'android:name': 'android.intent.category.DEFAULT' } },
                { '$': { 'android:name': 'android.intent.category.BROWSABLE' } },
              ],
              data: [{ '$': { 'android:scheme': scheme } }],
            });
          });
        }
      }
    }
    return conf;
  });
};

module.exports = withLinkMe;
