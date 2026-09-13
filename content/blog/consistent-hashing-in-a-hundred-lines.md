---
title: Consistent hashing, from the paper to a hundred lines
date: 2026-09-11
glyph: ring
---

Consistent hashing answers a small question with a large consequence: when a node leaves, how many keys have to move? With a modular hash, almost all of them. With a ring, only the keys that belonged to the node that left.

The ring is the whole idea. Hash the nodes onto a circle, hash the keys onto the same circle, and each key belongs to the first node clockwise from it. Removing a node hands its arc to its successor and touches nothing else.

The paper adds virtual nodes to smooth out the arcs, and that is the part people forget when they implement it in an afternoon. Without them, one unlucky node owns half the ring.
