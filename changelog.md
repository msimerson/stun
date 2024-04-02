# Change Log

All notable changes to the "stun" package will be documented in this file.

### [3.0.1] - 2024-04-02

- dep(ip): bump 2.0.0 to 2.0.1
- configure eslint & prettier the modern way
  - jettison `@nodertc/eslint-config`, much of local config was turning off stuff imported from there
- ci: bump GHA versions
- test: remove eslint from devDependencies (installed by GHA for tests, npx will use local version)
- test: remove jest from devDependencies
  - installed by npx when needed
  - dramatically shrinks package-lock.json
  - next version: replaced with node:test

### [3.0.0] - 2023-12-13

- BREAKING: drop support for node.js <= 16
    - still works, but no legacy version testing
- dep(eslint): bump to 8.55.0
- dep(jest): bump to 29.7.0
- dep(prettier): bump to 3.1.1


## [2.1.16] - 2023-12-09

- dep(meow): replace with minimist
- dep(parse-url): replace with native URL
    - require node.js >= 10
- ci: replace Travis with GHA


## [2.1.0] - 2019-11-23

- `stun.request` supports promise interface.


## [2.0.0] - 2019-06-02

- Add `request()` method to simplify client-side requests. Follow the `STUN` specification.
- All STUN-related errors inherit `StunError`. See `StunMessageError` and `StunResponseError`.
- `StunMessage` class was replaced by `StunRequest` and `StunResponse`. They represent outgoing and incoming messages. The main difference is that you cannot change incoming message.
- Added simple CLI, use `npx stun` or `npx stun -p 3478`.
- Another incompatible API changes.
