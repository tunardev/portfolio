---
title: Merkle trees and the art of not comparing everything
date: 2026-09-09
glyph: merkle
---

Two replicas each hold a million blocks. How do you find the three that differ without shipping a million hashes across the network? You hash pairs of blocks, then pairs of those hashes, until one root is left. Compare roots. If they match, done.

If they differ, compare the two children, and only descend into the side that disagrees. A million blocks become twenty comparisons. That is the entire trick, and Dynamo, Git, and Bitcoin all use it.
