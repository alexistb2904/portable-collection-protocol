# FAQ

## Is this an NFT or blockchain protocol?

No. The protocol is based on HTTPS, JSON and Ed25519 signatures. A blockchain can be added as an ownership provider in the future, but it is not required by the wire format.

## Does a valid signed file prove current ownership?

No. It proves that an issuer signed that snapshot at `issuedAt`.

Current ownership requires the live `WIKICARD-AUTH-CODE-1` flow.

## Why not just hash the JSON?

Because anyone who edits a file can calculate a new hash. A signature uses an issuer-controlled private key, so an attacker cannot produce a new authentic proof after editing the payload.

## What happens if someone steals another player's export?

The file can still pass signature verification. The live flow then redirects the browser to the source issuer, where the authenticated source account must match the signed `subject.id`.

Without access to the source account, the attacker cannot complete current-ownership authorization.

## What happens with an old backup?

The backup identifies the source account and original snapshot, but current ownership is rebuilt from the source database after authorization.

Cards sold, recycled, revoked or removed after the backup are therefore absent from the live collection.

## Why use Wikidata?

Wikipedia titles are language-dependent and can change. Wikidata QIDs are better cross-site conceptual identifiers.

A French export can identify `wikidata:Q937`, while an English destination displays its own localized Albert Einstein metadata.

## Do all games need the same stats and rarity?

No. Portable identity is separate from game rules.

Each application can place its own data under a namespaced `extensions` key or compute local stats entirely independently.

## Can one source collection be used in multiple games?

Yes, if each destination chooses to trust and support that issuer.

The source remains authoritative for source ownership unless a separate transfer/minting model is explicitly defined.

## Does this protocol move a card out of the source game?

Not by default. Version 1 links and verifies external ownership. It does not define destructive cross-service transfer semantics.

A future transfer profile could add that behavior without treating a backup file as a transfer request.

## Can any website become an issuer?

Technically any site can implement signatures. That does not mean destinations must trust it.

Each destination controls an explicit issuer allowlist and its own economy.

## What if the source issuer is offline?

Historical signed exports can still be cryptographically verified if the required public key is available, but fresh ownership authorization cannot complete while the authoritative issuer is unavailable.

Destinations should decide how long previously verified external links remain usable during an outage.

## Does an integrator need TypeScript?

No. The TypeScript packages are reference implementations.

The protocol can be implemented in any environment that supports JSON, SHA-256, Ed25519 and HTTPS.

## Why is the destination account inside the signed authorization?

To prevent a valid authorization created for one account on a destination service from being reused for another account on that same service.

## Can users edit presentation fields such as the title or image?

Not without invalidating the issuer signature. Destinations can independently localize or refresh presentation metadata using `canonicalId`, but the uploaded signed snapshot itself must remain unchanged.

## How do I request an integration review?

Contact **alexistb2904** on Discord or **wikicard@alexistb.com**.
