---
title: Dual-Arm Robotics
summary: A ROS2 manipulation workspace organized around perception, scene fusion, planning, execution, and task management.
date: 2026-06-02
tags: [ROS2, manipulation, RGB-D, planning]
type: project
status: partial
role: System architecture and integration
contribution:
  - Structured the perception-to-execution data flow.
  - Connected task management with planning and robot execution states.
  - Wrote architecture documentation that makes missing evidence explicit.
evidence: [EV-DA-DOC-001, EV-DA-GH-001]
repo: https://github.com/TNHTH/dual-arm
featured: true
---

## Architecture

```text
RGB-D → detection → scene fusion → planning → execution → task manager
```

The value of this project is the system boundary: perception is not treated as a detached demo, and execution is not hidden behind an unexamined script.

## Current boundary

The repository contains an architecture and an initial implementation snapshot. Test coverage, repeated demonstrations, and competition results are not yet strong enough for a completed-project claim, so this page stays deliberately marked as partial.
