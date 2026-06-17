---
title: "Features 与条件编译"
description: "掌握 Cargo Features：用 feature flag 按需开启功能模块，同一份代码适配不同使用场景，理解条件编译的核心机制。"
difficulty: intermediate
estimatedTime: 30
keywords: ["features", "条件编译", "cfg", "可选依赖", "feature flag", "cargo"]
---

# Features 基础

## 什么是 Feature

想象你开发了一个网络库，大多数用户只需要基本的 HTTP 功能，但少数高级用户需要 WebSocket 支持。你不想强迫所有人都编译 WebSocket 相关代码——毕竟引入额外依赖会增大二进制体积、拖慢编译速度。

**Feature flag** 就是解决这个问题的机制。它让用户选择开启哪些功能模块，未开启的代码完全不会被编译。

Features 的特点：
- **累加性**：features 只能开启，不能关闭；一旦某个 feature 被开启，就不会再被关闭
- **零成本**：未启用的 feature 对应的代码完全不参与编译
- **可选依赖**：feature 可以关联一个可选的外部依赖，只在启用时才引入

## 在 Cargo.toml 中声明 Features

Features 在 `[features]` 段落中声明：

```toml
[package]
name = "my_net_lib"
version = "0.1.0"

[features]
# default 是特殊名称：cargo build 时默认开启的 features
default = ["http"]

# 各个 feature 可以依赖其他 features
http = []
websocket = ["http"]       # websocket 开启时自动开启 http
tls = []
full = ["http", "websocket", "tls"]  # 一次性开启所有功能

[dependencies]
# 可选依赖：只在对应 feature 开启时才编译
native-tls = { version = "0.2", optional = true }
tokio-tungstenite = { version = "0.21", optional = true }
```

> **feature 依赖关系**：`websocket = ["http"]` 表示启用 `websocket` 时自动启用 `http`。这种依赖关系是单向的、累加的——你只能说"启用 A 时也启用 B"，不能说"启用 A 时禁用 B"。

## 默认 Features

`default` 是一个特殊的 feature 名称，列在其中的 features 在用户不指定任何参数时自动开启：

```toml
[features]
default = ["std", "http"]
std = []
http = []
json = []
```

如果不想要默认 features，用户可以在自己的 `Cargo.toml` 里关掉：

```toml
[dependencies]
# 关掉所有默认 features
my_net_lib = { version = "1.0", default-features = false }

# 只开启需要的
my_net_lib = { version = "1.0", default-features = false, features = ["http"] }
```

## 从命令行启用 Features

```bash
# 启用额外 features（叠加在默认 features 之上）
cargo build --features "websocket,tls"
cargo build --features websocket --features tls

# 启用所有 features
cargo build --all-features

# 不启用任何默认 features（包括 default 里的）
cargo build --no-default-features

# 组合使用：不要默认的，只要 tls
cargo build --no-default-features --features tls
```

# 条件编译

## #[cfg(...)] 属性

`#[cfg(...)]` 让你根据编译条件决定是否包含某段代码：

```rust runnable
// 根据 feature 条件编译（需要 Cargo，playground 里无法测试 feature）
// 这里演示 target_os 条件

#[cfg(target_os = "windows")]
fn os_specific() {
    println!("在 Windows 上运行");
}

#[cfg(not(target_os = "windows"))]
fn os_specific() {
    println!("在非 Windows 系统上运行");
}

fn main() {
    os_specific();
}
```

在库代码中，feature 条件编译通常这样写：

```rust
// 只在 "tls" feature 开启时编译这个模块
#[cfg(feature = "tls")]
pub mod tls {
    pub fn connect_secure(addr: &str) -> Result<(), String> {
        println!("建立 TLS 连接到 {}", addr);
        Ok(())
    }
}

// 只在 "websocket" feature 开启时编译这个函数
#[cfg(feature = "websocket")]
pub fn connect_ws(url: &str) {
    println!("WebSocket 连接：{}", url);
}
```

`#[cfg]` 可以组合条件：

```rust
// 同时满足
#[cfg(all(feature = "tls", target_os = "linux"))]
fn linux_tls() { /* ... */ }

// 满足其一
#[cfg(any(feature = "tls", feature = "native-tls"))]
fn any_tls() { /* ... */ }

// 取反
#[cfg(not(feature = "std"))]
fn no_std_impl() { /* ... */ }
```

## cfg!() 宏

`cfg!()` 宏返回一个 `bool` 值，可以在运行时代码中使用（但实际上编译器会优化掉 false 分支）：

```rust runnable
fn main() {
    // cfg! 宏在编译时求值，但可以写在普通表达式里
    if cfg!(target_os = "linux") {
        println!("运行在 Linux 上");
    } else if cfg!(target_os = "macos") {
        println!("运行在 macOS 上");
    } else {
        println!("运行在其他系统上");
    }

    // 也可以用于调试构建检测
    let is_debug = cfg!(debug_assertions);
    println!("调试模式：{}", is_debug);
}
```

> **`#[cfg]` vs `cfg!()`**：
> - `#[cfg]` 是属性，作用于整个 item（函数、模块、字段）——未满足条件的代码**完全不编译**
> - `cfg!()` 是宏，用在表达式里，返回 bool——false 分支虽然不运行，但**仍然会被编译**（类型检查、语法检查依然发生）
>
> 因此对于大量条件编译代码，优先用 `#[cfg]`；只有需要在同一函数里根据条件执行不同逻辑时才用 `cfg!()`。

## 可选依赖

当你声明一个可选依赖时，它默认不会被编译。只有开启对应的 feature 才会引入：

```toml
[features]
json = ["dep:serde_json"]     # "dep:" 前缀明确引用可选依赖
tls = ["dep:native-tls"]

[dependencies]
serde_json = { version = "1.0", optional = true }
native-tls = { version = "0.2", optional = true }
```

> **`dep:` 前缀**：从 Rust 1.60 起，推荐用 `dep:crate_name` 的写法来明确引用可选依赖，而不是直接写 crate 名。这避免了 crate 名自动变成一个同名 feature 的隐式行为。

## 平台特定代码

条件编译也常用于平台差异处理：

```rust runnable
fn get_path_separator() -> char {
    if cfg!(windows) {
        '\\'
    } else {
        '/'
    }
}

fn main() {
    let sep = get_path_separator();
    println!("路径分隔符：'{}'", sep);

    // target_arch 检测 CPU 架构
    if cfg!(target_arch = "x86_64") {
        println!("64 位 x86 架构");
    } else if cfg!(target_arch = "aarch64") {
        println!("ARM64 架构");
    }
}
```

常用的 cfg 条件：

| 条件 | 含义 |
|------|------|
| `target_os = "linux"` | 目标平台是 Linux |
| `target_os = "windows"` | 目标平台是 Windows |
| `target_os = "macos"` | 目标平台是 macOS |
| `windows` | 等价于 `target_family = "windows"` |
| `unix` | 等价于 `target_family = "unix"` |
| `target_arch = "x86_64"` | 64 位 x86 架构 |
| `target_arch = "aarch64"` | ARM64 架构 |
| `debug_assertions` | 调试模式（cargo build，非 --release） |
| `feature = "xxx"` | 当前 crate 开启了 xxx feature |

# 练习题

## Features 概念测验

```quiz single
Q: 下列关于 Cargo features 的说法，哪个是正确的？
- Features 可以用 --disable-features 关闭已开启的 feature
- 每个 feature 都必须对应一个依赖库
+ Features 是累加的：一旦开启就不会再被关闭
- default features 不能被用户关掉
E: Features 的核心特性是"累加性"——只能开启，不能关闭。这保证了依赖关系的一致性：如果 A 依赖的 crate 开启了某 feature，而你也依赖这个 crate，Cargo 会确保这个 feature 依然开启，而不会因为你不想要它就关掉。用户可以用 default-features = false 关掉默认 features，但这是在引用依赖时的选择，不是"关闭"已开启的 feature。
```

```quiz single
Q: `#[cfg(feature = "tls")]` 和 `cfg!(feature = "tls")` 的关键区别是？
- 它们完全相同，只是写法不同
+ #[cfg] 让未满足条件的代码完全不参与编译；cfg!() 返回 bool，false 分支仍然会被编译检查
- cfg!() 性能更好，因为运行时判断更快
- #[cfg] 只能用于函数，cfg!() 只能用于模块
E: 关键区别在于"是否参与编译"。#[cfg] 属性作用于 item，未满足条件的代码根本不存在于编译结果中，相当于被删掉了。cfg!() 宏只控制运行时行为，两个分支都必须通过类型检查，只是 false 分支会被优化掉。大量条件代码用 #[cfg]，少量运行时分支用 cfg!()。
```

```quiz multi
Q: 下列哪些是 Cargo 命令的正确用法？（多选）
+ cargo build --features "json,tls"  （启用指定 features）
+ cargo build --all-features  （启用所有 features）
+ cargo build --no-default-features  （禁用默认 features）
- cargo build --disable-features tls  （不存在这个参数）
E: Cargo 支持 --features（指定）、--all-features（全部）、--no-default-features（关掉默认）。没有 --disable-features 这个参数，因为 features 的累加性决定了你无法"关掉"一个已启用的 feature——你能做的只是不主动开启它。
```

```quiz single
Q: 在 [features] 中声明 websocket = ["http"] 表示什么？
- websocket 和 http 是互斥的，启用一个时另一个不可用
- http 是 websocket 的前提，如果没有 http，websocket 无法使用
+ 启用 websocket feature 时，http feature 也会自动被启用
- websocket 和 http 是同一个 feature 的两个名字
E: features 的依赖关系是"启用 A 时自动启用 B"。websocket = ["http"] 意味着任何开启 websocket 的场景都会自动拥有 http feature。这体现了 features 的累加性——开启意味着更多功能，而不是排他选择。
```

```quiz single
Q: 想在自己的项目中使用某个库，但不想要它的默认 features，应该怎么写？
- 无法关掉默认 features，必须全部接受
+ my_lib = { version = "1.0", default-features = false }
- my_lib = { version = "1.0", features = [] }
- my_lib = { version = "1.0", no-default = true }
E: 用 default-features = false 可以关掉依赖库的默认 features（注意：不是自己 crate 的 default features，而是那个依赖的 default features）。然后再用 features = ["..."] 单独指定你需要的功能。
```

## 编程练习

### 理解条件编译

下面的代码使用了 `cfg!()` 宏，但行为看起来有点奇怪。补全 `describe_build()` 函数，使其在调试模式下输出 "调试构建"，在发布模式下输出 "发布构建"（playground 默认是调试模式）：

```rust editable
fn describe_build() -> &'static str {
    // TODO: 使用 cfg!(debug_assertions) 返回对应字符串
    ""
}

fn main() {
    println!("{}", describe_build());

    // 检测操作系统
    let os = if cfg!(windows) {
        "Windows"
    } else if cfg!(target_os = "macos") {
        "macOS"
    } else {
        "Linux/其他"
    };
    println!("操作系统：{}", os);
}
```

```expected
调试构建
操作系统：Linux/其他
```
