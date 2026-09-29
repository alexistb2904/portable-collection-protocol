# Maintenance scripts

No private-key-generating script is committed by default.

For local development, use the one-line Node command documented in the root README, then place the generated private key in your local secret/environment configuration.

Production signing keys should preferably be generated and stored directly in the deployment platform or secret manager rather than printed by repository tooling.
