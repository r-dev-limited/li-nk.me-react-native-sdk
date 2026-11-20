# LinkMe deepmerge fork

This package is a local, source-preserving fork of upstream `deepmerge@4.3.1`
at Git commit `5b87756a5671635679001cbac72aa42f23472c81`. The upstream MIT
license, changelog, readme, type declarations, CommonJS distribution, and UMD
distribution are retained.

The local version is `4.3.2+linkme.1`; it is not published as an upstream
release. The security delta is intentionally small and applied consistently to
`index.js`, `dist/cjs.js`, and `dist/umd.js`:

- Reject `__proto__`, `constructor`, and `prototype` by key name while copying
  both target and source properties.
- Define copied destination properties as own data properties so the
  `__proto__` setter is never invoked.
- Treat throwing `in`/property-inspection traps as unsafe and skip those keys.

The fork addresses the target-shape bypass described in
[TehShrike/deepmerge#273](https://github.com/TehShrike/deepmerge/issues/273).
It deliberately preserves the public `merge`, `merge.all`, array merge,
custom merge, and clone APIs. Rebase this narrow delta on upstream releases,
retain the upstream license and exact source commit, and rerun
`node --test tests/security/deepmerge-fork.test.cjs` before replacing any copy.
