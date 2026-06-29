---
title: "与 C 语言互操作"
description: "探索 Rust 与 C 语言的深度融合：从调用遗留 C 库到将 Rust 模块嵌入现有系统。"
difficulty: intermediate
estimatedTime: 5
keywords: ["FFI", "bindgen", "cbindgen", "互操作性"]
---

# 第 22 章：与 C 语言互操作

在系统编程的世界里，C 语言是通用的二进制语言。无论你是在处理底层操作系统内核、数据库引擎，还是图形驱动程序，你都不可避免地需要处理 C 代码。

Rust 的设计目标之一就是**零成本互操作性 (Zero-cost Interop)**。这意味着：
- 你可以像调用 Rust 函数一样调用 C 函数。
- 外部语言也可以像调用 C 函数一样调用 Rust。
- 数据在两种语言之间传递时，通常不需要额外的拷贝开销。

在本章中，我们将深入探讨 Rust 的 FFI 生命周期：
1. **[FFI 基础](/RustCourse/chapters/22-c-interop/01-ffi-basics)**：掌握 ABI、`extern "C"` 和基本类型转换。
2. **[自动生成绑定：bindgen](/RustCourse/chapters/22-c-interop/02-bindgen)**：学习如何让工具自动为你生成数千行 FFI 代码。
3. **[暴露 Rust 给 C：cbindgen](/RustCourse/chapters/22-c-interop/03-cbindgen)**：学习如何将 Rust 的安全性带入现有的 C 代码库中。
4. **[混合编译：管理 C 源码](/RustCourse/chapters/22-c-interop/04-mixed-build)**：学习如何使用 `cc` crate 在 Rust 项目中直接编译和链接 C 代码。

准备好跨越语言的边界了吗？
