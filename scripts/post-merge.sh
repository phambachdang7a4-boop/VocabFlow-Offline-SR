#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Apply additive account-sync tables to the development PostgreSQL database.
pnpm --filter @workspace/db run push
pnpm run typecheck:libs
