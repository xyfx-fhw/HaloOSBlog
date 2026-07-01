---
title: "错误处理"
description: "掌握 Rust 错误处理体系：panic!/Result/?，写出健壮可维护的代码。"
difficulty: beginner
estimatedTime: 5
keywords: ["错误处理", "panic", "Result", "?"]
---

不同于许多语言依赖异常（exception）机制，Rust 把错误分成两类：**不可恢复错误**（用 `panic!`）和**可恢复错误**（用 `Result<T, E>`）。这种区分让调用者清楚知道一个函数"可能失败"，并强制处理失败情况——错误处理从"猜测"变成了"明确"。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [panic! 与不可恢复错误](./01-panic) | 何时触发 panic，如何读懂 panic 输出与 backtrace |
| [Result\<T, E\>](./02-result) | 可恢复错误的表达方式，`unwrap`、`expect` 与模式匹配处理 |
| [? 运算符](./03-question-mark) | 错误传播的语法糖，以及背后的 `From` 转换机制 |
| [何时 panic，何时 Result](./04-when-to-panic) | 两种错误处理方式的决策框架，用类型编码不变量的思路 |
| [多种错误来源](./05-multiple-errors) | `Box<dyn Error>` 处理多类错误，遍历集合时的错误处理策略 |
