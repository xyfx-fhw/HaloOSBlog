---
title: "项目架构"
description: "动手写代码之前，先规划 rtodo 的 Workspace 结构和整体设计思路，理解每个 crate 的职责和数据流向"
difficulty: intermediate
estimatedTime: 15
keywords: ["项目架构", "workspace", "lib crate", "bin crate", "设计思路", "分层"]
---

# 文件结构搭建

## 用 Workspace 管理两个 crate

`rtodo` 是一个命令行工具，虽然功能不复杂，出于教学目的，我们将工程做的尽量模块化，不把所有代码堆在一个文件里。真实的小型项目通常按**职责**拆分：

```text
rtodo/                       ← workspace 根目录
├── Cargo.toml               ← workspace 配置
│
├── rtodo-core/              ← lib crate：核心数据与逻辑
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs           ← Todo、TodoList
│
└── rtodo/                   ← bin crate：命令行入口
    ├── Cargo.toml
    └── src/
        ├── lib.rs           ← Command、parse_args
        └── main.rs          ← 程序入口（run + main）
```

| crate | 类型 | 职责 |
|-------|------|------|
| `rtodo-core` | lib | 数据结构、业务逻辑、JSON 读写；不依赖 CLI 层 |
| `rtodo` | lib + bin | `lib.rs` 定义 Command 并负责参数解析，`main.rs` 只负责启动 |

这种拆分方式有一个明显的好处：**核心逻辑与界面逻辑解耦**。如果未来想做一个 TUI 或 Web 界面，只需新增一个 bin crate 来调用同一个 `rtodo-core`，核心代码不需要动。

## 搭建文件结构

### 第一步：创建 workspace 根目录

Workspace 根目录本身**没有** `src/`，只是一个容器。先建好并进入：

```bash
mkdir rtodo && cd rtodo
```

### 第二步：创建 lib crate

核心逻辑放在 lib crate 里，方便单独测试，未来也容易给其他 bin crate 复用：

```bash
cargo new rtodo-core --lib
```

`--lib` 标志让 cargo 生成 `src/lib.rs` 而非 `src/main.rs`。

### 第三步：创建 bin crate

命令行入口是一个单独的 bin crate，只负责解析参数和打印输出：

```bash
cargo new rtodo
```

不加标志时默认生成 bin crate（`src/main.rs`）。`lib.rs` 需要手动创建：

```bash
touch rtodo/src/lib.rs
```

### 第四步：在根目录创建 `Cargo.toml`

两个 crate 都建好后，在根目录创建一个空文件，准备写入 workspace 配置：

```bash
touch Cargo.toml
```

此时 Cargo.toml 还是空的，下一节填写内容。

# 配置 Cargo.toml

文件结构建好之后，逐一填写三份 `Cargo.toml`。

## workspace 根目录

根目录的 `Cargo.toml` 不描述任何代码，只声明这是一个 workspace 以及它包含哪些成员：

```toml
[workspace]
members = ["rtodo-core", "rtodo"]
resolver = "2"
```

Cargo 看到 `[workspace]` 字段，就会把两个子目录的 crate 统一管理——共享一份 `Cargo.lock`，`cargo build` 可以一次编译所有成员。

## rtodo-core

`cargo new` 自动生成的 `rtodo-core/Cargo.toml` 只需确认 `edition` 即可，依赖后续章节用到时再按需添加：

```toml
[package]
name = "rtodo-core"
version = "0.1.0"
edition = "2024"
```

## rtodo

`rtodo` 需要引用本地的 `rtodo-core`，用 `path` 指向相对路径：

```toml
[package]
name = "rtodo"
version = "0.1.0"
edition = "2024"

[dependencies]
rtodo-core = { path = "../rtodo-core" }
```

`path = "../rtodo-core"` 是 workspace 内部引用本地 crate 的标准写法。

## 验证

三份 `Cargo.toml` 填好后，在 workspace 根目录运行：

```bash
cargo build
```

cargo 会同时编译两个 crate，没有报错就说明配置正确。

# 数据如何流动

```text
终端输入：rtodo add "写完教程"
         ↓
main()  →  run()（rtodo/src/main.rs）
                ↓
         parse_args()（rtodo/src/lib.rs）
                ↓
         解析成 Command::Add("写完教程")
                ↓
         调用 rtodo_core::TodoList 的方法
                ↓
         TodoList 修改内存中的 Vec<Todo>
                ↓
         序列化为 JSON，写回 rtodo.json
```

`main()` 只负责调用 `run()` 并处理顶层错误。`run()` 是真正的协调者：先调 `parse_args()` 拿到 `Command`，再根据命令类型调用 `TodoList` 对应的方法。

> 本章代码需要在本地运行，无法在 Playground 中直接执行。
