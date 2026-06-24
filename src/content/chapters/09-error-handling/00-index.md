---
title: "错误处理"
description: "掌握 Rust 错误处理体系：panic!/Result/?，写出健壮可维护的代码。"
difficulty: beginner
estimatedTime: 5
keywords: ["错误处理", "panic", "Result", "?"]
---

程序运行中不可避免地会遇到各种错误。不同于很多语言依赖异常（exception）机制，Rust 把错误分成了**不可恢复**和**可恢复**两类，分别用不同的工具处理，让错误处理从"猜测"变成"明确"。

本章按递进顺序介绍 Rust 的错误处理体系：

1. **panic! 与不可恢复错误** — 程序遇到 bug 或不可能继续的状态时，panic! 是正确的选择；学会读懂 panic 输出和 backtrace

2. **Result\<T, E\>** — 大多数错误是可以处理的；用 Result 枚举把"可能失败"写进函数签名，让调用者做出选择

3. **? 运算符** — 错误传播的语法糖；`?` 如何消除样板代码，以及它背后的 From 转换机制

4. **何时 panic，何时 Result** — 两种工具的决策框架；用类型系统编码不变量的思路

5. **多种错误来源与遍历 Result** — `Box<dyn Error>` 快速处理多种错误来源；遍历集合时 filter_map/collect/partition 三种策略

6. **综合练习** — 动手巩固全章内容
