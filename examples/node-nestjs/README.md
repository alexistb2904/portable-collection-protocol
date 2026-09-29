# NestJS example

Reference integration for **NestJS 11**.

## Structure

- `ProtocolController` maps the HTTP contract to Nest routes.
- `ProtocolService` owns protocol SDK objects.
- `site-adapter.ts` is the host-application boundary.

Replace the demo authentication and collection source before production, and persist linked external collections in your database instead of the in-memory map.

The example deliberately refuses production mode while demo authentication is present.
