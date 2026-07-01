---
title: "综合项目"
description: "用 Rust 从零构建一个实用的命令行 Todo 工具，综合运用结构体、枚举、迭代器、错误处理、文件 I/O、JSON 序列化与单元测试"
difficulty: beginner
estimatedTime: 5
keywords: ["综合项目", "CLI", "任务管理器", "todo", "serde", "JSON", "命令行", "搜索"]
---

## 构建一个命令行任务管理器

本章构建一个真正实用的命令行工具：**`rtodo`** —— __一个可以在终端里增删查改任务的 Todo 管理器__。

```bash
$ rtodo add "写完 Rust 教程第三章"
✓ 已添加：[1] 写完 Rust 教程第三章

$ rtodo add "复习生命周期"
✓ 已添加：[2] 复习生命周期

$ rtodo list
  ID  状态  任务
  ──────────────────────────────────
  1   [ ]   写完 Rust 教程第三章
  2   [ ]   复习生命周期

$ rtodo search "生命"
搜索 "生命"，找到 1 条：
  ──────────────────────────────────
  2   [ ]   复习生命周期

$ rtodo done 1
✓ 已完成：[1] 写完 Rust 教程第三章

$ rtodo remove 1
✓ 已删除：[1] 写完 Rust 教程第三章
```

任务数据保存在本地 JSON 文件里，重启终端后仍然保留。

## 这个项目会用到什么

| 知识点 | 在项目中的体现 |
|--------|--------------|
| 结构体 + impl | `Todo { id, title, completed }` 及其方法 |
| 枚举 | `Command`（Add/List/Done/Remove/Search/Help） |
| `Vec` 操作 | 增删改查任务列表 |
| `serde` + `serde_json` | 把任务列表序列化/反序列化为 JSON 文件 |
| 文件 I/O | 读写 `~/.rtodo.json` |
| 错误处理（`Result` + `?`） | 文件读写、参数解析的失败处理 |
| `std::env::args()` | 解析命令行参数 |
| 迭代器 + 闭包 | `.filter()` 搜索关键词、`.find()` 查 ID、`.position()` 定位下标 |
| `fmt::Display` trait | 任务条目的格式化输出 |
| 单元测试 | 测试 CRUD 与搜索逻辑 |

## 本章结构

1. **数据建模** — `Todo` 结构体、`Command` 枚举（含 `Search`）、参数解析
2. **数据持久化** — JSON 序列化、文件读写、存储路径
3. **实现命令** — add/list/done/remove/search 的完整实现
4. **输出与测试** — 彩色终端输出、单元测试、可选扩展

## 创建项目

```bash
cargo new rtodo
cd rtodo
```

`Cargo.toml` 添加依赖：

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

> 本章代码需要在本地 cargo 项目中运行。`serde` 是 Rust 生态最常用的序列化库，几乎所有实际项目都会用到。
