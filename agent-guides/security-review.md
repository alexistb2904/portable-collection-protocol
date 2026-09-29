# Agent Final Security Review

Before marking an integration complete, verify each item against actual code.

## Key material

- private key is read only from secret configuration;
- public issuer document exposes only public JWK material;
- no private key appears in logs/tests/fixtures.

## Trust

- issuer allowlist defaults empty;
- client allowlist defaults empty;
- trust is checked before outbound discovery.

## Redirects and origins

- callback URI is exact;
- no wildcard redirects;
- discovery/token/live HTTP clients do not follow redirects;
- token/live endpoints stay on the trusted issuer origin;
- production uses HTTPS.

## User binding

- source session account must equal signed `subject_id`;
- signed authorization includes exact destination account;
- destination checks that exact value.

## Freshness

- uploaded backup never becomes current ownership;
- fresh collection is generated after authorization;
- live snapshot age is enforced;
- authorization expiry is enforced.

## Replay

- import state is one-time;
- authorization code is one-time;
- access token is one-time;
- consumption is atomic in shared storage.

## Web security

- authorization preview validates client before UI displays it;
- consent is explicit;
- existing CSRF protections are preserved on browser-authenticated POSTs;
- token endpoint does not depend on browser session;
- sensitive responses use no-store.

## Data model

- card instance IDs remain stable across exports;
- external card identity is scoped by source issuer;
- game-specific data stays namespaced;
- destination does not duplicate ownership just because a backup is valid.

## Operations

- rate limits exist;
- failures are observable;
- logs are sanitized;
- migrations exist;
- tests cover negative security cases;
- configuration and reverse-proxy URLs are documented.
