---
title: "项目工程化"
description: "掌握 Cargo 工程化能力：工作空间、条件编译 Features、构建脚本 build.rs 和文档注释，让项目可扩展、可维护。"
difficulty: beginner
estimatedTime: 10
keywords: ["workspace", "features", "build.rs", "文档注释", "doctest", "cargo"]
---

# 项目工程化

当你的 Rust 项目从"单个文件"成长为"多个 crate 协作"的大型工程项目时，就需要掌握 Rust 的工程化能力。本章介绍四个核心主题：

1. **工作空间（Workspace）** — 用一个根 `Cargo.toml` 管理多个相关 crate，共享依赖版本、统一编译缓存
2. **Features 与条件编译** — 用 feature flag 按需开启功能，一份代码适配不同使用场景
3. **构建脚本 build.rs** — 在编译前运行自定义代码：代码生成、链接原生库、探测编译环境
4. **文档注释与 doctest** — 写出可自动测试的文档，让代码附带活的示例

通过这一章，你将能设计出可扩展、可维护的 Cargo 项目结构。
