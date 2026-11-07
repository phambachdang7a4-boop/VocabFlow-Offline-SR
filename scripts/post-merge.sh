#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Vocabulary migrations run on-device in Expo SQLite. This app has no
# server-owned user data, so merging must not push the unused DB scaffold.
pnpm run typecheck:libs
