---
title: "Features 与条件编译"
description: "掌握 Cargo Features：用 feature flag 按需开启功能模块，同一份代码适配不同使用场景，理解条件编译的核心机制。"
difficulty: intermediate
estimatedTime: 30
keywords: ["features", "条件编译", "cfg", "可选依赖", "feature flag", "cargo"]
---

# Features 与条件编译

> **注意**：Features 的基础讲解已在《工作空间》一章中详细介绍（包括声明、使用、工作空间中的应用等）。本章补充条件编译的深入讲解和综合实战。

如果你还未阅读《工作空间》章节关于 Features 的内容，建议先读那部分以了解基础概念。

# 条件编译深入

## 属性级别的 cfg

前面我们知道 `#[cfg(...)]` 让代码根据条件有选择地编译。除了 `feature`，还有很多其他条件可以组合：

```rust runnable
// 同时满足多个条件
#[cfg(all(feature = "tls", target_os = "linux"))]
fn linux_tls_only() {
    println!("仅在 Linux 上且启用 tls feature");
}

// 满足其一
#[cfg(any(feature = "tls", feature = "native-tls"))]
fn any_tls_support() {
    println!("启用 tls 或 native-tls feature");
}

// 取反
#[cfg(not(feature = "std"))]
fn no_std_impl() {
    println!("no_std 环境的实现");
}

fn main() {
    #[cfg(any(feature = "tls", feature = "native-tls"))]
    any_tls_support();
}
```

## 可选依赖与 Features

当你声明一个可选依赖时，它默认不会被编译。只有开启对应的 feature 才会引入：

```toml
[features]
json = ["dep:serde_json"]     # 启用 json feature 时，引入 serde_json
tls = ["dep:native-tls"]

[dependencies]
serde_json = { version = "1.0", optional = true }
native-tls = { version = "0.2", optional = true }
```

> **`dep:` 前缀**：从 Rust 1.60 起，推荐用 `dep:crate_name` 的写法来明确引用可选依赖。这避免了 crate 名自动变成一个同名 feature 的隐式行为。

在代码中使用可选依赖：

```rust
#[cfg(feature = "json")]
use serde_json::json;

#[cfg(feature = "tls")]
use native_tls::TlsConnector;
```

## 平台与编译配置的条件编译

除了 feature，还有很多内置条件：

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

    // 检测 CPU 架构
    if cfg!(target_arch = "x86_64") {
        println!("64 位 x86 架构");
    } else if cfg!(target_arch = "aarch64") {
        println!("ARM64 架构");
    }

    // 检测构建类型
    let build_type = if cfg!(debug_assertions) {
        "debug"
    } else {
        "release"
    };
    println!("构建类型：{}", build_type);
}
```

常用的条件：

| 条件 | 含义 |
|------|------|
| `target_os = "linux"` | 目标平台是 Linux |
| `target_os = "windows"` | 目标平台是 Windows |
| `target_os = "macos"` | 目标平台是 macOS |
| `windows` / `unix` | 系统族简写 |
| `target_arch = "x86_64"` | 64 位 x86 架构 |
| `target_arch = "aarch64"` | ARM64 架构 |
| `debug_assertions` | 调试模式（cargo build，非 --release） |
| `feature = "xxx"` | 当前 crate 开启了 xxx feature |

# 练习题

## 综合条件编译

```quiz single
Q: 下列关于条件编译的说法，哪个正确？
- `#[cfg(...)]` 和 `cfg!(...)` 在任何场景下都可以互换使用
+ `#[cfg(...)]` 让不满足条件的代码完全不编译，`cfg!(...)` 仍然编译但运行时返回 bool
- `cfg!(...)` 比 `#[cfg(...)]` 性能更好
- 两者功能相同，只是语法不同
E: 关键区别在于编译行为。#[cfg(...)] 属性作用于整个 item，不满足条件时代码根本不进入编译结果。cfg!() 宏返回编译时常数，代码始终被编译但 false 分支会被优化掉。如果代码使用了平台专属 API，必须用 #[cfg(...)]，否则在不支持的平台上会编译报错。
```

```quiz multi
Q: 在库设计中，使用 features 的好处有哪些？（多选）
+ 减小二进制体积（用户只编译需要的功能）
+ 简化依赖树（可选依赖只在需要时引入）
+ 支持不同的使用场景（同一份代码适配多种场景）
- features 不影响编译结果大小，只是代码组织方式
E: Features 的三大价值都体现在这里。未启用的代码完全不编译，所以可以显著减小体积。可选依赖只在 feature 启用时引入，避免强制依赖。通过 feature 组合，同一个库可以支持嵌入式、web、CLI 等多种场景。
```

```quiz single
Q: 在 Cargo.toml 中写 `default = ["http"]` 表示什么？
- 用户必须启用 http feature
+ cargo build 时默认启用 http feature，用户可以用 --no-default-features 关掉
- 该库中只有 http 这一个 feature
- http 是一个特殊的、必须的 feature
E: default 字段列出的 features 在用户不指定任何参数时自动启用。这是库作者"推荐配置"的表现，用户仍然可以通过 --no-default-features 或 default-features = false 来关掉。
```

## 编程练习

### 实现有条件的模块

设计一个库，根据是否开启 "advanced" feature 来决定是否编译额外功能。补全下面的代码：

```rust editable
// 只在 "advanced" feature 启用时编译这个模块
// TODO: 用 #[cfg(feature = "...")] 修饰
pub mod advanced {
    pub fn complex_algorithm() {
        println!("复杂算法实现");
    }
}

// 基础功能，总是编译
pub fn basic_operation() {
    println!("基础操作");
}

fn main() {
    basic_operation();

    // 这行在 playground 中无法运行（feature 未启用）
    // 但在库中，用户可以通过 --all-features 启用它
    // advanced::complex_algorithm();
}
```

```expected
基础操作
```
