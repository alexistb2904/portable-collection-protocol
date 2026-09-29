# Agent Guide — NestJS

Reference: `examples/node-nestjs/`.

## Recommended module

Create a dedicated module:

```text
PortableCollectionModule
  ProtocolController
  ProtocolService
  CollectionSourceAdapter
  ExternalCollectionRepository
```

## Dependency injection

Provide:

- Redis-backed `ProtocolStore`;
- signing key/config;
- collection source adapter;
- importer/authorization services.

Avoid static globals in a production Nest application.

## Guards

Use the application's normal authentication Guard for:

- export;
- authorization preview;
- authorization consent;
- import start;
- linked collection management.

Do not apply browser user guards to the server-to-server token/live endpoints.

## Validation

Use the project's pipes/DTO layer at HTTP boundaries, while retaining SDK validation for protocol objects.

## Persistence

Use the project's TypeORM/Prisma/MikroORM repository for verified external links.
