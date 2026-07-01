---
title: "调试"
description: "掌握 Rust 程序的调试手段：dbg! 宏、IDE 调试器与结构化日志。"
difficulty: beginner
estimatedTime: 5
keywords: ["调试", "dbg!", "logging", "rust-analyzer"]
---

程序出 bug 是家常便饭。新手的第一反应通常是疯狂插入 `println!`——这能解决问题，但 Rust 提供了更好的工具：`dbg!` 宏快速定位逻辑错误，IDE 调试器用于复杂 bug 的单步排查，结构化日志让长期运行的程序留下可过滤的诊断信息。

> 调试能力是工程师的核心素养。掌握这些工具，遇到 bug 不再靠"感觉"，而是靠系统化排查。

## 本章目录

| 文章 | 适合什么情况 |
|------|------------|
| [dbg! 宏](./01-dbg-macro) | 临时查看表达式的值，快速定位逻辑错误 |
| [IDE 调试器](./02-ide-debugger) | 需要单步执行、观察多个变量状态的复杂 bug |
| [日志输出](./03-logging) | 长期运行的程序或库代码，需要可控的诊断信息 |
