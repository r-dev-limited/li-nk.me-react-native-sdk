# Changelog

All notable changes to the LinkMe React Native SDK.

## 0.2.14

- Adds Jest regression coverage, early initial-link queuing, payload validation, disposal, and consistent forced-web handling.
- Removes the release INSTALL_REFERRER receiver, updates the Expo example to SDK 57/RN 0.86, and supports `setUserId(null)`.
- Preserves `cid`/`duplicate` attribution fields and falls through from unusable referrer/pasteboard claims to fingerprint matching.
- Upgrades the test/build toolchain to Jest 30, TypeScript 6, Node type definitions 26, and rimraf 6; production builds exclude tests.

## 0.2.13

- Tightens pasteboard deferred claim parsing to LinkMe hosts/token format only (iOS).
- Clears consumed pasteboard CIDs after successful deferred claim (iOS).
- Bumps native iOS and Android dependencies to 0.2.13.

## 0.2.12

- Adds support for force-web redirect payloads (`forceRedirectWeb=true` + `webFallbackUrl`).
- Bumps native iOS and Android dependencies to 0.2.12.

## 0.2.11

- Internal reliability improvements for link resolution.
- Bumps native dependencies to 0.2.11.

## 0.2.9

- Improved handling of edge redirect scenarios.
- Bumps native dependencies to 0.2.9.

## 0.2.8

- Detox test runner added for end-to-end testing.
- General stability and bug fixes.

## 0.2.7

- Adds `isLinkMe` and `url` fields to payloads to distinguish LinkMe-managed links from basic universal links.

## 0.2.5

- Relaxes pasteboard parsing (iOS) to accept branded LinkMe domains and structured tokens.

## 0.2.4

- SDK alignment release across all platforms.

## 0.2.3

- Internal improvements to deferred claim handling.

## 0.2.1

- Adds `debug` flag to config for verbose instrumentation.
- New `debugVisitUrl` helper for testing deferred claim flows.
- Fingerprint-based deferred claim improvements.

## 0.2.0

- Deferred deep linking: pasteboard (iOS), Install Referrer (Android), fingerprint fallback.
- Expo config plugin for automatic Associated Domains (iOS) and App Links (Android) setup.
- `setReady()` to control when queued URLs are processed.
- Analytics event tracking with `track()`.
- User ID association and advertising consent toggles.

## 0.1.0

- Initial public release on npm.
- Core deep linking: `configure`, `getInitialLink`, `onLink`, `handleUrl`.
