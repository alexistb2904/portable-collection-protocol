# Security policy

The portable collection format follows one rule:

> A signed export is evidence of what an issuer stated at a point in time. It is not, by itself, authorization to create current ownership somewhere else.

Production integrations must implement both layers:

1. **Ed25519 signed collection exports** for integrity and issuer authenticity.
2. **WIKICARD-AUTH-CODE-1 live authorization** for source-account control, freshness, audience binding and replay resistance.

## Mandatory production controls

- Keep issuer signing keys outside source control.
- Use HTTPS for issuer, authorization, token and live collection endpoints.
- Maintain explicit allowlists for trusted issuers and trusted destination clients.
- Validate exact redirect URIs. Never use wildcard redirects.
- Use PKCE S256.
- Make authorization codes, import state and live access tokens short-lived and single-use.
- Bind signed import authorization to the exact destination account.
- Reject stale live collections.
- Reject issuer redirects during server-to-server discovery and token calls.
- Apply body-size, timeout and rate limits.
- Never interpret “cryptographically valid” as “economically trusted”.

## Security contact

- Discord: **alexistb2904**
- Email: **wikicard@alexistb.com**

Do not include private signing keys, session cookies or production access tokens in public bug reports.
