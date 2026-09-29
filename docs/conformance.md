# Conformance Checklist

Use this checklist before calling an implementation compatible with protocol v1.

## Export conformance

- [ ] `payload.format` is exactly `org.wikicard.collection`.
- [ ] `payload.version` is exactly `1.0.0`.
- [ ] Every exported instance has a stable `instanceId`.
- [ ] Large integer identifiers are encoded as decimal strings.
- [ ] Wikidata QID is used when available.
- [ ] Fallback canonical IDs use `wikipedia:<language>:<pageId>`.
- [ ] Game-specific fields are namespaced under `extensions`.
- [ ] Payload uses `WIKICARD-C14N-JSON-1`.
- [ ] Signature algorithm is Ed25519.
- [ ] Private key is never exposed.
- [ ] Issuer public key discovery is available.

## Source authorization conformance

- [ ] Unknown destination clients are denied.
- [ ] Redirect URI is exact.
- [ ] PKCE method is S256.
- [ ] Authenticated source account equals `subject_id`.
- [ ] Destination account belongs to the destination client namespace.
- [ ] User sees an explicit consent screen.
- [ ] Authorization code is random, short-lived and atomically single-use.
- [ ] Token exchange validates PKCE.
- [ ] Live access token is random, short-lived and single-use.
- [ ] Live collection is rebuilt from authoritative current data.
- [ ] Signed authorization binds issuer, subject, audience, destination account, original export hash, live collection hash and expiry.

## Destination conformance

- [ ] Upload body size is limited.
- [ ] JSON/schema validation happens before use.
- [ ] Issuer is checked against an explicit trust policy.
- [ ] Unknown issuer is rejected before outbound network access.
- [ ] Discovery redirects are disabled.
- [ ] Discovery response size and timeout are limited.
- [ ] Server-to-server endpoints stay on the trusted issuer origin.
- [ ] Uploaded export signature is verified.
- [ ] Import state is random, short-lived and single-use.
- [ ] Fresh live collection signature is verified.
- [ ] Live subject matches uploaded subject.
- [ ] Signed authorization is verified.
- [ ] Authorization audience matches destination issuer.
- [ ] Authorization destination account matches the exact authenticated destination account.
- [ ] Original and live hashes match their corresponding signed objects.
- [ ] Authorization expiry is checked.
- [ ] Live collection freshness is checked.
- [ ] Uploaded backup is not directly converted into current local ownership.

## Operations

- [ ] HTTPS is enforced in production.
- [ ] Signing keys come from secrets management.
- [ ] Key rotation procedure exists.
- [ ] Redis/shared protocol state is available to all replicas.
- [ ] Sensitive responses use `Cache-Control: no-store`.
- [ ] Authorization/token endpoints have rate limits.
- [ ] Security-relevant failures are logged without secrets.
- [ ] Partner onboarding has a human trust-review step.
