# Agent Step 0 — Audit Before Editing

Before writing protocol code, inspect the host project and produce a short internal map.

## Authentication

Find:

- how browser users authenticate;
- how the current user is resolved in server handlers;
- session/JWT/OIDC/passkey middleware;
- login redirect behavior;
- CSRF protections;
- logout/session revocation.

The protocol consent page must reuse this authentication.

Do not create a second login system.

## Ownership model

Find:

- card/collectible instance table;
- immutable instance identifier;
- owner relation;
- deleted/recycled/revoked state;
- article/Wikidata identity;
- current collection query;
- transfer/trade state.

The live collection adapter must query current authoritative ownership.

Never derive the live collection from the uploaded export.

## Infrastructure

Find:

- Redis or equivalent shared ephemeral store;
- API public origin;
- web public origin;
- reverse-proxy path rewriting;
- horizontal replicas;
- rate limiting;
- secret management;
- database migration mechanism.

## Existing conventions

Find:

- route/controller/service structure;
- validation library;
- error handling;
- HTTP client;
- logging;
- integration tests;
- environment config.

Use those conventions.

## Decide the role

Record whether the application is:

- issuer;
- destination;
- both.

Only implement the required surfaces.

## Required output of the audit

Before modifying code, be able to answer:

1. What exact URI will be the issuer ID?
2. What stable source subject ID will represent a user?
3. What stable instance ID already represents a card copy?
4. How is current ownership queried?
5. Where will one-time state live?
6. Where will trusted issuers/clients be configured?
7. Where will verified external collection links be persisted?
8. What route will render user consent?
9. How will login return to a pending consent flow?
10. What migration/testing commands must run?
