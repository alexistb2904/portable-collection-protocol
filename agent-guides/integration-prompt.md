# Short Integration Prompt for Coding Agents

Copy this prompt into an agent that has access to the target repository.

---

Integrate **WikiCard Portable Collection Protocol v1** into this repository.

First read:

1. `portable-collection-protocol/agent-guides/00-audit-first.md`
2. `portable-collection-protocol/agent-guides/framework-selector.md`
3. the detected Node/Python guide
4. the detected framework-specific guide
5. `portable-collection-protocol/docs/protocol.md`
6. `portable-collection-protocol/docs/security.md`
7. `portable-collection-protocol/docs/conformance.md`

Then audit the repository before editing anything.

Determine whether this application should act as:

- issuer;
- destination;
- both.

Reuse the application's existing:

- authentication/session system;
- ORM/database;
- Redis or shared state service;
- configuration pattern;
- route/controller/service conventions;
- tests and deployment system.

Do not create a second authentication system.

Do not trust a signed backup as current ownership.

Use the nearest framework reference under `portable-collection-protocol/examples/` as a mapping example, not as code to copy blindly.

Mandatory properties that must remain intact:

- Ed25519 signatures;
- WIKICARD-C14N-JSON-1;
- explicit issuer/client allowlists;
- exact redirect URI;
- PKCE S256;
- source session must match signed subject;
- destination account binding;
- original export hash binding;
- fresh live collection hash binding;
- short-lived atomic one-time state/code/token;
- trusted-origin checks before outbound server requests;
- HTTPS in production;
- uploaded file never directly creates current ownership.

Add negative tests for the security properties relevant to the role implemented.

Before finishing, run the host project's normal validation commands and compare the result against `agent-guides/security-review.md`.

If the existing architecture cannot satisfy a mandatory property, report the conflict instead of weakening the protocol.

---
