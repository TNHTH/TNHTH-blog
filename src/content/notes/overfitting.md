---
title: Overfitting as a Generalization Gap
summary: A compact diagnostic guide for separating memorization from useful learning.
date: 2026-02-11
tags: [machine learning, evaluation, training]
type: note
category: machine learning
---

Overfitting is not simply “a large model.” It is the situation where training performance keeps improving while performance on unseen data stops improving or gets worse.

## Diagnostic pattern

```text
training loss ↓ + validation loss ↑ = investigate generalization
```

The gap can come from model capacity, limited data, noisy labels, leakage in the split, or a training schedule that runs past the useful point.

## Response matrix

- Improve the data split before tuning the model.
- Add data or augmentation when the data distribution is narrow.
- Reduce capacity when the model can memorize individual examples.
- Use regularization, dropout, or early stopping when the validation curve supports it.
- Report the gap and the evaluation protocol, not only the best training score.

The important habit is to treat the validation curve as evidence about transfer, not as a decorative plot.
