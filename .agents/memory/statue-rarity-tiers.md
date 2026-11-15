---
name: Statue rarity tiers
description: Product rule for collectible statue ranks and their compatibility with saved records.
---

Historical statues use Rare, Epic, and Legendary; Common is not a displayed statue tier. Promote former Common statues to Rare, while keeping the chest-fragment rarity system separate, including Common chests. Preserve old statue IDs and accept saved records that still identify promoted statues as Common.

**Why:** The user requested removing Common from statue quality and raising all Common statues. Chest rarity and previously saved collection records are separate compatibility concerns and should not be broken.

**How to apply:** Change statue ranks and gallery groupings without deleting chest tiers. When promoting a statue, keep its existing ID and retain a compatibility path for old saved craft or backup data.

Corvi duplicates grant 20 fragments matching the duplicate statue's rarity. Preserve the credit separately from fragment spending and apply it after the spent-balance floor.

**Why:** A clamped spent balance can otherwise erase a later compensation credit when old spending exceeds recorded drops.

**How to apply:** Keep duplicate compensation idempotent with the Corvi chest reward and preserve it through sync and backups; do not clamp the compensation away with historical spending.
