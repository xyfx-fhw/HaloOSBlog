---
title: "高级特性"
description: "深入 Rust 类型系统的高级机制：关联类型、dyn Trait、高级类型技巧、async 入门。"
difficulty: advanced
estimatedTime: 10
keywords: ["关联类型", "dyn Trait", "高级类型", "async"]
---

# 高级特性

本章介绍在日常编程中不常直接写、但理解它们能让你读懂更多代码的进阶机制：

1. **关联类型** — 泛型 Trait 参数过多时的困境；用 `type Item` 把类型绑定到实现，让签名和调用都更清晰

2. **dyn Trait：动态分发** — 泛型解决不了的两个场景；fat pointer 原理；`Box<dyn Trait>` 与 `&dyn Trait` 的选择；对象安全

3. **高级 Trait** — 运算符重载、`Newtype` 模式、完全限定语法等高级用法

4. **高级类型** — 类型别名、`!` 类型、动态大小类型

5. **async 入门** — 异步编程基础概念

6. **综合练习** — 动手巩固全章内容
