const { withEntitlementsPlist, withAndroidManifest, withXcodeProject, withDangerousMod, withAppDelegate, withDangerousMod: withPodfile } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

const withLinkMe = (config, props = {}) => {
  const schemes = ensureArray(props.schemes);
  const associatedDomains = ensureArray(props.associatedDomains);
  const hosts = ensureArray(props.hosts);

  const withIOSEntitlements = withEntitlementsPlist(config, (conf) => {
    if (associatedDomains.length) {
      const current = conf.modResults['com.apple.developer.associated-domains'] || [];
      const merged = Array.from(new Set([...current, ...associatedDomains.map((d) => `applinks:${d}`)]));
      conf.modResults['com.apple.developer.associated-domains'] = merged;
    }
    return conf;
  });

  const withIOSConfig = withIOSEntitlements;

  return withAndroidManifest(withIOSConfig, (conf) => {
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
