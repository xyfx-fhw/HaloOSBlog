---
title: "过程宏"
description: "深入理解 Rust 过程宏的三种形式：自定义 derive 宏、类属性宏和类函数宏。学会使用 syn 和 quote 构建自己的过程宏。"
difficulty: advanced
estimatedTime: 10
keywords: ["过程宏", "proc-macro", "derive宏", "类属性宏", "类函数宏", "syn", "quote"]
---

过程宏（Procedural Macros）是 Rust 元编程的高级形式。与基于模式匹配的声明宏不同，过程宏是**真正的 Rust 程序**——它接收编译器传入的 token 流，运行任意代码逻辑，输出新的 token 流让编译器继续编译。

过程宏有三种形式：自定义 `derive` 宏（`#[derive(MyTrait)]`）、类属性宏（`#[my_attr]`）和类函数宏（`my_macro!(...)`）。它们共同的核心工具链是 `syn`（解析 token 流为 AST）和 `quote`（将 AST 转回代码）。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [过程宏基础](./01-proc-macro-basics) | token 流的概念，proc-macro crate 的项目结构与调试方法 |
| [自定义 derive 宏](./02-derive-macros) | 为 trait 添加 `#[derive(...)]` 支持，自动生成 impl 代码 |
| [类属性宏](./03-attribute-macros) | 可应用于任意语法项的自定义属性宏 |
| [类函数宏](./04-function-like-macros) | 接受任意 token 序列的函数形式宏 |
| [syn 与 quote](./05-syn-and-quote) | 解析 AST 和生成代码的标准工具链 |
