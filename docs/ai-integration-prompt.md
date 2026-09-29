# AI Integration Prompt

Copy the prompt below into a code agent that has access to the target application's repository.

---

## Prompt

You are integrating the **WikiCard Portable Collection Protocol v1** into an existing application.

The protocol documentation and reference implementation are available in the `portable-collection-protocol` directory. Read root `AGENTS.md` first. Detect the host framework using `docs/agents/framework-selection.md`, then read the matching Node/Python guide and the local `AGENT.md` inside the closest framework example.

Read these files before editing code:

- `README.md`
- `docs/quick-start.md`
- `docs/integration-guide.md`
- `docs/protocol.md`
- `docs/security.md`
- `spec/openapi.yaml`
- `spec/collection-export.schema.json`
- `spec/issuer-document.schema.json`
- `spec/import-authorization.schema.json`
- `agent-guides/00-audit-first.md`
- the matching `agent-guides/frameworks/<framework>.md` file

### Goal

Integrate this application as:

**ROLE:** `[ISSUER | DESTINATION | BOTH]`

Public production API issuer URI:

```text
[INSERT_ISSUER_URI]
```

The existing application authentication system is:

```text
[DESCRIBE_AUTH_SYSTEM_OR_LET_AGENT_DISCOVER_IT]
```

The collection/card ownership source is:

```text
[DESCRIBE_DATABASE_MODELS_OR_LET_AGENT_DISCOVER_THEM]
```

### Non-negotiable security rules

Do not weaken or remove these requirements:

1. Use Ed25519 for export and authorization signatures.
2. Follow `WIKICARD-C14N-JSON-1` exactly.
3. Never trust a collection file as proof of current ownership.
4. Check issuer allowlists before making outbound requests.
5. Unknown issuers and clients must be denied by default.
6. Use exact redirect URIs. No wildcard callbacks.
7. Use authorization code + PKCE S256.
8. Authorization codes, live access tokens and import state must be cryptographically random, short-lived and atomically single-use.
9. The source must compare the authenticated source account with the signed `subject_id`.
10. After authorization, rebuild the collection from the source database. Do not reuse the uploaded backup as current ownership.
11. The signed import authorization must bind:
    - source issuer;
    - source subject;
    - destination issuer/audience;
    - exact destination account;
    - original uploaded export hash;
    - fresh live collection hash;
    - issue and expiry times.
12. Token and live collection endpoints discovered from an issuer must stay on the reviewed issuer origin.
13. Production endpoints must use HTTPS.
14. Private signing keys must come from a secret manager/environment and must never be committed or returned by public APIs.
15. Sensitive token/code responses must use `Cache-Control: no-store`.
16. Preserve the host application's existing authentication. Do not create a second password system for this protocol.

### Issuer requirements

If ROLE includes ISSUER:

- add `GET /.well-known/wikicard-issuer.json`;
- add authenticated signed collection export;
- map cards to the portable v1 schema;
- prefer Wikidata QID for `canonicalId`;
- place game-specific data in a unique extension namespace;
- add browser consent UI;
- add authorization preview endpoint;
- add authorization-code endpoint;
- add PKCE token exchange endpoint;
- add one-time live collection endpoint;
- require explicit trusted destination clients;
- support key rotation by publishing old public keys during the accepted verification window.

### Destination requirements

If ROLE includes DESTINATION:

- accept JSON uploads with strict size limits;
- validate schema;
- identify issuer;
- reject if issuer is not explicitly trusted;
- fetch and validate issuer discovery;
- verify the uploaded signature;
- initiate live authorization;
- bind the flow to the exact authenticated destination account;
- exchange code using PKCE;
- retrieve and verify the fresh collection + signed authorization;
- enforce freshness;
- persist a verified external-collection link;
- do not mint or clone local ownership just because a backup was uploaded;
- provide UI to display and revoke/unlink external collection relationships.

### Framework selection

Do not migrate the host application to another framework just to match an example.

Reference mapping:

- Fastify → `examples/fastify`
- Express → `examples/node-express`
- NestJS → `examples/node-nestjs`
- FastAPI → `examples/python-fastapi`
- Flask → `examples/python-flask`
- Django → `examples/python-django`

For Node use the shared TypeScript protocol packages. For Python use `python-sdk`. Do not copy cryptographic logic into controllers/routes.

### Engineering requirements

- Reuse existing project conventions and frameworks.
- Keep protocol-specific code in a clearly isolated module/package.
- Add typed validation at all trust boundaries.
- Add rate limits to authorization and token endpoints.
- Add tests for:
  - edited signed payload;
  - wrong signing key;
  - unknown issuer;
  - unknown destination client;
  - source-account mismatch;
  - wrong PKCE verifier;
  - code replay;
  - token replay;
  - import-state replay;
  - destination-account mismatch;
  - stale live collection;
  - endpoint-origin mismatch.
- Add deployment environment variables to the example environment file.
- Document exact production URLs and reverse-proxy assumptions.
- Do not silently enable any external partner in production.

### Deliverables

1. implementation;
2. database migration if persistence is needed;
3. tests;
4. environment/configuration documentation;
5. integration README;
6. concise security review listing assumptions and remaining risks.

Before finishing, compare the implementation against `docs/security.md` and the machine-readable schemas. Report any protocol requirement that the host application's current architecture cannot satisfy rather than bypassing it.

---

## Suggested first instruction to the agent

After pasting the prompt, add:

> First audit the existing authentication, card ownership models, API routing, Redis/session infrastructure and deployment configuration. Then implement the protocol using the project's existing patterns. Do not create a parallel auth or database architecture unless the existing application cannot support a required security property.
