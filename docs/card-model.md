# Portable Card Model

A portable card separates the **owned instance** from the **concept represented by the card**.

## Core identity fields

- `id` — globally usable representation of the portable card instance. Reference exports use `urn:uuid:<instanceId>`.
- `instanceId` — stable immutable identifier of the specific owned copy inside the issuer.
- `serialNumber` — issuer-facing serial represented as a decimal string to avoid large-integer precision loss.
- `mintedAt` — RFC 3339 timestamp for creation of that source instance.

A destination tracking externally authoritative instances should key them by at least `(sourceIssuer, instanceId)`. An instance ID from one issuer must not be assumed globally unique across unrelated issuers without the issuer namespace.

## Concept identity

`definition.id` is the issuer-local definition identifier.

`definition.canonicalId` is the preferred cross-site identity.

When Wikidata is known:

    wikidata:Q937

When no QID exists:

    wikipedia:<language>:<pageId>

Examples:

    wikipedia:fr:123456
    wikipedia:en:736

`definition.wikidataId` stores the raw QID when available. Wikidata is preferred because the same entity can be rendered using localized labels and sitelinks on another service without changing card identity.

## Source and presentation

`definition.source` is the signed Wikipedia source snapshot used by the issuer when the export was created.

`definition.presentation` is convenience display data. A destination may render it immediately or localize/refresh it using `canonicalId`.

Do not use title, description or image URL as identity fields.

## Extensions

`extensions` contains namespaced application-specific metadata.

Examples:

    org.wikicard.game.v1
    com.example.rpg.v3
    io.example.market.v1

Rules:

- use a namespace you control;
- version the namespace when semantics break;
- consumers must ignore unknown namespaces;
- generic ownership and identity must not depend on a private extension;
- do not overwrite another application's namespace.

## Recommended destination model

A destination that does not clone ownership can store:

    ExternalCardReference
      sourceIssuer
      sourceSubjectId
      sourceInstanceId
      canonicalId
      lastVerifiedAt

If the destination needs gameplay state, keep that state separately:

    LocalGameCardState
      externalCardReferenceId
      xp
      selectedSkin
      localBattleStats

This keeps portable identity independent from one game's balancing rules.

## Example object

```json
{
  "id": "urn:uuid:cd010935-0063-4eaf-bca9-4d2b4ef59e66",
  "instanceId": "cd010935-0063-4eaf-bca9-4d2b4ef59e66",
  "serialNumber": "42",
  "mintedAt": "2026-09-29T12:00:00.000Z",
  "definition": {
    "id": "21d59ef3-4805-49c0-b8ba-f9a81799a995",
    "canonicalId": "wikidata:Q937",
    "wikidataId": "Q937",
    "source": {
      "provider": "wikipedia",
      "language": "en",
      "pageId": "736",
      "url": "https://en.wikipedia.org/wiki/Albert_Einstein"
    },
    "presentation": {
      "title": "Albert Einstein",
      "description": "German-born theoretical physicist",
      "imageUrl": null
    }
  },
  "extensions": {
    "org.wikicard.game.v1": { "rarity": "LEGENDARY" }
  }
}
```
