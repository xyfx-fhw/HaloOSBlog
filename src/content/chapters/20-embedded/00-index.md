---
title: "嵌入式 Rust"
description: "跨越硬件与软件的边界：学习如何使用 Rust 编写裸机程序、操作寄存器以及构建高效的嵌入式系统。"
difficulty: advanced
estimatedTime: 10
keywords: ["嵌入式", "Bare-metal", "no_std", "微控制器", "物联网"]
---

在这一章中，我们将离开操作系统的「舒适区」，直接在裸机（Bare-metal）硬件上编写 Rust 代码。嵌入式开发是 Rust 的核心战场之一——Rust 的内存安全性与硬件级的控制能力，解决了长久以来 C 语言嵌入式开发中内存安全隐患、并发竞争和难以跨平台抽象的痛点。

Rust 嵌入式的核心优势：**零成本抽象**（高级语法，C 级机器码）、**类型安全**（将硬件状态编码进类型，编译期拦截非法操作）、**强大生态**（Embedded-HAL 标准，一份驱动跑在不同 MCU 上）。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [裸机开发基础](./01-no-std-basics) | `no_std` 环境、Panic 处理与程序入口点 |
| [内存布局与链接脚本](./02-memory-layout) | 内存映射、`memory.x` 与启动时的内存段初始化 |
| [硬件抽象与寄存器](./03-hardware-abstraction) | PAC、HAL 以及类型安全的寄存器操作 |
| [中断与内存安全](./04-interrupts-concurrency) | 嵌入式并发、原子操作，中断中的安全数据访问 |
| [异步嵌入式：Embassy](./05-async-embassy) | 现代化异步嵌入式框架，高效处理多任务 |
| [工具链与调试](./06-toolchain-debug) | 嵌入式工具链配置、调试手段与实战项目串联 |
