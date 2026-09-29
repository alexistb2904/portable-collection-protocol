# Agent Integration Task Template

Fill this file or paste it into an agent request.

## Target

Repository:

```text
<repository>
```

Role:

```text
ISSUER | DESTINATION | BOTH
```

Production issuer/API URI:

```text
https://...
```

## Constraints

- preserve existing framework;
- preserve existing authentication;
- preserve existing database architecture;
- reuse existing Redis if suitable;
- no external issuer/client trusted by default;
- do not mint current ownership from a backup file.

## Agent tasks

1. Read root `AGENTS.md`.
2. Detect framework using `docs/agents/framework-selection.md`.
3. Read the matching Node/Python agent guide.
4. Audit authentication, ownership data, Redis and deployment.
5. Write a short implementation plan.
6. Implement protocol integration using the matching example as reference.
7. Add persistent external-link storage.
8. Add environment variables.
9. Add/adjust consent UI.
10. Add protocol/security tests.
11. Run project validation.
12. Compare final behavior against `docs/conformance.md`.
13. Report any unmet requirement instead of bypassing it.

## Acceptance criteria

- signed exports verify cross-process;
- changed payload fails signature verification;
- stolen export cannot authorize under another source account;
- old backup results in a fresh source collection;
- code/token/state cannot replay;
- authorization is destination-account-bound;
- unknown partner is denied;
- no demo auth or in-memory persistence remains in production code.
