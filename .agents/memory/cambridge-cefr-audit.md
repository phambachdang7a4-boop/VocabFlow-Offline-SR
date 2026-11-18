---
name: Cambridge CEFR audit access
description: How to handle Cambridge Dictionary CEFR lookups when automated requests are blocked.
---

Cambridge Dictionary entry pages may deny automated retrieval with HTTP 403. A blocked page is not evidence for or against any CEFR label. Record the term as unverified, retain the established Oxford decision, and include the exact Cambridge entry URL so the lookup can be retried later.

**Why:** CEFR labels must be confirmed for the exact headword and part of speech; guessing from other dictionary data could silently change course classification.

**How to apply:** When a Cambridge lookup cannot be read, state the access limitation per term and do not infer a CEFR level.

The Open Language Profiles repository also publishes Octanove Vocabulary Profile C1/C2 v1.0, created by Octanove Labs, under CC BY-SA 4.0. It can support a C1/C2 source-list label only when the exact headword and part of speech match. Cite the dataset and license when reusing its labels. If the same headword/POS has conflicting levels, or no exact match, leave the level unverified.

**Why:** The source contains duplicate same-POS rows with conflicting C1/C2 labels, so taking the first row would create a false certainty.

**How to apply:** Check all exact source rows before assigning a label, preserve conflicting levels as unverified, and never treat absence from this C1/C2-only list as evidence of a lower level.
