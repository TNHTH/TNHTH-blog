---
title: 双臂机器人系统
summary: 一个围绕感知、场景融合、规划、执行与任务管理组织的 ROS2 操作系统工作区。
date: 2026-06-02
tags: [ROS2, 操作, RGB-D, 规划]
type: project
status: partial
role: 系统架构与集成
contribution:
  - 梳理从感知到执行的数据流。
  - 将任务管理与规划、机器人执行状态连接起来。
  - 编写架构文档，明确记录尚未补齐的证据。
evidence: [EV-DA-DOC-001, EV-DA-GH-001]
repo: https://github.com/TNHTH/dual-arm
featured: true
---

## 架构

```text
RGB-D → 检测 → 场景融合 → 规划 → 执行 → 任务管理器
```

这个项目的价值在于系统边界：感知不是一个脱离系统的演示，执行也不是隐藏在未经审视的脚本后面。

## 当前边界

仓库包含系统架构和初始实现快照。测试覆盖、重复演示和比赛结果还不足以支持“已完成项目”的说法，因此页面明确标记为阶段性成果。
