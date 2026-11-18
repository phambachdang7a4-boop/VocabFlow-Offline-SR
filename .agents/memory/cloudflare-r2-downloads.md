---
name: Public asset downloads from Cloudflare R2
description: Safe rollout rules for moving public offline packages to R2.
---

Keep downloads resumable and verify each package against its pinned size and SHA-256 before activating a new public origin. Preserve the existing source until all R2 objects are copied and verified. Native clients can use the public R2 origin without browser CORS; web clients must remain on the existing source until CORS permits byte-range requests and exposes the headers the client reads.

**Why:** A failed origin switch can strand the large offline dictionary, audio, IPA, or course packages. Native and browser networking differ: a public URL can work in an APK while browser fetches still fail CORS.

**How to apply:** Migrate immutable public packages first, verify object sizes and hashes plus 206 Range responses, then enable the origin for native. Enable web only after a browser preflight/range check confirms CORS for `GET`/`HEAD`, `Range`, and exposed `Content-Range`/integrity metadata. Keep API or upstream fallbacks until each path is verified.
