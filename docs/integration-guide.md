# Integration Guide

The protocol is designed to fit around an existing application rather than replace its authentication or database.

## What your application must provide

An issuer integration needs only two application-specific operations:

```ts
interface CollectionSourceAdapter {
  subjectIdForUser(userId: string): string;
  buildCurrentCollection(userId: string): Promise<CollectionPayload>;
}
```

Your existing authentication system still decides who `userId` is.

A destination integration needs:

- its authenticated destination user ID;
- an explicit set of trusted issuers;
- a place to persist the verified external collection relationship.

## Recommended subject identifiers

Use an issuer-scoped stable ID:

```text
https://cards.example.com/api:user:550e8400-e29b-41d4-a716-446655440000
```

Do not use username or email as the stable subject identifier.

## Issuer-side endpoints

Implement:

```text
GET  /.well-known/wikicard-issuer.json
GET  /collection/export

POST /collection-transfer/authorize/preview
POST /collection-transfer/authorize
POST /collection-transfer/token
GET  /collection-transfer/current
```

The browser-facing authorization page belongs to your normal website and should use the same login/session system as the rest of the site.

### Authentication adapter

Do not invent a second password system for the protocol.

For example, in Fastify:

```ts
app.post("/collection-transfer/authorize", async (request) => {
  const user = await requireYourExistingUser(request);

  return authorizationServer.authorize(user.id, request.body);
});
```

### Collection adapter

Map your internal data to protocol data at export time:

```ts
const source: CollectionSourceAdapter = {
  subjectIdForUser(userId) {
    return `${ISSUER}:user:${userId}`;
  },

  async buildCurrentCollection(userId) {
    const cards = await db.cards.findOwnedBy(userId);

    return {
      format: "org.wikicard.collection",
      version: "1.0.0",
      exportId: crypto.randomUUID(),
      issuer: { id: ISSUER, name: "Example Game" },
      subject: {
        id: `${ISSUER}:user:${userId}`,
        username: await displayName(userId)
      },
      issuedAt: new Date().toISOString(),
      collection: {
        count: cards.length,
        cards: cards.map(toPortableCard)
      }
    };
  }
};
```

## Destination-side flow

When a user uploads an export:

```ts
const started = await importer.start(
  currentUser.id,
  `${DESTINATION_ISSUER}:user:${currentUser.id}`,
  uploadedJson
);

return redirect(started.authorizationUrl);
```

After the source redirects back:

```ts
const verified = await importer.complete(code, state);

await db.externalCollections.upsert({
  destinationUserId: currentUser.id,
  issuer: verified.issuer,
  subjectId: verified.subjectId,
  liveCollectionHash: verified.liveCollectionHash,
  verifiedAt: verified.verifiedAt
});
```

The destination should use `verified.liveCollection`, not the originally uploaded file, for current ownership.

## What not to do

Do **not**:

- create local cards immediately after a file signature verifies;
- accept every issuer with a valid Ed25519 key;
- accept wildcard redirect URIs;
- accept token or live collection endpoints hosted on unrelated origins;
- treat an old `issuedAt` as current ownership;
- use usernames as cross-site ownership identity;
- expose private signing keys through your issuer document.

## Non-Node implementations

You do not need the reference packages. Follow the wire format and algorithms in [Protocol](/protocol), validate against the JSON Schemas and use the OpenAPI contract in `spec/openapi.yaml`.
