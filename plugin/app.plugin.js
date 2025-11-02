const { withEntitlementsPlist, withAndroidManifest } = require('@expo/config-plugins');

function ensureArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

const withLinkMe = (config, props = {}) => {
  const schemes = ensureArray(props.schemes);
  const associatedDomains = ensureArray(props.associatedDomains);
  const hosts = ensureArray(props.hosts);

  const withIOSEntitlements = withEntitlementsPlist(config, (conf) => {
    const domains = associatedDomains.length ? associatedDomains : hosts;
    if (domains.length) {
      const current = conf.modResults['com.apple.developer.associated-domains'] || [];
      const normalized = domains.map((domain) =>
        String(domain).startsWith('applinks:') ? String(domain) : `applinks:${domain}`
      );
      const merged = Array.from(new Set([...current, ...normalized]));
      conf.modResults['com.apple.developer.associated-domains'] = merged;
    }
    return conf;
  });

  return withAndroidManifest(withIOSEntitlements, (conf) => {
    const manifest = conf.modResults;
    const app =
      manifest.application?.find((it) => it['$']['android:name'] === '.MainApplication') ||
      manifest.application?.[0];
    if (app) {
      app.activity = app.activity || [];
      const mainActivity =
        app.activity.find((a) => a['$']['android:name'] === '.MainActivity') || app.activity[0];
      if (mainActivity) {
        mainActivity['intent-filter'] = mainActivity['intent-filter'] || [];
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
    return conf;
  });
};

module.exports = withLinkMe;
