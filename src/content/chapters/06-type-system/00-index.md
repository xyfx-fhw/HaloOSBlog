---
title: "类型系统"
description: "深入掌握 Rust 类型系统：类型推导、转换、别名与 newtype 模式，理解如何用类型本身表达语义约束。"
difficulty: beginner
estimatedTime: 5
keywords: ["类型系统", "类型推导", "类型转换", "类型别名", "newtype"]
---

# 章节概览

你已经学过 Rust 的基本类型（整数、浮点、布尔、字符、自定义类型、标准库类型等）。本章深入探讨 **Rust 类型系统** 的四个核心主题：

1. **类型推导** — 编译器如何根据上下文自动推断变量类型

2. **类型铸造** — `as` 关键字显式转换数值类型

3. **类型别名** — `type Meters = f64` 给已有类型起个别名，不产生新类型

4. **Newtype 模式** — `struct Meters(f64)` 创造真正的新类型；与类型别名的关键区别：编译器会把 `Meters` 和 `Centimeters` 当作完全不同的类型来检查
