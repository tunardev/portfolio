---
title: Moving a terabyte without losing a row
date: 2026-09-08
glyph: move
---

Moving data is easy. Moving data and being able to prove nothing went missing is the actual job. The proof is a set of checksums per batch, a count on both sides, and a boring log of every batch that was retried.

The failure mode is never the network. It is the row that was updated while it was in flight, and the batch that was retried and landed twice. Idempotent writes and a stable ordering key solve both, and neither is glamorous.
