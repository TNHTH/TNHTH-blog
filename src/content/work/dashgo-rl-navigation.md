---
title: DashGo RL Navigation
summary: An Isaac Lab navigation experiment that connects LiDAR observations, a recurrent policy, and a real robot validation loop.
date: 2026-06-02
tags: [Isaac Lab, reinforcement learning, LiDAR, ROS2]
type: project
status: ongoing
role: Reinforcement-learning system integration and evaluation
contribution:
  - Adapted the training environment and observation pipeline.
  - Integrated policy outputs with the navigation runtime.
  - Added evaluation notes that keep weak success rates visible.
evidence: [EV-DG-RL-COMMIT-001, EV-DG-RL-TEST-001]
repo: https://github.com/TNHTH/dashgo-rl-navigation
featured: true
---

## Why it exists

DashGo is a small differential-drive platform for testing whether a learned navigation policy can move from simulation assumptions toward a physical robot.

## System shape

```text
LiDAR → observation encoder → policy → velocity command → robot feedback
```

The useful engineering problem is not only training. It is keeping simulation configuration, observation semantics, action limits, and runtime behavior aligned.

## Current boundary

This is an active experiment. The current evidence supports the architecture and evaluation workflow, but does not support a claim of convergence or reliable deployment. The public page keeps the low success-rate results visible because failure analysis is part of the work.
