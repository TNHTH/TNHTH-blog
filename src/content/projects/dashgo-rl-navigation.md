---
title: DashGo 强化学习导航
summary: 一个 Isaac Lab 导航实验，将激光雷达观测、循环策略与真实机器人验证闭环连接起来。
outcome: 完成从仿真训练、观测数据管线到导航运行时的闭环，目前继续进行真实机器人验证。
status: active
period: "2026"
topics: [Isaac Lab, 强化学习, LiDAR, ROS2]
featured: true
priority: 30
role: 强化学习系统集成与评估
contributions:
  - 调整训练环境与观测数据管线。
  - 将策略输出接入导航运行时。
  - 补充评估记录，保留较低成功率等限制信息。
tech: [Isaac Lab, ROS 2, Python, 强化学习]
repo: https://github.com/TNHTH/dashgo-rl-navigation
evidence:
  - kind: document
    label: 评估记录
    value: EV-DG-RL-TEST-001
  - kind: document
    label: 系统集成记录
    value: EV-DG-RL-COMMIT-001
---

## 为什么做它

DashGo 是一台用于验证学习式导航策略的小型差速平台，目标是观察策略能否从仿真假设逐步走向真实机器人。

## 系统形态

```text
激光雷达 → 观测编码器 → 策略 → 速度指令 → 机器人反馈
```

真正有价值的工程问题不只是训练策略，而是让仿真配置、观测语义、动作限制与运行时行为保持一致。

## 当前边界

这是一个正在进行的实验。现有证据支持系统架构和评估流程，但不足以支持“已经收敛”或“可以稳定部署”的结论。公开页面保留低成功率结果，因为失败分析本身就是工作的一部分。
