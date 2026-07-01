---
title: "Package 和 Crate"
description: "理解 Rust 中 Package 和 Crate 的概念，学会它们的关系、Cargo 约定，掌握如何组织单个或多个二进制项目。"
difficulty: beginner
estimatedTime: 20
keywords: ["package", "crate", "cargo", "项目组织", "二进制", "库"]
---

# Package 和 Crate

## 为什么需要 Package 和 Crate

随着项目变大，代码会逐渐增多。Rust 提供了一套**模块系统**来帮助你组织代码，让功能清晰、可复用、易于维护。这个模块系统的基础就是 **Package**（包）和 **Crate**（箱）这两个概念。

虽然它们经常一起出现，但它们是不同的东西：
- **Crate** 是代码的**编译单元**，是 Rust 编译器处理的最小单位
- **Package** 是代码的**组织单位**，用 Cargo 来管理

## 理解 Crate

### 什么是 Crate

**Crate** 是 Rust 中最小的可编译单位。一个 crate 包含：
- 一个 **crate root**（根源文件）
- 由此生成的**单个二进制程序**或**单个库**

你可以认为 crate 是一个"编译产物"——编译器会根据 crate root 生成一个可执行文件或库文件。

### Crate 的两种类型

<img src="/RustCourse/diagrams/crate.svg" alt="crate" style="max-width:100%;margin:1rem 0;" />

#### **二进制 Crate（Binary Crate）**

二进制 crate 编译后生成一个**可执行程序** (`.bin` / `.elf`)。必须有一个 `main()` 函数作为程序入口。

```rust runnable
fn main() {
    println!("这是一个二进制 crate 的例子");
}
```

#### **库 Crate（Library Crate）**

库 crate 编译后生成一个**库文件**（`.rlib`），没有 `main()` 函数。目的是被其他项目调用和重用。

```rust
// 库 crate 的例子：没有 main()，只有可供外部调用的函数
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

## 理解 Package

### 什么是 Package

**Package**（包）是一个使用 Cargo 管理的项目目录。一个 package：
- 包含一个 **Cargo.toml** 文件（项目配置）
- 至多包含**一个库 crate**（library crate）
- 可以包含**零或者任意多个二进制 crate**（binary crate）
- **至少包含一个 crate**（二进制或库）

<img src="/RustCourse/diagrams/package.svg" alt="包" style="max-width:100%;margin:1rem 0;" />

你可以认为 package 是"项目文件夹"的概念——它包装了一个或多个 crate，让你用 Cargo 来管理它们。

### Cargo.toml：Package 的清单

**Cargo.toml** 是 Cargo 用来管理 package 的配置文件。它定义了：

```toml
[package]
name = "my-app"              # package 的名称
version = "0.1.0"            # package 版本
edition = "2021"             # Rust 版本

[dependencies]
serde = "1.0"                # 依赖的外部 crate
```

**关键特点：**
- 每个 package 只有**一个** Cargo.toml
- Cargo 会根据 Cargo.toml 中的配置来构建和管理这个 package 中的所有 crate
- **Cargo.toml 中不需要列出 crate**，Cargo 会按约定自动识别 `src/main.rs`、`src/lib.rs` 等
- 你可以在这里声明依赖、配置构建选项、设置 package 元数据

# Package 和 Crate 的关系

现在你已经知道了 Package 和 Crate 的定义，那它们是如何工作的呢？让我们看看一些实际的例子。

<img src="/RustCourse/diagrams/angle_of_view.svg" alt="二者的对应视角" style="max-width:100%;margin:1rem 0;" />

> **核心认知**：
> - **Package** 是从**逻辑管理**的视角——"我要如何组织这个项目？用 Cargo.toml 来管理依赖、版本、配置"
> - **Crate** 是从**编译**的视角——"Rust 编译器该如何处理这些文件？一个 crate root 生成一个编译产物"
>
> 一个 package 可以包含多个 crate，但一个 crate 只能编译生成一个二进制或一个库。

## Cargo 的约定：文件到 Crate 的映射

当你用 Cargo 创建项目时，Cargo 遵循一套**约定**来自动识别 crate：

| 源文件 | Cargo 认为这是 | 生成物 |
|-------|-------------|-------|
| `src/main.rs` | 与 package 同名的**二进制 crate** 的根 | 可执行程序 |
| `src/lib.rs` | 与 package 同名的**库 crate** 的根 | 库文件 |
| `src/bin/*.rs` 中的每个文件 | 独立的**二进制 crate** | 各自的可执行程序 |

**这意味着你不需要在 Cargo.toml 中显式列出这些 crate，Cargo 会自动找到它们。**

### 实例 1：最简单的 Package（只有二进制）

```bash
cargo new my-app
```

生成的结构：

```text
my-app/
├── Cargo.toml
└── src/
    └── main.rs
```

这个 package 包含 **1 个 crate**：
- **二进制 crate**（名为 `my-app`），从 `src/main.rs` 开始

### 实例 2：只有库 crate

如果你想创建一个库供其他项目使用：

```bash
cargo new --lib my-library
```

生成的结构：

```text
my-library/
├── Cargo.toml
└── src/
    └── lib.rs
```

这个 package 包含 **1 个 crate**：
- **库 crate**（名为 `my-library`），从 `src/lib.rs` 开始

**使用方式：**

```bash
# 编译库（生成 .rlib 文件）
$ cargo build

# 测试库
$ cargo test

# 发布到 crates.io
$ cargo publish
```

### 实例 3：同时有库和二进制

有时你想提供一个库，同时也有一个可执行程序来演示库的用法。基于只有库的 crate 的包手动添加 `src/main.rs`，或者基于只有二进制 crate 的包手动添加 `src/lib.rs`：

```text
my-library/
├── Cargo.toml
└── src/
    ├── lib.rs      ← 库 crate 的根
    └── main.rs     ← 二进制 crate 的根
```

这个 package 包含 **2 个 crate**（都同名 `my-library`）：
- **库 crate**：从 `src/lib.rs` 开始
- **二进制 crate**：从 `src/main.rs` 开始

**使用方式：**

```bash
# 编译整个 package（包含两个 crate）
$ cargo build

# 运行二进制程序（演示库）
$ cargo run

# 只构建库
$ cargo build --lib

# 只构建二进制
$ cargo build --bin my-library
```

**库内部的代码可以被二进制调用：**

```rust
// src/lib.rs
pub fn greet() {
    println!("来自库的问候");
}
```

```rust
// src/main.rs
fn main() {
    my_library::greet();  // 调用库中的公开函数
}
```

### 实例4：多二进制 Crate 的项目

<img src="/RustCourse/diagrams/package_and_crate.svg" alt="安全与速度的矛盾" style="max-width:100%;margin:1rem 0;" />

一个 package 可以包含**多个二进制 crate**。把它们放在 `src/bin/` 目录中，每个文件都会被编译成独立的二进制程序。

> **注意**：`src/bin/` 目录下的二进制 crate 需要**手动创建**，Cargo 没有提供自动生成命令。只需创建 `.rs` 文件即可，Cargo 会自动识别。

首先创建基础项目：

```bash
cargo new my-project
```

然后手动创建额外的二进制：

```bash
mkdir -p src/bin
touch src/bin/tool-a.rs
touch src/bin/tool-b.rs
```

最终结构：

```text
my-project/
├── Cargo.toml
├── src/
│   ├── main.rs                # 二进制 crate（命名为 "my-project"）
│   ├── lib.rs                 # 库 crate（命名为 "my-project"）
│   └── bin/
│       ├── tool-a.rs          # 二进制 crate（命名为 "tool-a"）
│       └── tool-b.rs          # 二进制 crate（命名为 "tool-b"）
```

这个 package 包含**4 个 crate**：
- 1 个库 crate：`my-project`
- 3 个二进制 crate：`my-project`、`tool-a`、`tool-b`

**编译和运行：**

```bash
# 编译所有 crate
$ cargo build

# 运行主二进制
$ cargo run

# 运行特定的二进制
$ cargo run --bin tool-a
$ cargo run --bin tool-b

# 列出所有可执行文件
$ cargo build --bins
```

## 自定义 Crate 路径和名称

如果你不想使用 Cargo 的默认约定，可以在 Cargo.toml 中显式指定：

```toml
[[bin]]
name = "my-tool"            # 二进制可执行文件的名称
path = "src/custom/main.rs" # 指定二进制 crate 的 root 路径

[lib]
name = "my-library"         # 库的名称
path = "src/custom/lib.rs"  # 指定库 crate 的 root 路径
```

这样你就可以打破默认约定，使用自己想要的目录结构和名称。但**大多数情况下，按照 Cargo 的默认约定最好**，这样其他人更容易理解你的项目结构。

# 练习题

## Package 和 Crate 概念测验

```quiz single
Q: 下面哪个描述正确地区分了 Package 和 Crate？
- Package 和 Crate 是同义词
- Package 是代码的编译单元，Crate 是用 Cargo 管理的项目
- Package 只用于二进制项目，Crate 只用于库
+ Package 是用 Cargo 管理的项目，Crate 是代码的编译单元
E: Package 是项目组织单位（包含 Cargo.toml），Crate 是编译单位。Package 可以包含多个 Crate。
```

```quiz single
Q: 运行 `cargo new my-app` 后，以下哪个文件是二进制 crate 的根源文件？
- src/lib.rs
- src/bin/main.rs
- Cargo.toml
+ src/main.rs
E: 按 Cargo 约定，src/main.rs 是二进制 crate 的根源文件。它必须包含 main() 函数。
```

```quiz multi
Q: 下列哪些说法关于 Cargo.toml 是正确的？（多选）
+ 不需要在 Cargo.toml 中显式列出 src/main.rs 或 src/lib.rs，Cargo 会按约定自动识别
+ Cargo.toml 定义了一个 Package
- Cargo.toml 中必须显式列出 src/bin/ 中的所有二进制 crate
- 每个 Crate 都需要有自己的 Cargo.toml 文件
E: Cargo.toml 定义 Package 级别的配置。Cargo 遵循约定自动识别 crate roots。单个 Package 可以有多个 Crate，但只有一个 Cargo.toml。
```

```quiz single
Q: 一个 Package 可以包含多少个库 Crate？
- 至多 2 个
- 任意多个
+ 至多 1 个
- 0 个
E: Rust 的规则是：一个 Package 至多包含 1 个库 Crate，但可以包含任意多个二进制 Crate。这是为了避免歧义。
```

```quiz single
Q: 要在一个 Package 中创建两个名为 `tool1` 和 `tool2` 的二进制程序，应该如何组织文件？
+ 创建 src/bin/tool1.rs 和 src/bin/tool2.rs
- 创建 src/tool1.rs 和 src/tool2.rs
- 在 Cargo.toml 中显式列出
- 创建两个独立的 Package
E: 多个二进制 Crate 应该放在 src/bin/ 目录中，每个文件是一个独立的二进制 crate。使用 `cargo run --bin tool1` 来运行。
```

```quiz single
Q: 库 Crate 的根源文件是什么，它必须包含什么？
- Cargo.toml
- src/lib.rs，必须包含 main() 函数
+ src/lib.rs，不必包含 main() 函数
- src/main.rs，必须包含 main() 函数
E: 库 Crate 使用 src/lib.rs 作为根源文件，不需要 main() 函数，而是导出可供其他 crate 使用的函数或类型。
```
