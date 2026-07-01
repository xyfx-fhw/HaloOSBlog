---
title: "不安全 Rust"
description: "学习 unsafe 块的作用范围、裸指针操作、unsafe 函数与 trait，以及如何在 unsafe 实现上构建安全接口"
difficulty: beginner
estimatedTime: 5
keywords: ["unsafe", "裸指针", "Send", "Sync", "安全抽象", "不变量"]
---

Rust 的安全保证来自编译器——但有时候你写的代码确实是安全的，编译器却无法证明。`unsafe` 关键字是对编译器说："这里我比你更了解情况，放行。"

**重要：`unsafe` 不会关闭借用检查器**，它只解锁了五种额外操作：解引用裸指针、调用 unsafe 函数、访问可变静态变量、实现 unsafe trait、访问 union 字段。安全责任由此从编译器转移到你。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [unsafe 块与超能力](./01-unsafe) | unsafe 块的真实含义，五大超能力逐一讲解 |
| [裸指针](./02-raw-pointers) | `*const T` 与 `*mut T` 的创建、解引用与指针算术 |
| [unsafe 函数与 Trait](./03-unsafe-functions) | `unsafe fn` 的设计规范、`# Safety` 文档约定，`Send`/`Sync` 手动实现 |
| [安全抽象](./04-safe-abstractions) | 用 unsafe 实现 + safe 接口封装，最小化 unsafe 范围 |
