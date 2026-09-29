# Troubleshooting

## “Untrusted collection issuer”

The signature may be valid, but the issuer is not in the destination allowlist.

This is expected until a partner has been reviewed.

## “Issuer discovery identity mismatch”

The `issuer` field returned by `/.well-known/wikicard-issuer.json` does not exactly match the signed issuer URI after trailing-slash normalization.

## “Signing key not found”

The export references a `proof.keyId` that is no longer published.

During key rotation, keep old public keys available for the acceptance window you support.

## “Authenticated source account does not match export subject”

The person logged into the source site is not the account named in the imported file.

This is the protection against stolen exports.

## “PKCE verification failed”

The authorization code is being exchanged by a flow that does not possess the original verifier, or the verifier was corrupted.

The code should be considered consumed.

## “Import state is invalid, expired or already used”

The callback took too long, was replayed or reached a different server using non-shared ephemeral storage.

In multi-instance deployments, use shared Redis.

## “Live collection is stale”

The source did not generate a new collection close enough to the authorization time.

Build the collection after consuming the one-time live token.

## Partner endpoint rejected because of origin

Token and live collection endpoints must remain on the approved issuer origin. This is intentional SSRF hardening.

## Need help?

Contact **alexistb2904** on Discord or **wikicard@alexistb.com** with:

- issuer URI;
- protocol version;
- failing endpoint;
- HTTP status;
- sanitized error message;
- no private keys or access tokens.
