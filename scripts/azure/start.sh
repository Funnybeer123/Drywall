#!/bin/sh
# Azure App Service startup command ("sh start.sh"). Packaged by scripts/azure/deploy.ps1.
# Everything here runs before the server opens the embedded database (PGlite allows one process).
set -e

mkdir -p "$DATA_DIR"
FIRST_BOOT=
[ -d "$DATA_DIR/pglite" ] || FIRST_BOOT=1

# Apply any new migrations (no-op when the database is up to date).
node setup/migrate.mjs

# First boot: Willy's owner login + starter services/FAQ/price list (no demo data).
if [ -n "$FIRST_BOOT" ]; then
  node setup/create-owner.mjs
fi

# Optional extra owner login (e.g. a test admin). Remove the EXTRA_OWNER_* settings afterwards
# so the password isn't reset on every restart.
if [ -n "$EXTRA_OWNER_EMAIL" ]; then
  OWNER_NAME="$EXTRA_OWNER_NAME" OWNER_EMAIL="$EXTRA_OWNER_EMAIL" OWNER_PASSWORD="$EXTRA_OWNER_PASSWORD" node setup/create-owner.mjs
fi

# Optional one-time wipe of all business records (see scripts/clear-business-data.ts).
# Delete the CLEAR_BUSINESS_DATA setting afterwards, or it wipes again on every restart.
if [ -n "$CLEAR_BUSINESS_DATA" ]; then
  node setup/clear-business-data.mjs
fi

# Optional API key for the assistant (only its hash is set here). Safe to leave set: it's idempotent.
if [ -n "$API_KEY_HASH" ]; then
  node setup/create-api-key.mjs
fi

export HOSTNAME=0.0.0.0
exec node server.js
