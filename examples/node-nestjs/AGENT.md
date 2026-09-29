# AGENT.md — NestJS integration

Read `../../AGENTS.md`, `../../docs/agents/node-agent-guide.md`, `../../docs/protocol.md` and `../../docs/security.md` before editing.

This directory is a reference, not a drop-in production authentication system.

## Replace

- demo authentication with guards/decorators and existing user service;
- demo `CollectionSourceAdapter` with the host application's authoritative ownership service;
- demo portable-card mapping with stable real instance IDs and canonical IDs;
- in-memory external links with an injected repository/ORM service;
- empty trust lists only with explicitly reviewed partners.

## Preserve

- existing NestJS architecture;
- Ed25519 signing;
- PKCE S256;
- exact redirect URI;
- one-time Redis state/code/token;
- live collection rebuild after source authentication;
- destination-account binding;
- no-store headers on sensitive responses.

## Before completion

Run build/typecheck/tests, add framework-native tests, and report any remaining demo code or production assumptions.
