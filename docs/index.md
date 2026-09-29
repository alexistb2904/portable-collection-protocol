---
layout: home
title: Portable Collection Protocol
hero:
  name: Portable Collection Protocol
  text: Signed collection portability without trusting backup files
  tagline: Export collectible identities between services while keeping ownership verification live, explicit and replay-resistant.
  actions:
    - theme: brand
      text: Quick Start
      link: /quick-start
    - theme: alt
      text: Read the Protocol
      link: /protocol
    - theme: alt
      text: Open Export Viewer
      link: /viewer
features:
  - title: Signed exports
    details: Deterministic JSON and Ed25519 signatures protect integrity and identify the issuer.
  - title: Live ownership
    details: Authorization Code + PKCE requires control of the source account and retrieves a fresh collection.
  - title: Explicit trust
    details: Unknown issuers and destination clients are rejected by default.
  - title: Language-neutral
    details: JSON, HTTPS and Ed25519. TypeScript packages are reference implementations, not requirements.
---

## Why this exists

A portable collection should be useful across multiple games and services without turning a copyable JSON file into a duplication mechanism.

The protocol therefore separates **snapshot authenticity** from **current ownership authorization**.

A valid export answers:

> “Did this issuer sign this collection at this time?”

The live authorization layer answers:

> “Does the person importing it still control the source account, and what does that account own now?”

Both checks are required for ownership-sensitive imports.

## Integration support

For implementation review or partner onboarding:

- Discord: **alexistb2904**
- Email: **wikicard@alexistb.com**
