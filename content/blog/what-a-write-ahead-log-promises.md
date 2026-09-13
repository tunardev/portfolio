---
title: What a write-ahead log actually promises
date: 2026-09-12
glyph: wal
---

A write-ahead log promises one thing: before the table changes, the change is on disk somewhere it can be found again. Everything else people attribute to it, durability, atomicity, crash recovery, falls out of that one promise.

The interesting part is the fsync. Until the operating system confirms the log record reached the disk, the write has not happened, no matter what the table says. Most surprising database bugs live in the gap between writing and syncing.

Replay is the other half. After a crash the database reads the log from the last checkpoint and applies every record again. The table can be wrong, half-written, or missing. The log is the truth, and the table is a cache of it.
