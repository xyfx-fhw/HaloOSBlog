---
title: "过程宏"
description: "深入理解 Rust 过程宏的三种形式：自定义 derive 宏、类属性宏和类函数宏。学会使用 syn 和 quote 构建自己的过程宏。"
difficulty: advanced
estimatedTime: 10
keywords: ["过程宏", "proc-macro", "derive宏", "类属性宏", "类函数宏", "syn", "quote"]
---

# 过程宏

过程宏（Procedural Macros）是 Rust 元编程的高级形式。与基于模式匹配的声明宏不同，过程宏是**真正的 Rust 程序**——它接收编译器传入的 token 流，运行任意代码逻辑，输出新的 token 流让编译器继续编译。

## 本章内容

本章涵盖过程宏的三种形式，以及构建过程宏所需的核心工具链：

1. **过程宏基础** — token 流、proc-macro crate 结构
2. **自定义 derive 宏** — 为 trait 添加 `#[derive(...)]` 支持
3. **类属性宏** — 可应用于任意项的自定义属性
4. **类函数宏** — 接受任意 token 序列的函数形式宏
5. **syn 与 quote** — 解析和生成代码的标准工具链
6. **综合练习** — 实战练习巩固所学

## 前置知识

学习本章前，请确保已掌握：

- 第 2 章：声明宏（`macro_rules!`）基础
- 第 11 章：trait 与 trait 实现
- 第 15 章：智能指针（了解 `TokenStream` 的所有权模型）
