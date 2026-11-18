---
name: Public asset downloads from Cloudflare R2
description: Safe rollout rules for moving public offline packages to R2.
---

Keep downloads resumable and verify each package against its pinned size and SHA-256 before activating a new public origin. Preserve the existing source until all R2 objects are copied and verified. Native clients can use the public R2 origin without browser CORS; web clients need CORS to allow byte-range requests. If a response header is not exposed, the browser client must still validate byte counts and the complete pinned SHA-256 before installing data.

**Why:** A failed origin switch can strand the large offline dictionary, audio, IPA, or course packages. Native and browser networking differ: a public URL can work in an APK while browser fetches still fail CORS.

**How to apply:** Migrate immutable public packages first, verify object sizes and hashes plus 206 Range responses, then enable the origin for native. Enable web only after preflight and a ranged GET succeed with CORS headers. Exposing `Content-Range` and integrity metadata is useful, but optional when clients tolerate hidden headers and independently verify the full pinned hash. Keep API or upstream fallbacks until each path is verified.
