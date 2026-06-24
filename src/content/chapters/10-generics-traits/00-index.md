---
title: "泛型与 Trait"
description: "掌握 Rust 类型系统的核心机制：泛型消除代码重复，Trait 定义行为契约，两者结合构成 Rust 抽象能力的基础。"
difficulty: beginner
estimatedTime: 5
keywords: ["泛型", "trait", "trait 约束", "关联类型", "单态化", "impl Trait"]
---

泛型和 Trait 是 Rust 抽象能力的两根支柱，天然咬合在一起：

- **泛型**（`<T>`）让你写一份代码适配多种类型，编译器在使用时自动展开——零运行时开销
- **Trait** 定义一组行为契约，规定"某类型能做什么"
- **Trait 约束**（`T: Display`）把两者联结：泛型代码可以调用约束所保证的方法

本章从泛型语法出发，逐步深入 Rust 的 Trait 系统：

1. **泛型语法基础** — 函数、结构体、枚举、impl 块中的 `<T>` 写法；单态化为什么让泛型零开销

2. **Trait：定义共享行为** — 什么是 Trait，如何定义和实现；默认方法；`Display` 和 `Debug` 背后的机制

3. **Trait 约束与 impl Trait** — 用 `T: Trait` 限制泛型参数，多重约束、`where` 子句；`impl Trait` 语法

4. **转换 Trait** — `From`/`Into`、`TryFrom`/`TryInto`；Rust 类型转换的惯用模式

5. **综合练习** — 动手巩固全章内容
