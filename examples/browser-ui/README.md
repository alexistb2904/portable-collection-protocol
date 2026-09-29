# Browser UI examples

These files show the browser responsibilities of the protocol without requiring a frontend framework.

They are examples, not a production design system.

## Issuer consent

`issuer-consent.html`:

1. reads the authorization request from the URL;
2. sends it to the server-side preview endpoint;
3. displays only the client identity returned by the trusted server;
4. asks the user for explicit consent;
5. posts the same request to the authorization endpoint;
6. follows the validated redirect URL.

Never display a client name directly from unvalidated query parameters.

## Destination import

`destination-import.html`:

1. reads a JSON export selected by the user;
2. applies a local file-size check;
3. sends the parsed object to the destination backend;
4. follows the backend-generated source authorization URL.

Signature verification and trust decisions remain server-side.
