---
title: Leap / A20 消防巡检机器人
summary: 一个用于自主巡检、火情检测与整车控制实验的 ROS 2 和嵌入式平台。
outcome: 完成嵌入式控制、ROS 2 通信、车辆状态与巡检行为之间的系统集成和接口文档。
status: prototype
period: "2026"
topics: [ROS 2, 嵌入式, 巡检机器人, 导航]
featured: true
priority: 10
role: 机器人软件集成与系统文档
contributions:
  - 连接固件、ROS 2 节点和车辆控制接口。
  - 围绕可观测系统状态组织巡检流程。
  - 记录平台能力与已演示行为之间的边界。
tech: [ROS 2, 嵌入式, 车辆控制, 导航]
repo: https://github.com/TNHTH/leap
evidence:
  - kind: document
    label: 集成记录
    value: EV-LEAP-COMMIT-001
  - kind: document
    label: 平台文档
    value: EV-LEAP-DOC-001
---

## 概览

Leap 是 A20 巡检车辆的软件平台，将嵌入式控制、ROS2 通信、导航和面向浏览器的控制界面放在同一个项目故事中。

## 工程主线

把系统看成一组相互衔接的契约最容易理解：

```text
固件 → ROS2 传输 → 车辆状态 → 巡检行为 → 操作员反馈
```

重要的工作是让这些契约足够明确，以便真实机器人与架构图不一致时能够定位问题。

## 当前边界

该项目被记录为一个阶段性、持续演进的系统。页面描述已验证的集成方向和接口，不宣称它已经是可生产使用的自主巡检产品。
