---
title: BDD → SDD → TDD for Small Systems
summary: A lightweight development loop that turns an ambiguous request into observable behavior, explicit contracts, and tests.
date: 2026-05-13
tags: [engineering practice, testing, workflow]
type: writing
category: engineering practice
---

## Three questions

BDD asks: what should the user experience?

SDD asks: what inputs, outputs, and failure states cross the module boundary?

TDD asks: what is the smallest test that proves the contract?

```text
behavior → contract → test → implementation → refactor
```

This is not a ceremony checklist. It is a way to make the next failure legible. For a content publishing pipeline, that means testing both a valid public note and a rejected private path before adding more pages.
