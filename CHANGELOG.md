# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).

### Unreleased

### [3.2.0] - 2026-04-07

RFC 8489 (STUN 2020) support:

- New attributes: `MESSAGE_INTEGRITY_SHA256` (0x001C), `PASSWORD_ALGORITHM` (0x001D), `USERHASH` (0x001E), `PASSWORD_ALGORITHMS` (0x8002), `ALTERNATE_DOMAIN` (0x8003)
- `addMessageIntegritySha256(key)` on `StunRequest`
- `addUserhash(username, realm)` — sends SHA-256(`username:realm`) instead of plaintext username
- `addPasswordAlgorithm(algorithm, params?)` — single algorithm selection
- `addPasswordAlgorithms(algorithms)` — server-side algorithm advertisement
- `addAlternateDomain(domain)` — FQDN companion to `ALTERNATE_SERVER`
- Corresponding getters on `StunResponse`: `getMessageIntegritySha256()`, `getUserhash()`, `getPasswordAlgorithm()`, `getPasswordAlgorithms()`, `getAlternateDomain()`
- `validateMessageIntegritySha256(message, key)` exported from `lib/validate` and from the top-level module
- `constants.passwordAlgorithm` (`{ MD5: 0x0001, SHA_256: 0x0002 }`) and public constants prefixed `STUN_PASSWORD_ALGORITHM_`
- Custom codec classes `StunPasswordAlgorithmAttribute` and `StunPasswordAlgorithmsAttribute` with correct per-entry padding for the list format

RFC 7064 (`stuns:` URI scheme) support:

- `request('stuns://host:port')` routes to a new TLS-over-TCP transport (`tls-request`)
- default port for `stuns:` is 5349 (was previously an error)
- `rejectUnauthorized` option forwarded to the TLS socket (defaults `true`)
- `http:` and other non-STUN protocols still throw `Invalid protocol`

JS Modernization

- Private class fields
  - replaced all `Symbol()`-keyed instance properties with ES2022 private class fields (`#field`) across every class
  - prefixed accessors for subclass and internal use, plus `_initFromPacket()` for `decode.js`
  - `StunRequest`: uses `StunMessage` protected accessors vs shared `Symbol.for()`
- the long-standing `Symbol.for('kTransctionId')` typo (missing 'a') is gone.
- Modern Array and Buffer APIs
  - `Array.prototype.toSpliced()` in `removeAttribute()`
  - `Buffer.subarray()` replaces deprecated `.slice()`
  - minimum Node.js version bumped to **20.0**
- Async/Await (`net/request.js`)
  - `request()` is now a native `async function`
  - internal retry logic is isolated in `sendWithRetry()`
  - `try/finally` guarantees internally-created servers are always closed
  - `2 ** retries` exponentiation replaces the old bit-shift (`<< retries`)
- test coverage for all fixed bugs:
  - Error code decode formula (`errorClass * 100 + code`)
  - `decode()` rejects buffers shorter than 20 bytes or longer than 65535 bytes
  - `addUsername` 512/513-byte boundary (off-by-one)
  - `addPriority` rejects negative values; accepts `0xffffffff`
  - `getFingerprint()` and `getPriority()` return actual values from decoded messages
  - All callback-style network tests converted to `async`/`await`
- Modern JS idioms
  - index — constants export rewritten using `Object.fromEntries & assign` + a small `prefix()` helper, replacing five `Object.keys().forEach()` mutation loops
  - `util` — removed redundant `!Number.isNaN(m)` from `isNumber()`
  - `create-message` — `||` → `transaction ?? createTransaction()` (nullish coalescing)

### [3.1.2] - 2026-04-07

- fix(stun-error-code-attribute) — fix errorClass \* 100 + code
- fix(response) — fix getFingerprint() and getPriority()
- fix(validate) — Buffer.from(...subarray(...)) + timingSafeEqual
- fix(stun-xor-address-attribute) — fix xor() with ?? and Buffer.alloc
- fix(request) — addPriority uint32 check, addUsername off-by-one, 2 \*\* retries
- fix(dgram-server) — strengthen isStun with magic cookie check
- fix(decode) — add length guard

### [3.1.1] - 2026-04-07

- ci: tighten permissions for codeql #12
- dep(ipaddr.js): bump to 2.3.0
- doc(CONTRIBUTORS.md): added
- prettier: formatting

### [3.1.0] - 2026-04-07

- dep(debug): → process.env.DEBUG-conditional logger
- dep(minimist): → manual argv loop
- dep(buffer-xor): → 3-line inline XOR loop
- dep(is-stun): → 1-line inline arrow function
- dep(universalify: → util.promisify
- dep(eslint): upgrade to v10
- dep(jest): use node:test for test runner
- ci: updates
- p.json: added test:coverage script

### [3.0.2] - 2024-11-13

- dep: replace ip dependency with ipaddr.js

### [3.0.1] - 2024-04-02

- dep(ip): bump 2.0.0 to 2.0.1
- configure eslint & prettier the modern way
  - jettison `@nodertc/eslint-config`, much of local config was turning off stuff imported from there
- ci: bump GHA versions
- test: remove eslint from devDependencies (installed by GHA for tests, npx will use local version)
- test: remove jest from devDependencies
  - installed by npx when needed
  - shrinks package-lock.json from 229KB to 5.7KB
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

[3.1.0]: https://github.com/msimerson/stun/releases/tag/3.1.0
[3.1.1]: https://github.com/msimerson/stun/releases/tag/v3.1.1
[2.1.16]: https://github.com/msimerson/stun/releases/tag/2.1.16
[1.0.0]: https://github.com/msimerson/stun/releases/tag/v1.0.0
[1.0.1]: https://github.com/msimerson/stun/releases/tag/v1.0.1
[1.0.2]: https://github.com/msimerson/stun/releases/tag/v1.0.2
[1.1.0]: https://github.com/msimerson/stun/releases/tag/v1.1.0
[1.2.0]: https://github.com/msimerson/stun/releases/tag/v1.2.0
[1.2.1]: https://github.com/msimerson/stun/releases/tag/v1.2.1
[1.3.0]: https://github.com/msimerson/stun/releases/tag/v1.3.0
[1.3.1]: https://github.com/msimerson/stun/releases/tag/v1.3.1
[2.0.0]: https://github.com/msimerson/stun/releases/tag/v2.0.0
[2.1.0]: https://github.com/msimerson/stun/releases/tag/v2.1.0
[3.0.0]: https://github.com/msimerson/stun/releases/tag/v3.0.0
[3.0.1]: https://github.com/msimerson/stun/releases/tag/v3.0.1
[3.0.2]: https://github.com/msimerson/stun/releases/tag/v3.0.2
[3.1.2]: https://github.com/msimerson/stun/releases/tag/v3.1.2
[3.2.0]: https://github.com/msimerson/stun/releases/tag/v3.2.0
