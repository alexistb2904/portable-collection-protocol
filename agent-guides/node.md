# Node.js Agent Guide

Use the TypeScript packages:

- `@wikicard/portable-collection-core`
- `@wikicard/portable-collection-server`

## Preferred architecture

Keep four boundaries:

```text
HTTP framework
    ↓
existing authentication
    ↓
protocol service
    ↓
application adapters / database
```

The framework should only translate HTTP requests and responses.

## Source adapter

Implement:

```ts
interface CollectionSourceAdapter {
  subjectIdForUser(userId: string): string;
  buildCurrentCollection(userId: string): Promise<CollectionPayload>;
}
```

Do not place ORM code inside protocol crypto helpers.

## Shared protocol state

Production should use `RedisProtocolStore`.

Memory storage is acceptable only for local tests.

## Issuer routes

Map:

- issuer discovery;
- signed collection export;
- authorization preview;
- authorization consent action;
- token exchange;
- live collection endpoint.

## Destination routes

Map:

- upload/import start;
- callback;
- linked collection listing/unlinking.

## Error handling

Use the project's normal error mapping.

Do not leak:

- access tokens;
- authorization codes;
- private signing key values;
- full session cookies.

## Tests

At minimum test:

- tampering;
- wrong issuer key;
- untrusted issuer;
- untrusted client;
- source user mismatch;
- wrong PKCE verifier;
- code replay;
- token replay;
- state replay;
- destination-account mismatch.
