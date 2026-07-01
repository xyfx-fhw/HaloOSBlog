---
title: "构建脚本 build.rs"
description: "掌握 Cargo 构建脚本：在编译前运行自定义 Rust 代码，实现代码生成、检测系统环境、链接原生库等高级构建需求。"
difficulty: intermediate
estimatedTime: 30
keywords: ["build.rs", "构建脚本", "代码生成", "原生库", "OUT_DIR", "cargo指令"]
---

# 什么是构建脚本

编译 Rust 项目时，Cargo 通常只是调用 `rustc` 把 `.rs` 文件编译成二进制。但有时候，**编译之前**需要做一些准备工作：

## 代码生成

某些代码不是手写的，而是从其他格式生成的。比如：
- Protocol Buffers（`.proto` 文件） → Rust 代码
- GraphQL 数据结构定义 → Rust 类型
- 数据库 schema → ORM 模型

这些生成的代码往往体积大、重复性高，手动维护既容易出错，又容易过时。`build.rs` 可以在编译前自动从源定义生成代码。

## 检测系统环境

某些库依赖系统中是否安装了特定的 C 库。比如：
- 能否链接 OpenSSL？
- 系统中是否有 libsqlite3？
- 目标平台是 Linux、macOS 还是 Windows？

手动检测很脆弱（不同系统的安装位置不同），`build.rs` 可以根据检测结果动态决定编译哪些代码、链接哪些库。

## 嵌入编译时信息

某些信息需要在编译时写死在二进制里，而不是运行时读取：
- 当前 git commit hash（用于发布版本的追踪）
- 编译日期和时间
- 编译时的环境变量（比如版本号）

这些信息必须通过 `build.rs` 在编译时嵌入，因为二进制部署后无法再修改。

## 条件编译和平台适配

交叉编译时（比如在 x86 机器上编译 ARM 程序），需要根据**目标平台**生成不同的代码：
- Windows 上的系统调用 API 和 Linux 不同
- ARM 和 x86_64 的性能优化策略不同
- 嵌入式系统可能不支持某些特性

`build.rs` 可以检测编译目标，并据此设置 cfg 标志来控制条件编译。

这些需求就是 **构建脚本（Build Script）** 的用武之地。

# 使用构建脚本

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

### 当 build.rs 变得很大时

如果构建逻辑变得复杂，一个 `build.rs` 文件会非常臃肿。Rust 允许你把逻辑分散到多个模块文件中，通常的做法是创建一个 `build/` 目录：

```text
my_crate/
├── Cargo.toml
├── build.rs           ← 主入口，只负责调用
├── build/             ← 构建模块目录
│   ├── mod.rs         ← 模块入口，声明子模块
│   ├── codegen.rs     ← 代码生成逻辑
│   └── linkage.rs     ← 链接逻辑
└── src/
    └── lib.rs
```

在 `build.rs` 中声明模块并调用：

```rust
// build.rs
mod build;
```

这样 `build.rs` 保持简洁，具体逻辑分散在各个子模块里，更容易维护。

## build.rs 向 Cargo 发指令

build.rs 本身只是一个普通的 Rust 程序，但它有一个特殊能力：**它可以通过向 stdout 打印特定格式的行来与 Cargo 通信**（例如：`println!("cargo::rerun-if-changed=build.rs");`）。Cargo 会读取这些输出，根据其中的指令改变编译行为。这就是 build.rs 如此强大的原因。

指令格式是：

```text
cargo::指令名=值
```

常用指令：

| 指令 | 作用与用途 |
|------|------|
| `cargo::rerun-if-changed=PATH` | 只在指定文件变化时才重新运行脚本。默认任何文件变化都会重新运行，很低效。通常指定 `build.rs` 本身、`.proto` 定义文件等 |
| `cargo::rerun-if-env-changed=VAR` | 只在指定环境变量变化时才重新运行脚本。用于依赖系统环境的构建，如 `OPENSSL_DIR`、`PKG_CONFIG_PATH` |
| `cargo::rustc-cfg=KEY` 或 `KEY="VALUE"` | 为代码设置自定义 cfg 标志。代码中可用 `#[cfg(key)]` 识别。用于根据构建时检测结果决定编译哪些代码 |
| `cargo::rustc-env=KEY=VALUE` | 设置编译时环境变量，代码中用 `env!("KEY")` 读取。用于嵌入 git hash、版本号等编译时信息 |
| `cargo::rustc-link-lib=NAME` 或 `static=NAME` | 链接原生 C 库。`NAME` 为动态链接（默认），`static=NAME` 为静态链接。链接器会在搜索路径中查找库 |
| `cargo::rustc-link-search=PATH` | 添加库搜索路径。链接器会在这些目录中查找 C 库文件。用于非标准安装位置 |
| `cargo::warning=MESSAGE` | 在编译时输出警告信息。用于告诉用户构建中发生了什么，如"检测到 OpenSSL"等 |

> **新旧语法**：从 Cargo 1.77 起，推荐用 `cargo::` 前缀（双冒号）。旧版写法是 `cargo:` 单冒号，如 `cargo:rerun-if-changed=...`。两者目前都支持。

### 具体例子：向 crate 嵌入编译信息

看一个完整的例子，了解 build.rs 和 crate 代码如何协作：

**build.rs：** 生成编译时信息

```rust
// build.rs
use std::process::Command;

fn main() {
    // 只在 build.rs 本身变化时重新运行
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

    // 通过 rustc-env 指令向 Cargo 发出指令
    // Cargo 会把这个环境变量设置给 rustc
    println!("cargo::rustc-env=GIT_HASH={}", git_hash);
}
```

**src/main.rs：** 在代码中使用这个信息

```rust
fn main() {
    // env!() 宏在编译时读取环境变量
    // build.rs 通过 println!("cargo::rustc-env=...") 设置的变量
    let version = env!("CARGO_PKG_VERSION");
    let git_hash = env!("GIT_HASH");

    println!("程序版本：{}", version);
    println!("编译自 commit：{}", git_hash);
}
```

**过程说明：**

1. `cargo build` 时，Cargo 先编译并运行 `build.rs`
2. build.rs 执行代码，从 git 读取 commit hash
3. build.rs 打印 `cargo::rustc-env=GIT_HASH=abc123`
4. **Cargo 读取这一行输出**，理解这是一条指令
5. Cargo 把 `GIT_HASH=abc123` 设置为环境变量
6. Cargo 调用 `rustc` 编译 `src/main.rs`
7. 编译时，`env!("GIT_HASH")` 展开为 `"abc123"`
8. 最终二进制中包含了编译时的 git 信息

这就是 build.rs 的工作流：**代码 → 输出指令 → Cargo 解析 → 影响编译**。

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

# 实用场景示例

## 生成代码

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
- 只在 cargo test 时运行
- 最终的目标机器上（运行时执行）
- 与 crate 代码同时编译和运行
+ 编译机器（宿主机）上，在编译 crate 之前执行
E: build.rs 会被单独编译成一个可执行文件，在宿主机上运行（编译时，不是运行时）。即使你在做交叉编译（比如编译 ARM 程序），build.rs 也在你的 x86 开发机上执行。这一点很重要，因为 build.rs 里可以调用宿主机上的命令行工具。
```

```quiz single
Q: 构建脚本生成的文件应该写到哪里？
- 直接写到 src/ 目录下
+ 写到 OUT_DIR 环境变量指向的目录
- 写到 crate 根目录
- 写到 target/debug/ 或 target/release/ 根目录
E: 构建脚本必须把生成的文件写到 OUT_DIR 指向的目录（每次构建 Cargo 都会提供一个独立的输出目录）。然后在源码中用 include!(concat!(env!("OUT_DIR"), "/generated.rs")) 来引入。绝对不要写到 src/，那样会污染源码目录，也会导致 .gitignore 问题。
```

```quiz multi
Q: 关于 cargo::rerun-if-changed 指令，下列说法正确的是？（多选）
+ 一旦写了任意一个 rerun-if-changed，Cargo 就只在指定文件变化时重新运行脚本
- rerun-if-changed 只能指定 .rs 文件
- 不写 rerun-if-changed 时，构建脚本永远不会重新运行
+ 通常需要把 build.rs 本身也加入 rerun-if-changed 的列表
E: 一旦明确指定 rerun-if-changed，Cargo 就从"监听所有文件"切换到"只监听指定文件"，所以 build.rs 本身也要列入，否则修改 build.rs 后脚本不会重跑。任何类型的文件（.txt、.proto、目录等）都可以监听。
```

```quiz single
Q: 下列关于 println! 在构建脚本中的用法，哪个正确？
- println!("cargo::rustc-env=MY_VAR=value") 向 Cargo 发指令，格式必须是 cargo:: 开头
- println!("cargo:rustc-env=MY_VAR=value") 在最新 Cargo 中不再支持
+ println!("Hello") 会在编译时打印到终端，与普通代码相同
- println! 在构建脚本中无法向 Cargo 发指令
E: build.rs 是一个普通的 Rust 程序，所以 println!("Hello") 就是普通的调试输出，会直接打印到终端。只有那些特定格式的输出（`cargo::指令名=值`）才会被 Cargo 解析为指令，改变编译行为。`cargo:` 单冒号是旧语法，`cargo::` 双冒号是推荐的新语法，两者都支持。
```

```quiz multi
Q: 构建脚本可以用哪些方式改变编译行为？（多选）
+ 通过 cargo::rustc-env 设置环境变量，在代码中用 env!() 宏读取
+ 通过 cargo::rustc-link-lib 和 cargo::rustc-link-search 链接原生库
- 通过 println! 输出普通文本来改变 Rust 代码的语义
+ 通过 cargo::rustc-cfg 设置自定义 cfg 标志，在代码中用 #[cfg(...)] 使用
E: 构建脚本的关键是那些 `cargo::` 前缀的指令。普通 println! 只是调试输出，不会影响编译。rustc-cfg、rustc-env、rustc-link-lib 等才是真正影响编译的指令。
```
