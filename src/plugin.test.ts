jest.mock('@expo/config-plugins', () => ({
  withEntitlementsPlist: (config: any, modify: any) => ({ ...config, iosResult: modify({ modResults: config.iosResult || {} }).modResults }),
  withAndroidManifest: (config: any, modify: any) => ({ ...config, androidResult: modify({ modResults: config.androidResult || { manifest: { application: [{ activity: [{ $: { 'android:name': '.MainActivity' }, 'intent-filter': [] }] }] } } }).modResults }),
}));

const withLinkMe = require('../plugin/app.plugin.js');
const filters = (config: any): any[] => config.androidResult.manifest.application[0].activity[0]['intent-filter'];

describe('Expo App Links surface scopes', () => {
  it('generates distinct Android surface filters while retaining iOS host association and custom schemes', () => {
    const config = withLinkMe({}, { hosts: ['links.example.test'], pathPrefixes: { 'links.example.test': ['/customer/i/'] }, schemes: ['myapp'] });
    expect(config.iosResult['com.apple.developer.associated-domains']).toEqual(['applinks:links.example.test']);
    expect(filters(config)[0]).toMatchObject({ $: { 'android:autoVerify': 'true' }, data: [{ $: { 'android:scheme': 'https', 'android:host': 'links.example.test', 'android:pathPrefix': '/customer/i/' } }] });
    expect(filters(config)[1].data).toEqual([{ $: { 'android:scheme': 'myapp' } }]);
    const other = withLinkMe({}, { hosts: ['links.example.test'], pathPrefixes: { 'links.example.test': ['/staff/i/'] } });
    expect(filters(other)[0].data[0].$['android:pathPrefix']).toBe('/staff/i/');
  });

  it('is idempotent for multiple prefixes and duplicate input values', () => {
    const options = { hosts: ['links.example.test'], pathPrefixes: { 'links.example.test': ['/customer/i/', '/staff/i/', '/staff/i/'] } };
    const first = withLinkMe({}, options);
    expect(filters(first)).toHaveLength(2);
    expect(withLinkMe(first, options)).toEqual(first);
  });

  it('does not broaden a consumer filter when no path override was requested', () => {
    const first = withLinkMe({}, { hosts: ['links.example.test'], pathPrefixes: { 'links.example.test': ['/customer/i/'] } });
    const result = withLinkMe(first, { hosts: ['links.example.test'] });
    expect(filters(result)).toHaveLength(1);
    expect(filters(result)[0].data[0].$['android:pathPrefix']).toBe('/customer/i/');
  });

  it('rejects a broad existing filter rather than claiming the new prefix restricts it', () => {
    const first = withLinkMe({}, { hosts: ['links.example.test'] });
    expect(() => withLinkMe(first, { hosts: ['links.example.test'], pathPrefixes: { 'links.example.test': ['/customer/i/'] } })).toThrow(/existing Android filter/);
  });

  test.each([{ missing: ['/x/'] }, { 'links.example.test': [] }, { 'links.example.test': ['relative'] }, { 'links.example.test': ['/*'] }])('rejects invalid scope configuration: %j', pathPrefixes => {
    expect(() => withLinkMe({}, { hosts: ['links.example.test'], pathPrefixes })).toThrow(/pathPrefixes/);
  });
});
