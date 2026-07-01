---
title: "泛型与 Trait"
description: "掌握 Rust 类型系统的核心机制：泛型消除代码重复，Trait 定义行为契约，两者结合构成 Rust 抽象能力的基础。"
difficulty: beginner
estimatedTime: 5
keywords: ["泛型", "trait", "trait 约束", "关联类型", "单态化", "impl Trait"]
---

泛型和 Trait 是 Rust 抽象能力的两根支柱，天然咬合：**泛型**（`<T>`）让一份代码适配多种类型，**Trait** 定义"某类型能做什么"的行为契约，**Trait 约束**把二者联结起来——泛型代码可以调用约束所保证的方法，编译器在使用时展开为具体类型，零运行时开销。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [泛型语法](./01-generics-syntax) | 函数、结构体、枚举和 impl 块中的泛型写法，单态化原理 |
| [Trait：定义共享行为](./02-traits) | 定义与实现 Trait，默认方法，`Display` 与 `Debug` 背后的机制 |
| [Trait 约束](./03-trait-bounds) | `T: Trait` 语法，多重约束，`where` 子句，`impl Trait` |
| [转换 Trait](./04-conversion-traits) | `From`/`Into`、`TryFrom`/`TryInto` 的惯用模式 |
| [综合练习](./05-practice) | 综合运用泛型与 Trait 解决实际问题 |
