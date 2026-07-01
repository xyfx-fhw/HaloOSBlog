---
title: "项目工程化"
description: "掌握 Cargo 工程化能力：工作空间、条件编译 Features、构建脚本 build.rs 和文档注释，让项目可扩展、可维护。"
difficulty: beginner
estimatedTime: 5
keywords: ["workspace", "features", "build.rs", "文档注释", "doctest", "cargo"]
---

当项目从单个文件成长为多个 crate 协作的大型工程，你需要掌握 Rust 的工程化能力。本章覆盖三个核心工具：用 Workspace 统一管理多 crate 依赖，用构建脚本在编译前执行自定义逻辑，以及写出能自动测试的文档注释。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [工作空间 Workspace](./01-workspace) | 用一个根 `Cargo.toml` 管理多个 crate，共享依赖版本与编译缓存 |
| [构建脚本 build.rs](./02-build-scripts) | 编译前的自定义脚本：代码生成、链接原生库、features 条件编译 |
| [文档注释与 doctest](./03-doc-comments) | `///` 文档注释的写法，以及嵌入代码示例并自动测试 |
