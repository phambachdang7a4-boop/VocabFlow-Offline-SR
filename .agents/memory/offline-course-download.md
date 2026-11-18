---
name: Offline course download sizing
description: Chunk sizing, progress stages, and timeout behavior for offline course packages.
---

Use 4 MiB request chunks for native Expo downloads and keep 1 MiB chunks for web IndexedDB downloads. Keep the resume checkpoint size independent from the request size.

**Why:** Range requests through the app's storage/API path have several seconds of fixed latency. A measured 1 MiB request and 4 MiB request both took about four seconds, so larger native chunks reduce total round trips. Web downloads should retain smaller chunks to limit temporary memory use.

**How to apply:** When changing package size or transport, preserve resumable offsets, report verification/validation/save stages after transfer, and cap each network request with a timeout so a stalled request does not leave the UI spinning indefinitely.
