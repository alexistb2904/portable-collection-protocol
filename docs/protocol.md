# Protocol Specification

This document is the normative human-readable reference for protocol version 1.0.0.

Machine-readable companions:

- `../spec/collection-export.schema.json`
- `../spec/issuer-document.schema.json`
- `../spec/import-authorization.schema.json`
- `../spec/openapi.yaml`

## 1. Collection export envelope

A portable collection is:

```json
{
  "payload": {
    "format": "org.wikicard.collection",
    "version": "1.0.0",
    "exportId": "uuid",
    "issuer": {
      "id": "https://source.example/api",
      "name": "Source Game"
    },
    "subject": {
      "id": "https://source.example/api:user:stable-id",
      "username": "alice"
    },
    "issuedAt": "2026-09-29T12:00:00.000Z",
    "collection": {
      "count": 1,
      "cards": []
    }
  },
  "proof": {
    "type": "Ed25519Signature",
    "algorithm": "Ed25519",
    "canonicalization": "WIKICARD-C14N-JSON-1",
    "keyId": "ed25519-sha256-...",
    "payloadHash": "...",
    "signature": "..."
  }
}
```

All proof binary values are base64url without padding.

## 2. Canonical JSON

`WIKICARD-C14N-JSON-1` applies to the signed `payload`.

Rules:

1. UTF-8.
2. Object keys sorted lexicographically using JavaScript/Unicode UTF-16 code-unit ordering.
3. No insignificant whitespace.
4. Strings encoded as JSON strings.
5. Finite numbers encoded as JSON numbers.
6. Array order preserved.
7. `null`, booleans, arrays and objects use normal JSON literals.
8. `undefined`, functions, symbols, BigInt and non-finite numbers are invalid.

Collection signature input:

```text
WikiCard Collection Export v1\n<canonical-payload>
```

Import authorization signature input:

```text
WikiCard Collection Import Authorization v1\n<canonical-authorization-payload>
```

The newline is part of each prefix.

## 3. Public key identifier

Ed25519 public keys are represented as public JWK:

```json
{
  "kty": "OKP",
  "crv": "Ed25519",
  "x": "..."
}
```

The key ID is:

```text
ed25519-sha256-<base64url(SHA-256(canonical-json({
  "crv": "Ed25519",
  "kty": "OKP",
  "x": "..."
})))>
```

## 4. Card identity

Each card instance has two identities:

- `instanceId` — immutable issuer-specific copy/instance ID.
- `definition.canonicalId` — cross-site conceptual identity.

Preferred canonical identity:

```text
wikidata:Q937
```

Fallback when no Wikidata QID exists:

```text
wikipedia:fr:736
```

A destination should preserve `instanceId` when tracking the same externally authoritative instance and use `canonicalId` to match the represented concept across languages.

## 5. Extensions

Game-specific data belongs in namespaced extensions:

```json
{
  "extensions": {
    "org.wikicard.game.v1": {
      "rarity": "LEGENDARY",
      "attack": 90,
      "defense": 80
    },
    "com.example.other-game.v2": {
      "element": "science"
    }
  }
}
```

Consumers must ignore extension namespaces they do not understand.

Cross-service identity must never depend on a private extension.

## 6. Issuer discovery

Every issuer serves:

```text
GET <issuer>/.well-known/wikicard-issuer.json
```

Example:

```json
{
  "issuer": "https://source.example/api",
  "protocol": "org.wikicard.collection",
  "version": "1.0.0",
  "keys": [
    {
      "id": "ed25519-sha256-...",
      "use": "sig",
      "alg": "EdDSA",
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "..."
    }
  ],
  "authorization": {
    "protocol": "WIKICARD-AUTH-CODE-1",
    "authorizationEndpoint": "https://source.example/collection/authorize",
    "tokenEndpoint": "https://source.example/api/collection-transfer/token",
    "collectionEndpoint": "https://source.example/api/collection-transfer/current",
    "codeChallengeMethods": ["S256"]
  }
}
```

A destination must verify that the returned `issuer` matches the trusted issuer it intended to contact.

## 7. Trust

Signature validity and issuer trust are separate decisions.

A destination must evaluate trust **before** contacting arbitrary URLs from an uploaded file.

Recommended order:

1. parse only enough to identify `payload.issuer.id`;
2. normalize trailing slash;
3. verify issuer is explicitly trusted;
4. fetch discovery document;
5. verify discovery identity;
6. verify signature.

## 8. WIKICARD-AUTH-CODE-1

The live authorization layer is required when a destination wants current ownership rather than historical snapshot evidence.

### 8.1 Destination starts import

Destination generates:

- `state`: at least 256 random bits;
- `code_verifier`: high-entropy PKCE verifier;
- `code_challenge = base64url(SHA-256(code_verifier))`.

It stores the import state server-side and redirects the browser to `authorizationEndpoint`.

Required query parameters:

```text
client_id
redirect_uri
response_type=code
scope=collection:read
state
code_challenge
code_challenge_method=S256
subject_id
destination_account
export_hash
```

### 8.2 Source validates user and client

The source must verify:

- `client_id` is trusted;
- exact `redirect_uri`;
- HTTPS in production;
- `destination_account` belongs to the client namespace;
- the authenticated source account equals `subject_id`;
- the user explicitly consents.

The source returns a short-lived random one-time code.

### 8.3 Code exchange

Destination sends:

```json
{
  "grant_type": "authorization_code",
  "code": "...",
  "client_id": "https://destination.example/api",
  "redirect_uri": "https://destination.example/api/collection-transfer/callback",
  "code_verifier": "..."
}
```

The source atomically consumes the code and verifies PKCE.

It returns a short-lived, one-time opaque bearer token.

### 8.4 Live collection

The destination consumes the token:

```http
GET /collection-transfer/current
Authorization: Bearer <opaque-token>
```

The source builds a fresh collection from current authoritative data and signs it.

It also signs an import authorization:

```json
{
  "format": "org.wikicard.collection-import-authorization",
  "version": "1.0.0",
  "authorizationId": "uuid",
  "issuer": "https://source.example/api",
  "subjectId": "https://source.example/api:user:...",
  "audience": "https://destination.example/api",
  "destinationAccount": "https://destination.example/api:user:...",
  "requestedExportHash": "<hash from uploaded export>",
  "liveCollectionHash": "<hash from fresh collection>",
  "issuedAt": "...",
  "expiresAt": "..."
}
```

## 9. Destination acceptance rules

Before accepting a verified external collection relationship, destination must check:

1. source issuer is trusted;
2. uploaded export signature is valid;
3. live collection signature is valid;
4. source issuer matches across upload, discovery, authorization and live collection;
5. live subject matches uploaded subject;
6. authorization signature is valid;
7. `audience` equals destination issuer;
8. `destinationAccount` equals the exact local account that started the import;
9. `requestedExportHash` equals the uploaded snapshot hash;
10. `liveCollectionHash` equals the fresh signed collection hash;
11. authorization has not expired;
12. live collection satisfies destination freshness policy;
13. local import state was atomically consumed exactly once.

## 10. Persistence semantics

The protocol proves a relationship to an authoritative external collection.

It does **not** require destinations to clone or mint local ownership records.

Recommended persistence:

```text
destinationUserId
sourceIssuer
sourceSubjectId
lastVerifiedAt
sourceIssuedAt
liveCollectionHash
cardCount
```

Applications may cache card metadata for display, but should preserve which service remains authoritative for ownership.

## 11. Versioning

Breaking wire-format changes require a new format/protocol version.

Consumers should reject unsupported versions explicitly rather than guessing compatibility.

New optional issuer-document fields and unknown extension namespaces may be ignored unless a future version states otherwise.
