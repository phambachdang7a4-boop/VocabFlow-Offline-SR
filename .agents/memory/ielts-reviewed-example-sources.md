---
name: IELTS reviewed example sources
description: Design rule for preserving reviewed English-Vietnamese examples across course rebuilds.
---

Store reviewed English/Vietnamese example pairs outside generated IELTS course data, alongside the exact dictionary examples present when the review is approved. Rebuilds should use the approved pair, mark it as authored, and stop for a new review if the dictionary-example snapshot changes.

**Why:** Generated course data is rewritten during rebuilds, so edits there alone cannot durably protect a reviewed translation or detect later source changes.

**How to apply:** When adding a reviewed pair, update the durable review source and its dictionary snapshot together; do not use a manual edit to generated course output as the source of truth.
