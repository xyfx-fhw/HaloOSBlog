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

> **Features 小知识**：`features` 是依赖库的**可选功能模块**，编译时由你选择启用哪些（如 serde 的 derive 宏），未启用的代码完全不参与编译，可以减小二进制体积。文章后面会专门讲解。

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

# Features 与条件编译

## 什么是 Features 以及为什么需要它们

在工作空间讲解中，我们看到了这样的用法：

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

这里的 `features = ["full"]` 是什么意思？它表示："我要使用 tokio 这个库，但只启用它的 'full' 功能集"。

**背景**：很多库会提供多个可选功能。比如 tokio 库可以提供：
- 异步运行时（rt）
- 同步原语（sync）
- 计时器（time）
- I/O 工具（io-util）
- 等等...

库的作者不想强迫所有用户都编译所有功能，因为：
- 编译时间长
- 二进制文件体积大
- 可能有不需要的依赖被引入

所以库提供了 **features** 机制：用户可以选择"我只要这些功能"。

## 两个视角理解 Features

### 视角 1：作为库的使用者（用户）

当你使用一个提供 features 的库时，你可以：

```toml
# 使用默认 features（库作者推荐的）
tokio = "1.0"

# 启用特定 features
tokio = { version = "1.0", features = ["sync", "time"] }

# 启用所有 features
tokio = { version = "1.0", features = ["full"] }

# 关掉默认 features，自己选
tokio = { version = "1.0", default-features = false, features = ["rt"] }
```

### 视角 2：作为库的设计者（库作者）

现在反过来，**如果你在设计一个库**，怎么定义 features？

假设你要设计一个网络库，想提供可选功能：

```toml
# Cargo.toml

[features]
# 定义有哪些 features，以及它们之间的关系
default = ["http"]           # 默认启用 http feature
http = []                    # http feature 本身不需要额外依赖
websocket = ["dep:tokio-tungstenite"]  # websocket 需要额外的库
tls = ["dep:native-tls"]     # tls 需要额外的库

[dependencies]
# 这些库用 optional = true 标记为可选
# 它们只在对应的 feature 被启用时才会被编译和链接
native-tls = { version = "0.2", optional = true }
tokio-tungstenite = { version = "0.21", optional = true }
```

**逻辑关系**：
1. `[dependencies]` 中，用 `optional = true` 声明"这个库是可选的"
2. `[features]` 中，用 `dep:库名` 说"当这个 feature 被启用时，才引入这个库"
3. 这样就建立了：feature 开启 → 库被引入 → 代码被编译

## 库设计者的三个步骤

### 步骤 1：声明可选依赖

```toml
[dependencies]
optional-lib = { version = "1.0", optional = true }
```

`optional = true` 表示这个库默认**不会**被下载和编译。

### 步骤 2：在 Features 中关联

```toml
[features]
my-feature = ["dep:optional-lib"]
```

`dep:optional-lib` 表示"启用 my-feature 时，引入 optional-lib 库"。

注意：是 `dep:库名`，不是 `库名`。这样写是为了明确区分"库的名字"和"feature 的名字"。

### 步骤 3：在代码中条件编译

```rust
// 基础功能，总是存在
pub fn basic_http() {
    println!("HTTP 基础功能");
}

// WebSocket 功能：只在启用 websocket feature 时编译
#[cfg(feature = "websocket")]
pub fn ws_connect(url: &str) {
    use tokio_tungstenite;  // 这个 use 也被条件编译
    println!("WebSocket 连接：{}", url);
}

// TLS 功能：只在启用 tls feature 时编译
#[cfg(feature = "tls")]
pub fn tls_connect(addr: &str) {
    use native_tls;
    println!("TLS 连接到 {}", addr);
}
```

**关键**：当用户没有启用 `websocket` feature 时：
- 代码中的 `ws_connect` 函数**不会被编译**
- `tokio-tungstenite` 库**不会被下载**
- 二进制文件中**没有相关代码**

这就是 features 的"零成本"抽象。

## 用户如何选择 Features

当用户使用你的库时：

```toml
[dependencies]
# 场景 1：用默认配置（http）
my_net_lib = "1.0"

# 场景 2：要 websocket（自动引入 tokio-tungstenite）
my_net_lib = { version = "1.0", features = ["websocket"] }

# 场景 3：同时要 tls（自动引入 native-tls）
my_net_lib = { version = "1.0", features = ["tls", "websocket"] }

# 场景 4：关掉默认的 http，只要 tls
my_net_lib = { version = "1.0", default-features = false, features = ["tls"] }
```

用户通过 `features` 参数选择，Cargo 会：
1. 根据选择的 features，自动引入对应的库
2. 根据引入的库，自动启用代码中的条件编译
3. 最终生成符合需求的二进制文件

## 从命令行启用 Features

库作者设计好 features 后，用户也可以从命令行选择：

```bash
# 启用指定 features
cargo build --features "websocket,tls"

# 启用所有 features（包括未来可能添加的）
cargo build --all-features

# 不启用默认 features，只选特定的
cargo build --no-default-features --features tls
```






## 条件编译与 Features

**前置阅读**：条件编译的基础语法（`#[cfg]` 属性、`cfg!()` 宏等）已在《属性》一章详细讲解。本节专注于**如何在 Feature 系统中使用条件编译**。

### 在库代码中应用 Features

`#[cfg(feature = "xxx")]` 让你根据 feature 是否开启来选择性编译代码：

```rust
// 结合多个条件
#[cfg(all(feature = "tls", target_os = "linux"))]
fn linux_tls_only() { /* ... */ }

#[cfg(any(feature = "tls", feature = "native-tls"))]
fn any_tls_support() { /* ... */ }

#[cfg(not(feature = "std"))]
fn no_std_impl() { /* ... */ }
```

当 feature 未开启时，这些代码**完全不会被编译进二进制文件**，实现了真正的按需功能。

### 可选依赖与 Features

当你声明一个可选依赖时，它默认不会被编译。只有开启对应的 feature 才会引入：

```toml
[features]
json = ["dep:serde_json"]     # 启用 json feature 时，引入 serde_json
tls = ["dep:native-tls"]

[dependencies]
serde_json = { version = "1.0", optional = true }
native-tls = { version = "0.2", optional = true }
```

在代码中使用可选依赖：

```rust
#[cfg(feature = "json")]
use serde_json::json;

#[cfg(feature = "tls")]
use native_tls::TlsConnector;
```

### Features 的关键特性

- **累加性**：features 只能开启，不能关闭；一旦某个 feature 被开启，就保持开启
- **零成本**：未启用的代码不参与编译
- **依赖关系**：feature 可以依赖其他 feature（如 `websocket = ["http"]`）

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

## Features 与工作空间

```quiz single
Q: 下列关于 Cargo features 的说法，哪个是正确的？
- Features 可以用 --disable-features 关闭已开启的 feature
- 每个 feature 都必须对应一个依赖库
+ Features 是累加的：一旦开启就不会再被关闭
- default features 不能被用户关掉
E: Features 的核心特性是"累加性"——只能开启，不能关闭。这保证了工作空间内所有成员使用一致的依赖配置。如果成员 A 依赖的库开启了某 feature，而成员 B 不想要，Cargo 也会确保这个 feature 依然开启，避免版本不一致。
```

```quiz multi
Q: 下列哪些是 Cargo 命令的正确用法？（多选）
+ cargo build --features "websocket,tls"  （启用指定 features）
+ cargo build --all-features  （启用所有 features）
+ cargo build --no-default-features  （禁用默认 features）
- cargo build --disable-features tls  （不存在这个参数）
E: Cargo 支持 --features（指定）、--all-features（全部）、--no-default-features（关掉默认）。没有 --disable-features 这个参数。
```

```quiz single
Q: 在 [features] 中声明 websocket = ["http"] 表示什么？
- websocket 和 http 是互斥的，启用一个时另一个不可用
- http 是 websocket 的前提，如果没有 http，websocket 无法使用
+ 启用 websocket feature 时，http feature 也会自动被启用
- websocket 和 http 是同一个 feature 的两个名字
E: features 的依赖关系是"启用 A 时自动启用 B"。websocket = ["http"] 意味着任何开启 websocket 的场景都会自动拥有 http feature，体现了 features 的累加性。
```

```quiz single
Q: 想在自己的项目中使用某个库，但不想要它的默认 features，应该怎么写？
- 无法关掉默认 features，必须全部接受
+ my_lib = { version = "1.0", default-features = false }
- my_lib = { version = "1.0", features = [] }
- my_lib = { version = "1.0", no-default = true }
E: 用 default-features = false 可以关掉依赖库的默认 features（注意不是自己 crate 的 default features，而是那个依赖的）。然后再用 features = ["..."] 单独指定需要的功能。
```

## 高级应用

```quiz single
Q: 下列关于条件编译的说法，哪个正确？
- `#[cfg(...)]` 和 `cfg!(...)` 在任何场景下都可以互换使用
+ `#[cfg(...)]` 让不满足条件的代码完全不编译，`cfg!(...)` 仍然编译但运行时返回 bool
- `cfg!(...)` 比 `#[cfg(...)]` 性能更好
- 两者功能相同，只是语法不同
E: 关键区别在于编译行为。#[cfg(...)] 属性作用于整个 item，不满足条件时代码根本不进入编译结果。cfg!() 宏返回编译时常数，代码始然被编译但 false 分支会被优化掉。如果代码使用了平台专属 API，必须用 #[cfg(...)]。
```

```quiz multi
Q: 在库设计中，使用 features 的好处有哪些？（多选）
+ 减小二进制体积（用户只编译需要的功能）
+ 简化依赖树（可选依赖只在需要时引入）
+ 支持不同的使用场景（同一份代码适配多种场景）
- features 不影响编译结果大小，只是代码组织方式
E: Features 的三大价值都体现在这里。未启用的代码完全不编译，可以显著减小体积。可选依赖只在 feature 启用时引入。通过 feature 组合，同一个库可以支持嵌入式、web、CLI 等多种场景。
```
