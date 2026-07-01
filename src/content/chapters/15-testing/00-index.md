---
title: "测试"
description: "掌握 Rust 测试体系：从编写单元测试、控制测试运行方式，到组织集成测试。"
difficulty: beginner
estimatedTime: 15
keywords: ["测试", "单元测试", "集成测试", "cargo test", "assert", "should_panic"]
---

代码能跑起来不代表代码是正确的。Rust 内置了完善的测试工具链——无需引入第三方库，`cargo test` 一条命令即可运行所有测试。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [编写单元测试](./01-unit-tests) | `#[test]`、断言宏、`should_panic` 与用 `Result` 编写测试 |
| [控制测试运行](./02-test-control) | 并行与串行、过滤指定测试、忽略耗时测试 |
| [集成测试](./03-integration-tests) | `tests/` 目录结构、与单元测试的分工与组合 |
