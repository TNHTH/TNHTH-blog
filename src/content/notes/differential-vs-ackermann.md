---
title: Differential Drive vs. Ackermann Steering
summary: A practical way to connect wheel geometry, non-holonomic constraints, and controller choice.
date: 2026-02-10
tags: [mobile robotics, kinematics, control]
type: note
category: robotics
---

## The short version

Differential drive turns by changing the left and right wheel velocities. Ackermann steering turns by changing front-wheel angles so the wheel axes meet at a common instantaneous center of curvature.

For a differential-drive base with wheel separation `L`:

```text
vR = v + ωL/2
vL = v - ωL/2
```

The model is simple, but the physical platform still has wheel slip, actuator mismatch, and floor-dependent behavior.

Ackermann steering instead uses a curvature relationship:

```text
R = L / tan(δ)
```

That makes high-speed motion stable, but introduces a minimum turning radius and a stronger path-curvature constraint.

## Choosing a model

Use differential drive when tight turns, indoor maneuverability, and simple actuation dominate. Use Ackermann when speed, rolling efficiency, and vehicle-like motion dominate. The controller should respect the mechanics rather than pretend both platforms share the same action space.
