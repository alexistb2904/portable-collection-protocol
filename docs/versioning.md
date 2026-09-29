# Versioning

There are three related versions.

## Collection format version

Stored in:

`payload.version`

Current value:

`1.0.0`

A breaking change to signed collection payload semantics requires a new supported format version.

## Live authorization protocol

Advertised as:

`WIKICARD-AUTH-CODE-1`

A breaking change to request, code exchange or authorization-binding semantics requires a new authorization protocol identifier.

## SDK/package versions

Reference packages can receive bug fixes and implementation improvements without changing the wire protocol version.

Consumers should therefore not infer wire compatibility from an npm package version alone.

## Compatibility rules

Safe additions include:

- new optional issuer-discovery metadata;
- new extension namespaces;
- new documentation;
- stricter local operational controls that do not change signed payload semantics.

Breaking changes include:

- changing canonicalization;
- changing signature context prefixes;
- renaming required signed properties;
- changing the meaning of identity fields;
- changing authorization binding requirements.

## Unknown versions

Implementations must reject unsupported required protocol versions explicitly.

Do not guess forward compatibility for signed objects.
