---
title: "所有权系统"
description: "理解 Rust 最核心的概念：所有权，以及它如何保证内存安全"
difficulty: intermediate
estimatedTime: 10
keywords: ["所有权", "内存安全", "drop"]
---

## 什么是所有权

所有权是 Rust 最独特的特性，它让 Rust 在不需要垃圾回收器的情况下保证内存安全。

## 所有权规则

Rust 中每一个值都有一个 **所有者**（owner）。值在任一时刻只能有一个所有者。当所有者离开作用域，值将被丢弃（drop）。
