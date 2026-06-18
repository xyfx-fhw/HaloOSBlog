---
title: "工作空间"
description: "掌握 Cargo Workspace：用一个根 Cargo.toml 管理多个相关 crate，共享依赖版本、统一编译缓存。"
difficulty: beginner
estimatedTime: 25
keywords: ["workspace", "cargo", "多crate", "monorepo", "共享依赖", "virtual workspace"]
---

# 工作空间基础

## 为什么需要工作空间

随着项目规模增大，单个 crate 会变得臃肿难以维护。更常见的情况是：一个项目自然分成了几个部分——核心库 + CLI 工具 + 集成测试 + 辅助工具库。

如果把它们当作**独立项目**来管理，麻烦就来了：
- 每次修改核心库，都要先发布新版本，再更新工具的 `Cargo.toml`，非常繁琐
- 各自有独立的 `target/` 目录，重复编译同样的依赖，浪费大量时间
- 无法在一条命令里构建和测试所有部分

**工作空间（Workspace）** 就是解决这个问题的方案：把多个相关 crate 放在同一个目录下，用一个根 `Cargo.toml` 统一管理。

## 工作空间的文件结构

一个典型的工作空间长这样：

```text
my_project/            ← 工作空间根目录
├── Cargo.toml         ← 工作空间配置（根 Cargo.toml）
├── Cargo.lock         ← 共享的依赖锁文件
├── target/            ← 共享的构建目录
├── my_lib/            ← 成员 crate：核心库
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
└── my_cli/            ← 成员 crate：命令行工具
    ├── Cargo.toml
    └── src/
        └── main.rs
```

根目录的 `Cargo.toml` 使用 `[workspace]` 段落声明这是一个工作空间，并通过 `members` 列出所有成员：

```toml
# 根 Cargo.toml
[workspace]
members = [
    "my_lib",
    "my_cli",
]
resolver = "2"
```

> **`resolver = "2"`**：从 Rust 2021 edition 起，建议在工作空间中显式声明使用第 2 版依赖解析器，它在处理 features 时行为更一致、更符合直觉。

每个成员 crate 有自己的 `Cargo.toml`，跟普通项目一样：

```toml
# my_lib/Cargo.toml
[package]
name = "my_lib"
version = "0.1.0"
edition = "2021"
```

```toml
# my_cli/Cargo.toml
[package]
name = "my_cli"
version = "0.1.0"
edition = "2021"

[dependencies]
my_lib = { path = "../my_lib" }  # 引用同工作空间内的本地 crate
```

## 在工作空间中运行命令

在工作空间根目录下，可以用 `-p`（`--package`）指定针对哪个成员运行命令：

```bash
# 编译所有成员
cargo build --workspace

# 只编译 my_lib
cargo build -p my_lib

# 运行 my_cli（必须是二进制 crate）
cargo run -p my_cli

# 测试所有成员
cargo test --workspace

# 只测试 my_cli
cargo test -p my_cli

# 快速检查所有成员（不生成二进制文件，比 build 快）
cargo check --workspace
```

> **共享 `target/`**：所有成员共用同一个 `target/` 编译目录。这意味着：如果 `my_lib` 和 `my_cli` 都依赖 `serde`，它只会被编译一次。大型项目里这能节省大量编译时间。

# 依赖管理

## 共享的 Cargo.lock

工作空间只有**一个** `Cargo.lock`，位于根目录。这意味着所有成员 crate 使用同一份依赖版本快照。

好处：
- **版本一致**：`my_lib` 和 `my_cli` 使用完全相同版本的 `serde`，不会出现"我这里是 1.0.180，你那里是 1.0.193"这种诡异问题
- **确定性构建**：整个工作空间的构建行为完全可复现

## 工作空间级别的共享依赖

如果多个成员都依赖同一个外部 crate，你每次都要在各自的 `Cargo.toml` 里写，还要保证版本号一致——容易出错。

从 Rust 1.64 起，可以在根 `Cargo.toml` 的 `[workspace.dependencies]` 里**统一声明依赖**，各成员直接继承：

```toml
# 根 Cargo.toml
[workspace]
members = ["my_lib", "my_cli"]
resolver = "2"

[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
```

> **Features 小知识**：`features` 是依赖库的**可选功能模块**，编译时由你选择启用哪些（如 serde 的 derive 宏），未启用的代码完全不参与编译，可以减小二进制体积。

成员的 `Cargo.toml` 只需写 `workspace = true` 来继承：

```toml
# my_lib/Cargo.toml
[dependencies]
serde = { workspace = true }      # 继承根的版本和 features
anyhow = { workspace = true }

# 可以在继承基础上追加额外 features
tokio = { workspace = true, features = ["sync"] }
```

> **features 是累加的**：继承 `workspace.dependencies` 时，你只能追加 features，不能删除根里已有的。这与 Cargo feature 的"累加"设计是一致的——features 只能开启，不能关闭。

## 虚拟工作空间

### 什么是虚拟工作空间

有两种工作空间结构：

**非虚拟（常见）**：根目录本身是一个 crate

```text
my_project/           ← 根目录既是工作空间，也是一个 crate
├── Cargo.toml        （有 [package] + [workspace]）
├── src/
└── member1/
    └── Cargo.toml
```

**虚拟（特殊）**：根目录只是"容器"，本身不是 crate

```text
monorepo/             ← 根目录只是工作空间，不是 crate
├── Cargo.toml        （只有 [workspace]，没有 [package]）
├── lib_a/
│   └── Cargo.toml
├── lib_b/
│   └── Cargo.toml
└── lib_c/
    └── Cargo.toml
```

### 为什么要用虚拟工作空间

- **根没有代码**：有些项目天然是"多个独立库的集合"，比如 Tokio 生态（tokio、tokio-util、tokio-native-tls 各是独立库）
- **避免歧义**：没有一个"主"库，所以 `cargo build` 默认不知道该构建谁，必须明确指定，更清晰
- **平等性**：所有成员地位相同，没有"这个是主，那个是附属"的混乱

### 行为差异

| 场景 | 虚拟工作空间 | 有 [package] 的工作空间 |
|------|-----------|----------------------|
| `cargo build`（无参） | 构建**所有**成员 | 只构建**根** package |
| `cargo run` | 报错（没有根二进制） | 运行根的 main 函数 |
| `cargo test --workspace` | 测试所有成员 | 测试所有成员 |

**实际使用建议**：
- 如果你的项目有一个"主"库或应用（如 web 服务器），用**有 [package] 的工作空间**
- 如果是平等的多个库组合（如工具链、中间件库族），用**虚拟工作空间**

# 练习题

## 工作空间概念测验

```quiz single
Q: 工作空间中，Cargo.lock 文件的位置和数量是？
- 每个成员 crate 各有一个，位于各自目录下
+ 只有一个，位于工作空间根目录
- 只有一个，位于第一个成员目录下
- 不存在 Cargo.lock，工作空间不支持锁定依赖
E: 工作空间只有一个根 Cargo.lock，确保所有成员使用完全相同的依赖版本。这是工作空间"共享依赖一致性"的核心机制。
```

```quiz single
Q: 在有 [package] 的工作空间根目录运行 cargo build（不加任何参数），会发生什么？
- 构建所有成员
- 报错，必须指定 -p
+ 只构建根 package，不构建其他成员
- 询问用户要构建哪个成员
E: 当根 Cargo.toml 同时有 [package] 和 [workspace] 时，cargo build 的默认目标是根 package 本身。要构建所有成员，需要加 --workspace 参数。
```

```quiz multi
Q: 使用 Cargo 工作空间有哪些优势？（多选）
+ 共享 target/ 目录，相同依赖只编译一次，节省编译时间
+ 单个 Cargo.lock 保证所有成员使用相同的依赖版本
+ 可用 workspace.dependencies 统一管理共享依赖的版本号
- 工作空间内的 crate 不需要各自的 Cargo.toml
E: 工作空间的三大优势：共享编译缓存、一致的依赖版本、统一的依赖声明。但每个成员 crate 仍然需要自己的 Cargo.toml 来声明 [package] 信息和各自独特的依赖。
```

```quiz single
Q: 成员 crate 如何引用同一工作空间内的另一个 crate？
- 直接 use 对方的模块，不需要声明依赖
+ 在 Cargo.toml 的 [dependencies] 中用 path = "../other" 声明本地路径
- 只能通过发布到 crates.io 后再引用
- 在根 Cargo.toml 中声明一次，所有成员自动可见
E: 工作空间内的本地 crate 通过相对路径引用，如 my_lib = { path = "../my_lib" }。Cargo 会识别这是同工作空间的本地依赖，改动立刻生效，无需发布。
```

```quiz single
Q: 以下 Cargo.toml 片段中，my_cli 继承了 serde 后还额外追加了 features。这样做的结果是？

根 Cargo.toml：serde = { version = "1.0", features = ["derive"] }
my_cli 的 Cargo.toml：serde = { workspace = true, features = ["rc"] }

- 报错，继承时不能追加 features
- my_cli 的 serde 只有 rc，覆盖了根的 derive
+ my_cli 的 serde 同时启用 derive 和 rc
- 只有 derive，rc 被忽略
E: Cargo features 是累加的，继承时追加的 features 会与根声明的合并。最终 my_cli 使用的 serde 同时启用 derive（来自根）和 rc（来自成员追加）。
```
