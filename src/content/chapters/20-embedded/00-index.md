---
title: "嵌入式 Rust"
description: "跨越硬件与软件的边界：学习如何使用 Rust 编写裸机程序、操作寄存器以及构建高效的嵌入式系统。"
difficulty: advanced
estimatedTime: 10
keywords: ["嵌入式", "Bare-metal", "no_std", "微控制器", "物联网"]
---

在这一章中，我们将离开操作系统的「舒适区」，直接在裸机（Bare-metal）硬件上编写 Rust 代码。嵌入式开发是 Rust 的核心战场之一，它将 Rust 的内存安全性与硬件级的控制能力完美结合。

## 为什么选择 Rust 进行嵌入式开发？

长久以来，嵌入式世界被 C 语言统治。但随着硬件逻辑越来越复杂，C 语言的缺陷也愈发明显：
- **内存安全隐患**：缓冲区溢出和空指针异常在嵌入式系统中往往导致灾难性的宕机。
- **并发难题**：在处理中断和共享资源时，数据竞争几乎不可避免。
- **缺乏抽象**：为了性能，开发者不得不频繁操作硬件寄存器，导致代码难以维护和跨平台移植。

**Rust 带来了改变：**
- **零成本抽象**：你可以使用高级语法的便利，而编译器会生成与手写 C 一样精简的机器码。
- **类型安全**：借助 Rust 的类型系统，我们可以将硬件状态（如「引脚已配置为输出」）编码到类型中，在编译期拦截非法的硬件操作。
- **强大的生态**：通过 HAL（硬件抽象层）和 Embedded-HAL 标准，一份驱动代码可以轻松跑在不同的 MCU 上。

## 本章学习路线

我们将分模块深入探讨嵌入式开发的各个环节：

1. **[裸机开发基础](/RustCourse/chapters/20-embedded/01-no-std-basics)**：了解 `no_std` 环境、Panic 处理以及程序入口点。
2. **[内存布局与链接脚本](/RustCourse/chapters/20-embedded/02-memory-layout)**：深入了解内存映射、`memory.x` 以及启动时的内存段初始化。
3. **[硬件抽象与寄存器](/RustCourse/chapters/20-embedded/03-hardware-abstraction)**：学习 PAC、HAL 以及如何像操作对象一样操作寄存器。
4. **[中断与内存安全](/RustCourse/chapters/20-embedded/04-interrupts-concurrency)**：掌握嵌入式并发、原子操作以及如何在中断中安全访问数据。
5. **[异步嵌入式：Embassy](/RustCourse/chapters/20-embedded/05-async-embassy)**：了解现代化的异步方案，让嵌入式开发像写高级语言一样高效。
6. **[嵌入式实战：从裸机到微内核](/RustCourse/chapters/20-embedded/06-toolchain-debug)**：通过一个教学实验性质的项目，将本章所学的硬件操作、中断和并发知识串联起来。

准备好让你的代码在微小的芯片上跳动了吗？
