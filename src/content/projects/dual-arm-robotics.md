---
title: 双臂机器人系统
summary: 一个围绕感知、场景融合、规划、执行与任务管理组织的 ROS 2 操作系统工作区。
outcome: 完成从 RGB-D 感知到任务执行的数据流梳理和系统集成框架，形成可继续验证的双臂机器人工作区。
status: prototype
period: "2026"
topics: [ROS 2, 操作, RGB-D, 规划]
featured: true
priority: 20
role: 系统架构与集成
contributions:
  - 梳理从感知到执行的数据流。
  - 将任务管理与规划、机器人执行状态连接起来。
  - 编写架构文档，明确记录尚未补齐的证据。
tech: [ROS 2, RGB-D, 任务规划, 双臂机器人]
repo: https://github.com/TNHTH/dual-arm
evidence:
  - kind: document
    label: 架构记录
    value: EV-DA-DOC-001
  - kind: document
    label: 仓库快照
    value: EV-DA-GH-001
---

## 架构

```text
RGB-D → 检测 → 场景融合 → 规划 → 执行 → 任务管理器
```

这个项目的价值在于系统边界：感知不是一个脱离系统的演示，执行也不是隐藏在未经审视的脚本后面。

## 当前边界

仓库包含系统架构和初始实现快照。测试覆盖、重复演示和比赛结果还不足以支持“已完成项目”的说法，因此页面明确标记为阶段性成果。
