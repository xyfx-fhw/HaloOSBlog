---
title: "构建脚本 build.rs"
description: "掌握 Cargo 构建脚本：在编译前运行自定义 Rust 代码，实现代码生成、检测系统环境、链接原生库等高级构建需求。"
difficulty: intermediate
estimatedTime: 30
keywords: ["build.rs", "构建脚本", "代码生成", "原生库", "OUT_DIR", "cargo指令"]
---

# 构建脚本基础

## 什么是构建脚本

编译 Rust 项目时，Cargo 通常只是调用 `rustc` 把 `.rs` 文件编译成二进制。但有时候，**编译之前**需要做一些准备工作：

- 从 `.proto` 文件生成 Rust 代码（Protocol Buffers）
- 检测系统中是否安装了某个 C 库，决定是否链接它
- 读取 git commit hash，嵌入到最终的二进制里
- 根据目标平台生成不同的绑定代码

这些需求就是**构建脚本（Build Script）**的用武之地。

## 创建构建脚本

在 crate 根目录（`Cargo.toml` 的同级）创建 `build.rs` 文件：

```text
my_crate/
├── Cargo.toml
├── build.rs      ← 构建脚本
└── src/
    └── lib.rs
```

`build.rs` 本身就是一个普通的 Rust 程序，有 `main()` 函数，**在编译你的 crate 之前运行**：

```rust
// build.rs
fn main() {
    // 构建脚本在这里执行
    println!("cargo::warning=构建脚本运行中...");
}
```

> **构建脚本是独立编译的**：`build.rs` 会被编译成一个单独的可执行文件并运行，它的运行环境是**编译机器**（宿主机），而不是目标机器。因此即使你在做交叉编译，`build.rs` 也在你的本机上执行。

## 向 Cargo 发出指令

构建脚本通过向 **stdout** 打印特殊格式的行来向 Cargo 发出指令。格式是：

```text
cargo::指令名=值
```

常用指令：

| 指令 | 作用 |
|------|------|
| `cargo::rerun-if-changed=PATH` | 只有指定文件变化时才重新运行脚本 |
| `cargo::rerun-if-env-changed=VAR` | 只有指定环境变量变化时才重新运行 |
| `cargo::rustc-cfg=KEY` | 为 crate 代码设置 cfg 标志 |
| `cargo::rustc-cfg=KEY="VALUE"` | 设置带值的 cfg 标志 |
| `cargo::rustc-env=KEY=VALUE` | 设置运行时可访问的环境变量 |
| `cargo::rustc-link-lib=NAME` | 链接一个原生库 |
| `cargo::rustc-link-search=PATH` | 添加库搜索路径 |
| `cargo::warning=MESSAGE` | 输出一条编译警告（会显示在 cargo 输出中） |

> **新旧语法**：从 Cargo 1.77 起，推荐用 `cargo::` 前缀（双冒号）。旧版写法是 `cargo:` 单冒号，如 `cargo:rerun-if-changed=...`。两者目前都支持。

## 控制脚本何时重新运行

默认情况下，任何文件变化都会导致构建脚本重新运行。用 `rerun-if-changed` 可以缩小范围，让构建更快：

```rust
// build.rs
fn main() {
    // 只在这几个文件变化时才重新运行
    println!("cargo::rerun-if-changed=build.rs");
    println!("cargo::rerun-if-changed=src/schema.proto");

    // 只在环境变量变化时重新运行
    println!("cargo::rerun-if-env-changed=MY_LIB_PATH");
}
```

> **重要**：如果你写了 `rerun-if-changed`，Cargo 就会**只**在你指定的文件变化时才重新运行脚本，不再监听其他文件。所以一般都要包含 `build.rs` 本身。

# 实用场景

## 嵌入编译时信息

构建脚本可以把构建时的信息（如 git commit、构建日期）通过 `rustc-env` 嵌入到程序中，用 `env!()` 宏在运行时读取：

```rust
// build.rs
use std::process::Command;

fn main() {
    println!("cargo::rerun-if-changed=build.rs");

    // 获取 git commit hash
    let output = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output();

    let git_hash = match output {
        Ok(out) if out.status.success() => {
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        }
        _ => "unknown".to_string(),
    };

    println!("cargo::rustc-env=GIT_HASH={}", git_hash);
}
```

在 crate 代码中读取：

```rust
fn main() {
    // env!() 宏在编译时展开为字符串字面量
    println!("版本：{}", env!("CARGO_PKG_VERSION"));
    println!("Git Hash：{}", env!("GIT_HASH"));
}
```

## 代码生成

代码生成是构建脚本最强大的用途：读取某种定义文件（`.proto`、`.fbs`、配置 JSON 等），生成对应的 Rust 代码。

生成的文件必须写到 `OUT_DIR` 目录——这是 Cargo 为构建脚本专门提供的输出目录：

```rust
// build.rs
use std::env;
use std::fs;
use std::path::Path;

fn main() {
    println!("cargo::rerun-if-changed=src/messages.txt");

    // Cargo 提供 OUT_DIR 环境变量，指向构建输出目录
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("generated.rs");

    // 读取定义文件，生成 Rust 代码
    let messages = fs::read_to_string("src/messages.txt").unwrap_or_default();
    let mut code = String::from("// 自动生成，请勿手动修改\n\n");

    for (i, line) in messages.lines().enumerate() {
        let line = line.trim();
        if !line.is_empty() {
            code.push_str(&format!(
                "pub const MSG_{}: &str = \"{}\";\n",
                i, line
            ));
        }
    }

    fs::write(&dest_path, code).unwrap();
}
```

在 crate 的 `lib.rs` 中引入生成的代码：

```rust
// src/lib.rs

// include! 宏在编译时把文件内容插入到这里
include!(concat!(env!("OUT_DIR"), "/generated.rs"));
```

这样 `MSG_0`、`MSG_1` 等常量就可以像普通 Rust 代码一样使用了。

## 设置自定义 cfg 标志

构建脚本可以根据系统环境设置自定义的 `cfg` 标志，比简单的 `#[cfg(target_os = "...")]` 更灵活：

```rust
// build.rs
fn main() {
    println!("cargo::rerun-if-changed=build.rs");

    // 检测是否有某个系统库
    if has_openssl() {
        println!("cargo::rustc-cfg=has_openssl");
    }

    // 根据目标架构设置标志
    let target_arch = std::env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
    if target_arch == "x86_64" || target_arch == "aarch64" {
        println!("cargo::rustc-cfg=is_64bit");
    }
}

fn has_openssl() -> bool {
    // 实际项目中可以用 pkg-config crate 来检测
    std::process::Command::new("pkg-config")
        .args(["--exists", "openssl"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}
```

在代码中使用：

```rust
#[cfg(has_openssl)]
mod tls {
    pub fn connect_tls() { /* ... */ }
}

#[cfg(is_64bit)]
fn optimized_64bit_algo() { /* ... */ }
```

## 链接原生库

Rust 经常需要调用 C 库。构建脚本告诉 Cargo 要链接哪个库：

```rust
// build.rs
fn main() {
    println!("cargo::rerun-if-changed=build.rs");

    // 告诉链接器链接 libssl（不带 lib 前缀和 .a/.so 后缀）
    println!("cargo::rustc-link-lib=ssl");
    println!("cargo::rustc-link-lib=crypto");

    // 动态链接（默认）
    println!("cargo::rustc-link-lib=dylib=ssl");

    // 静态链接
    println!("cargo::rustc-link-lib=static=ssl");

    // 添加库搜索路径
    println!("cargo::rustc-link-search=/usr/local/lib");
    println!("cargo::rustc-link-search=native=/opt/homebrew/lib");
}
```

> **实际项目中**：手写库路径很脆弱，不同系统的安装位置不同。推荐使用 `pkg-config` crate，它能自动检测系统中安装的 C 库：
>
> ```rust
> // build.rs
> fn main() {
>     pkg_config::probe_library("openssl").unwrap();
> }
> ```

## Cargo 提供的环境变量

构建脚本运行时，Cargo 会设置很多有用的环境变量：

| 变量 | 内容 |
|------|------|
| `OUT_DIR` | 构建输出目录（生成文件必须写这里） |
| `CARGO_PKG_VERSION` | crate 的版本号 |
| `CARGO_PKG_NAME` | crate 的名称 |
| `CARGO_MANIFEST_DIR` | `Cargo.toml` 所在目录的绝对路径 |
| `CARGO_CFG_TARGET_OS` | 目标操作系统 |
| `CARGO_CFG_TARGET_ARCH` | 目标 CPU 架构 |
| `PROFILE` | `debug` 或 `release` |
| `HOST` | 编译机器（宿主）的 target triple |
| `TARGET` | 目标机器的 target triple |

# 练习题

## 构建脚本概念测验

```quiz single
Q: 构建脚本 build.rs 中的代码运行在什么环境中？
- 最终的目标机器上（运行时执行）
+ 编译机器（宿主机）上，在编译 crate 之前执行
- 与 crate 代码同时编译和运行
- 只在 cargo test 时运行
E: build.rs 会被单独编译成一个可执行文件，在宿主机上运行（编译时，不是运行时）。即使你在做交叉编译（比如编译 ARM 程序），build.rs 也在你的 x86 开发机上执行。这一点很重要，因为 build.rs 里可以调用宿主机上的命令行工具。
```

```quiz single
Q: 构建脚本生成的文件应该写到哪里？
- 直接写到 src/ 目录下
- 写到 crate 根目录
+ 写到 OUT_DIR 环境变量指向的目录
- 写到 target/debug/ 或 target/release/ 根目录
E: 构建脚本必须把生成的文件写到 OUT_DIR 指向的目录（每次构建 Cargo 都会提供一个独立的输出目录）。然后在源码中用 include!(concat!(env!("OUT_DIR"), "/generated.rs")) 来引入。绝对不要写到 src/，那样会污染源码目录，也会导致 .gitignore 问题。
```

```quiz multi
Q: 关于 cargo::rerun-if-changed 指令，下列说法正确的是？（多选）
+ 一旦写了任意一个 rerun-if-changed，Cargo 就只在指定文件变化时重新运行脚本
+ 通常需要把 build.rs 本身也加入 rerun-if-changed 的列表
- 不写 rerun-if-changed 时，构建脚本永远不会重新运行
- rerun-if-changed 只能指定 .rs 文件
E: 关键点：写了 rerun-if-changed 后，Cargo 会切换到"只有指定文件变化才重跑"模式，其他文件的变化不再触发重跑。所以要记得把 build.rs 自身也加进去，否则修改 build.rs 也不会触发重跑。不写任何 rerun-if-changed 时，任何文件变化都会触发重跑（最保守策略）。
```

```quiz single
Q: 想把 git commit hash 嵌入到最终二进制中，在程序运行时可以打印出来，应该怎么做？
- 在 main.rs 里调用 git 命令，运行时获取
- 把 hash 硬编码在 const 里
+ 在 build.rs 里获取 hash，用 cargo::rustc-env=GIT_HASH=xxx 设置，代码中用 env!("GIT_HASH") 读取
- 在 lib.rs 里用 include_str!("../.git/HEAD") 读取
E: 构建脚本的典型用途之一。build.rs 在编译时运行，可以调用 git 命令获取 hash，然后通过 rustc-env 指令将其设为编译时环境变量。编译时 env!() 宏会把它展开为字符串字面量嵌入到代码中，运行时即可访问。
```

```quiz single
Q: 需要链接一个名为 libfoo.a 的静态库，build.rs 里应该怎么写？
- println!("cargo::rustc-link-lib=libfoo.a");
+ println!("cargo::rustc-link-lib=static=foo");
- println!("cargo::link=static:foo");
- println!("cargo::rustc-link-lib=foo.a");
E: 链接库指令的格式是 cargo::rustc-link-lib=KIND=NAME，其中 KIND 可以是 static（静态）、dylib（动态）、framework（macOS 框架）等。NAME 不带 lib 前缀和 .a/.so 后缀——直接写 foo 而不是 libfoo 或 foo.a。
```
