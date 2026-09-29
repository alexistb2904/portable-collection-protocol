# Partner Onboarding

Adding a partner is a trust decision, not just a technical integration.

## Information a partner should provide

- public issuer URI;
- production authorization URL;
- production token and live collection endpoints;
- security contact;
- signing-key storage and rotation policy;
- stable subject-ID format;
- ownership semantics;
- mint/distribution rules;
- account recovery policy;
- rate-limit expectations;
- test/staging issuer.

## Review checklist

Before adding a source to `PORTABLE_COLLECTION_TRUSTED_ISSUERS`:

- [ ] HTTPS everywhere.
- [ ] Issuer discovery identity matches the reviewed URI.
- [ ] Ed25519 key is published correctly.
- [ ] Redirects are not required for server-to-server endpoints.
- [ ] Authorization uses PKCE S256.
- [ ] Source verifies the authenticated account against `subject_id`.
- [ ] Source returns a fresh database-backed collection.
- [ ] Authorization binds `audience` and `destinationAccount`.
- [ ] Replay protections are atomic.
- [ ] Partner has a documented incident contact.
- [ ] Card issuance rules are acceptable for the destination economy.

Before adding a destination to `PORTABLE_COLLECTION_TRUSTED_CLIENTS`:

- [ ] Exact client issuer URI reviewed.
- [ ] Exact callback convention supported.
- [ ] Destination explains how it stores linked ownership.
- [ ] Destination does not request source passwords.
- [ ] Destination does not misrepresent snapshot files as permanent ownership.

## Staging first

Use separate staging issuers and keys. Never allow a test issuer to mint or authorize production assets.

## Contact

For WikiCard partner onboarding:

- Discord: **alexistb2904**
- Email: **wikicard@alexistb.com**
