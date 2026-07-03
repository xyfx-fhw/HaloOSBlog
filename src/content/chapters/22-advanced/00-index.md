---
title: "高级特性"
description: "深入 Rust 类型系统的高级机制：关联类型、dyn Trait、async 入门、高级模式匹配。"
difficulty: beginner
estimatedTime: 5
keywords: ["关联类型", "dyn Trait", "async", "模式匹配"]
---

本章介绍在日常编程中不常直接写、但理解它们能让你读懂更多代码的进阶机制——从关联类型、动态分发到异步基础，这些特性共同构成了 Rust 高级抽象能力的基础。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [关联类型](./01-associated-types) | 泛型 Trait 中的 `type Item`，让签名与调用都更清晰 |
| [dyn Trait：动态分发](./02-dyn-trait) | fat pointer 原理、`Box<dyn Trait>` 与 `&dyn Trait` 的选择，对象安全 |
| [异步编程基础](./03-async-basics) | `async`/`await` 核心概念，Future 与执行器原理 |
| [高级模式匹配](./04-advanced-patterns) | `@` 绑定、守卫、解构嵌套结构等进阶模式 |
