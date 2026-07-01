---
title: "与 C 语言交互"
description: "探索 Rust 与 C 语言的深度融合：从调用遗留 C 库到将 Rust 模块嵌入现有系统。"
difficulty: beginner
estimatedTime: 5
keywords: ["FFI", "bindgen", "cbindgen", "互操作性"]
---

在系统编程的世界里，C 语言是通用的二进制语言。无论处理操作系统内核、数据库引擎还是图形驱动，都不可避免地需要与 C 代码打交道。

Rust 的设计目标之一是**零成本互操作性**：你可以像调用 Rust 函数一样调用 C 函数；外部语言也可以像调用 C 函数一样调用 Rust；数据在两种语言之间传递时，通常不需要额外的拷贝开销。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [FFI 基础](./01-ffi-basics) | ABI、`extern "C"` 块、基本类型映射与内存安全边界 |
| [自动生成绑定：bindgen](./02-bindgen) | 从 C 头文件自动生成 Rust FFI 绑定代码 |
| [暴露 Rust 给 C：cbindgen](./03-cbindgen) | 生成 C 头文件，将 Rust 库嵌入现有 C 代码库 |
| [混合编译](./04-mixed-build) | 用 `cc` crate 在 Rust 项目中直接编译和链接 C 源码 |
