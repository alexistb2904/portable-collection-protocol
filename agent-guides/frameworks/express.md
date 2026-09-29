# Agent Guide — Express

Reference: `examples/node-express/`.

## Where to integrate

Prefer an Express Router/module rather than putting protocol logic directly in the main server file.

Suggested structure:

```text
src/protocol/
  router.ts
  service.ts
  collection-source.ts
  external-link.repository.ts
```

## Existing auth

Replace the demo header helper with the project's normal middleware:

```ts
router.post("/collection-transfer/authorize", requireUser, async (req, res) => {
  const result = await authorizationServer.authorize(req.user.id, req.body);
  res.json(result);
});
```

## Body limits

Apply a strict JSON body limit to import routes.

Do not globally raise the whole application's body limit if only collection import needs it.

## Errors

Forward SDK errors to the project's normal error middleware.

Never return internal Redis keys or cryptographic secrets.

## CSRF

If browser session cookies are used, preserve the application's CSRF middleware on consent/authorization actions.

The server-to-server token endpoint should use its protocol bindings rather than browser CSRF state.
