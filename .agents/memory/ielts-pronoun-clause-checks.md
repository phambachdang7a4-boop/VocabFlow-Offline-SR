---
name: IELTS pronoun clause checks
description: Constraints for safely comparing English and Vietnamese subject pronouns in authored course examples.
---

Compare explicit pronoun subjects only when English and Vietnamese clause candidates align in count. Do not infer a mismatch from Vietnamese pronouns that may be objects or from generic wording without an explicit subject.

**Why:** Vietnamese uses the same personal pronoun forms for subjects and objects, and translation wording can omit or restructure subjects. Loose positional matching creates false positives.

**How to apply:** When extending the course checker, add clause markers with examples for both mismatched subjects and valid object-pronoun pairs; keep unaligned candidates conservative.
