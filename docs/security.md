# Security Model

## Security objectives

The protocol is designed to resist:

- payload tampering;
- fake issuer impersonation;
- stolen export files;
- stale backup restoration;
- authorization-code replay;
- access-token replay;
- import-state replay;
- cross-client authorization reuse;
- cross-account authorization reuse;
- server-side request redirection to unrelated hosts.

## Threat: edited JSON

**Defense:** the canonical payload is signed using Ed25519. Editing any signed field invalidates the signature.

A SHA-256 hash alone is not an authenticity mechanism because an attacker can edit the JSON and calculate a new hash.

## Threat: fake issuer

**Defense:** trust is explicit.

A valid signature only proves control of a key. Destinations maintain an allowlist of issuer identities they economically trust.

## Threat: stolen export

**Defense:** the source authorization endpoint requires the authenticated source account to equal the export `subject.id`.

The attacker can possess the file without being able to authorize it.

## Threat: old backup

**Defense:** after authorization, the source rebuilds and signs a new live collection from its current database.

The uploaded snapshot is never promoted directly to current ownership.

## Threat: replay

**Defense:** import state, authorization codes and live bearer tokens are random, short-lived and single-use.

A production store should implement atomic consume semantics. The reference Redis store uses `GETDEL`.

## Threat: authorization reused for another account

**Defense:** the signed authorization contains both:

- `audience` — exact destination issuer;
- `destinationAccount` — exact destination account identifier.

Both are verified before accepting the live collection.

## Threat: SSRF through issuer metadata

**Defense:**

- issuer must be trusted before outbound discovery;
- redirects are disabled;
- token and collection endpoints must remain on the issuer origin;
- responses have size and timeout limits;
- production endpoints use HTTPS.

Partners with stricter infrastructure can additionally resolve and filter private/link-local IP ranges before outbound requests.

## Key management

Recommended:

- one Ed25519 key per issuer environment;
- store private keys in a secret manager;
- publish public JWKs only;
- assign a deterministic `keyId`;
- retain old public keys during a documented rotation window;
- never reuse staging keys in production.

## Operational controls

Production deployments should add:

- endpoint rate limits;
- audit logs for partner authorizations;
- metrics for failed signature and trust checks;
- secret rotation procedure;
- alerts for issuer document or key changes;
- dependency and container vulnerability scanning.

See `SECURITY.md` for the minimum checklist.
