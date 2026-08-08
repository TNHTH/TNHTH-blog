---
title: Leap / A20 Fire Inspection Robot
summary: A ROS2 and embedded platform for autonomous inspection, fire detection, and vehicle-level control experiments.
date: 2026-06-02
tags: [ROS2, embedded, inspection robot, navigation]
type: project
status: partial
role: Robot software integration and system documentation
contribution:
  - Connected firmware, ROS2 nodes, and vehicle control interfaces.
  - Organized the inspection workflow around observable system states.
  - Documented the boundary between platform capability and demonstrated behavior.
evidence: [EV-LEAP-COMMIT-001, EV-LEAP-DOC-001]
repo: https://github.com/TNHTH/leap
featured: true
---

## Overview

Leap is the software platform around an A20 inspection vehicle. It brings embedded control, ROS2 communication, navigation, and a browser-facing control surface into one project story.

## The engineering thread

The system is easiest to reason about as a chain of contracts:

```text
firmware → ROS2 transport → vehicle state → inspection behavior → operator feedback
```

The important work is making those contracts explicit enough to debug when a physical robot does not behave like a diagram.

## Current boundary

The project is documented as a partial, evolving system. This page describes the integration direction and verified interfaces; it does not claim a production-ready autonomous inspection product.
