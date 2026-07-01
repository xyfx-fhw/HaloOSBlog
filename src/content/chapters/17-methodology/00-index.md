---
title: "开发方法论"
description: "以大工程视角串联 Rust 项目的完整生命周期：架构设计、编码流程、代码规范、持续集成到性能优化。"
difficulty: beginner
estimatedTime: 5
keywords: ["开发方法论", "工程化", "架构", "CI", "TDD"]
---

写出能编译的 Rust 代码只是第一步。在真实的工程项目里，你还需要回答：代码应该怎么组织、编码时先写什么、怎么保证多人协作时代码风格一致、如何自动检查代码质量、如何找出性能瓶颈。

这一章以一个**从零到上线的大工程**为背景，按生命周期顺序讲解 Rust 工程化的核心方法论。

<img src="/RustCourse/diagrams/method.svg" alt=" 方法论" style="max-width:100%;margin:1rem 0;" />

> 这一章的内容偏"工程实践"，不需要背语法，重在理解**为什么要这样做**，建立工程思维。

## 本章目录

| 文章 | 核心问题 |
|------|---------|
| [工程架构设计](./01-architecture) | 如何把需求拆成模块？Cargo Workspace 怎么规划？ |
| [编码流程与 TDD](./02-coding-flow) | 先定结构体还是 Trait？怎么用测试驱动实现？ |
| [Lint、Clippy 与 rustfmt](./03-lint) | 如何让工具自动发现问题、统一代码风格？ |
| [持续集成与依赖管理](./04-ci) | 如何自动化质量检查？依赖怎么选、怎么审计？ |
| [性能分析与基准测试](./05-profiling) | 如何用 criterion + flamegraph 定位并量化性能问题？ |
