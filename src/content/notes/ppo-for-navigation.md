---
title: PPO 在学习式导航中的位置
date: 2026-01-31
summary: 从状态、动作和奖励出发，理解 PPO 为什么适合作为连续控制实验中的策略优化方法。
tags:
  - DashGo
  - 强化学习
  - PPO
  - 机器人学
source:
  title: Proximal Policy Optimization Algorithms
  author: John Schulman 等
  url: https://arxiv.org/abs/1707.06347
relatedProjects:
  - dashgo-rl-navigation
externalLinks:
  - label: PPO 原论文
    url: https://arxiv.org/abs/1707.06347
  - label: RSL-RL
    url: https://github.com/leggedrobotics/rsl_rl
---

## 导航任务中的三个基本量

对机器人来说，强化学习可以先从三个问题开始：

- **State**：机器人当前看到什么，例如传感器观测、目标方向和自身运动状态。
- **Action**：机器人要做什么，例如输出线速度和角速度。
- **Reward**：这一步行为是否让任务更接近目标，例如接近目标、避开障碍或完成导航。

策略的目标不是记住一条固定路径，而是根据状态选择动作，并在多次交互中改善长期回报。

## 策略梯度与 PPO

策略梯度直接优化“状态到动作分布”的策略。它适合连续动作，但如果每次更新幅度过大，旧策略积累的经验可能立刻失效。

PPO 的核心做法是限制新旧策略的变化比例：当一次更新已经偏离旧策略太多时，裁剪目标函数会限制继续放大的收益。它不是保证训练一定成功的按钮，而是一种让更新更保守、更容易调试的机制。

```text
采样轨迹 → 估计优势 → 小步更新策略与价值网络 → 重复评估
```

## Actor-Critic 的分工

- **Actor** 根据状态提出动作。
- **Critic** 估计当前状态的价值，为 Actor 提供基准。

这种分工可以降低策略梯度的方差，也让训练过程中的“这次动作比预期好还是差”更容易表达。

## 放回 DashGo 的工程链路

PPO 只是训练环节的一部分。完整系统还需要保持观测语义、动作限制、仿真配置和真实运行时之间的一致性：

```text
观测 → 策略 → 动作限制 → 机器人反馈 → 评估记录
```

因此，理解 PPO 不等于证明导航已经成功。公开项目页只记录已验证的系统边界，训练曲线和成功率必须以独立实验记录为证据。
