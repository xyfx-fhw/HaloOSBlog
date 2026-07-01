---
title: "高级特性"
description: "深入 Rust 类型系统的高级机制：关联类型、dyn Trait、高级类型技巧、async 入门、高级模式匹配与格式化。"
difficulty: advanced
estimatedTime: 10
keywords: ["关联类型", "dyn Trait", "高级类型", "async", "模式匹配", "格式化"]
---

# 高级特性

本章介绍在日常编程中不常直接写、但理解它们能让你读懂更多代码的进阶机制：

1. **关联类型** — 泛型 Trait 参数过多时的困境；用 `type Item` 把类型绑定到实现，让签名和调用都更清晰

2. **dyn Trait：动态分发** — 泛型解决不了的两个场景；fat pointer 原理；`Box<dyn Trait>` 与 `&dyn Trait` 的选择；对象安全

3. **高级 Trait** — 运算符重载、`Newtype` 模式、完全限定语法等高级用法

4. **高级类型** — 类型别名、`!` 类型、动态大小类型

5. **async 入门** — 异步编程基础概念

6. **高级模式匹配** — `@` 绑定、守卫、解构嵌套结构等进阶模式

7. **高级格式化** — 自定义 `Display`、格式化参数、调试输出技巧
