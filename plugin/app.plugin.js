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
    if (!manifest) {
      return conf;
    }
    
    // Handle both possible structures: manifest.manifest or manifest directly
    const manifestRoot = manifest.manifest || manifest;
    const application = manifestRoot.application;
    if (!application) {
      return conf;
    }
    
    // Ensure application is an array
    const applications = Array.isArray(application) ? application : [application];
    if (applications.length === 0) {
      return conf;
    }
    
    const app = applications.find((it) => it['$']?.['android:name'] === '.MainApplication') || applications[0];
    if (!app) {
      return conf;
    }
    
    // Ensure activity is an array
    if (!app.activity) {
      app.activity = [];
    }
    if (!Array.isArray(app.activity)) {
      app.activity = [app.activity];
    }
    
    // Find MainActivity
    const mainActivity = app.activity.find((a) => {
      const name = a['$']?.['android:name'];
      return name === '.MainActivity' || name === 'MainActivity';
    }) || app.activity[0];
    
    if (!mainActivity) {
      return conf;
    }
    
    // Ensure intent-filter is an array
    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }
    if (!Array.isArray(mainActivity['intent-filter'])) {
      mainActivity['intent-filter'] = [mainActivity['intent-filter']];
    }
    
    // Add HTTPS intent-filters with autoVerify for App Links
    hosts.forEach((host) => {
      if (!host || typeof host !== 'string') return;
      
      // Check if this host already exists to avoid duplicates
      const exists = mainActivity['intent-filter'].some((filter) => {
        const filterData = filter.data;
        if (!Array.isArray(filterData)) return false;
        return filterData.some((d) => {
          return d['$']?.['android:scheme'] === 'https' && d['$']?.['android:host'] === host;
        });
      });
      
      if (!exists) {
        mainActivity['intent-filter'].push({
          '$': { 'android:autoVerify': 'true' },
          action: [{ '$': { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { '$': { 'android:name': 'android.intent.category.DEFAULT' } },
            { '$': { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
          data: [{ '$': { 'android:scheme': 'https', 'android:host': host } }],
        });
      }
    });
    
    // Add custom scheme intent-filters
    schemes.forEach((scheme) => {
      if (!scheme || typeof scheme !== 'string') return;
      
      // Check if this scheme already exists to avoid duplicates
      const exists = mainActivity['intent-filter'].some((filter) => {
        const filterData = filter.data;
        if (!Array.isArray(filterData)) return false;
        return filterData.some((d) => {
          return d['$']?.['android:scheme'] === scheme;
        });
      });
      
      if (!exists) {
        mainActivity['intent-filter'].push({
          action: [{ '$': { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { '$': { 'android:name': 'android.intent.category.DEFAULT' } },
            { '$': { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
          data: [{ '$': { 'android:scheme': scheme } }],
        });
      }
    });
    
    return conf;
  });
};

module.exports = withLinkMe;
