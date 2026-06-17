---
title: "综合练习"
description: "综合运用工作空间、Features、build.rs 和文档注释的核心概念，通过代码练习和测验巩固项目工程化技能。"
difficulty: intermediate
estimatedTime: 40
keywords: ["workspace", "features", "build.rs", "文档注释", "doctest", "综合练习"]
---

# 工程化综合测验

## Workspace 综合题

```quiz single
Q: 一个工作空间中有 3 个成员 crate：core_lib、web_server、cli_tool。它们都需要 serde 1.0。最佳做法是？
- 在每个成员的 Cargo.toml 里分别写 serde = "1.0"
+ 在根 Cargo.toml 的 [workspace.dependencies] 中声明 serde = "1.0"，各成员用 serde = { workspace = true }
- 在 core_lib 中声明，web_server 和 cli_tool 通过依赖 core_lib 间接获得
- 在根 Cargo.toml 的 [dependencies] 中声明一次
E: workspace.dependencies 就是为这个场景设计的。统一声明后各成员继承，版本号只需要维护一处，不会出现"某个成员用了旧版本"的情况。core_lib 的依赖不会自动传递给兄弟 crate（传递只针对直接依赖关系）。
```

```quiz single
Q: 在工作空间根目录运行 cargo test --workspace，会发生什么？
- 只测试根 package
+ 测试工作空间内所有成员 crate
- 报错，--workspace 参数不合法
- 只测试有 #[test] 的成员
E: --workspace 标志让 Cargo 命令作用于工作空间内所有成员。cargo build --workspace、cargo test --workspace、cargo check --workspace 都是同理。
```

## Features 综合题

```quiz single
Q: 某个库的 Cargo.toml 中写了 default = ["http"]，用户在引用时写了 default-features = false。此时以下说法哪个正确？
- http feature 依然开启，default-features 只能关闭用户自己的 features
+ http feature 被关闭，用户需要在 features = [...] 中显式指定想要的功能
- 会编译报错，default features 不能被关闭
- default-features = false 语法不合法
E: default-features = false 关掉的是依赖库的默认 features，此后该依赖只有用户在 features = [...] 中显式开启的 features 才会编译。这让用户能精确控制依赖的体积，是嵌入式或 no_std 场景常用的手法。
```

```quiz multi
Q: 下列哪些代码可以正确地用于条件编译？（多选）
+ #[cfg(target_os = "linux")] fn linux_fn() {}
+ if cfg!(debug_assertions) { println!("调试模式"); }
+ #[cfg(all(feature = "tls", target_arch = "x86_64"))] mod tls {}
- #[cfg(feature == "tls")] fn tls_fn() {}  // == 是错误语法
E: cfg 条件用等号 = 而不是双等号 ==，所以最后一项语法错误。#[cfg] 用于 item 级别条件编译，cfg!() 宏用于表达式中，all()、any()、not() 可以组合条件。
```

## Build Scripts 综合题

```quiz single
Q: 在 build.rs 中，哪个环境变量提供了"可以安全写入生成文件"的目录路径？
- CARGO_MANIFEST_DIR（Cargo.toml 所在目录）
- TARGET（目标平台 triple）
+ OUT_DIR（Cargo 为构建脚本专门提供的输出目录）
- CARGO_PKG_NAME（crate 名称）
E: OUT_DIR 是 build.rs 的"专属沙盒"，Cargo 保证它是可写的，且每次构建都会清理旧文件。生成的 .rs 文件必须写到这里，然后用 include!(concat!(env!("OUT_DIR"), "/generated.rs")) 在源码中引入。绝不要写到 src/ 目录。
```

```rust
// build.rs
fn main() {
    println!("cargo::rustc-env=MY_VAR=hello");
}
```

```quiz single
Q: 上面的 build.rs 没有写任何 rerun-if-changed 指令。构建行为是怎样的？
- 只在第一次构建时运行，之后永不重新运行
- 只在 build.rs 文件本身修改时重新运行
+ 任何源文件变化都会导致 build.rs 重新运行（最保守策略）
- 编译时会警告，因为没有 rerun-if-changed
E: 没有写任何 rerun-if-changed 时，Cargo 采用最保守策略：任何文件变化都触发 build.rs 重新运行。这保证了构建的正确性，但可能导致不必要的重复运行。添加 rerun-if-changed 是性能优化，让 Cargo 只在指定文件变化时才重跑。
```

## Doctest 综合题

```rust
/// # 示例
/// ```
/// # let x = 5;  // A 行
/// assert_eq!(x, 5);  // B 行
/// ```
```

```quiz single
Q: 上面的文档注释中，哪些行会在 cargo doc 生成的文档中显示，哪些不会？

- A 行和 B 行都显示
+ 只有 B 行显示；A 行以 # 开头，在文档中隐藏但 doctest 运行时包含
- 只有 A 行显示
- 两行都不显示
E: doctest 中以 "# "（# 加空格）开头的行在生成的 HTML 文档中会被隐藏，但 cargo test 运行 doctest 时仍然包含它们。这让你可以隐藏必要的初始化代码，让文档示例更简洁。
```

```quiz multi
Q: 以下关于文档注释的说法，正确的是？（多选）
+ //! 写在 lib.rs 顶部，是整个 crate 的文档
+ /// 写在 pub fn 之前，是该函数的文档
+ 文档注释中的代码块会被 cargo test 作为 doctest 运行
- /// 和 //! 可以互换使用，效果相同
E: 关键区别：/// 注释紧跟其后的 item，//! 注释包含它的 item（模块或 crate）。两者不能互换，各有专属使用位置。文档中的代码块默认会作为 doctest 运行，这是保证文档示例始终有效的机制。
```

# 综合编程练习

## 练习 1：条件编译与版本信息

实现一个 `describe()` 函数，综合运用 `cfg!()` 宏和字符串操作，输出包含构建模式和平台信息的描述。

```rust editable
/// 返回当前构建的描述字符串。
///
/// # Examples
///
/// ```
/// let desc = describe();
/// assert!(desc.contains("构建"));
/// ```
pub fn describe() -> String {
    let mode = if cfg!(debug_assertions) {
        "调试"
    } else {
        "发布"
    };

    // TODO: 使用 cfg!() 检测操作系统，填入 os 变量
    let os = "未知";

    format!("{} 构建 | 平台：{}", mode, os)
}

fn main() {
    println!("{}", describe());
}
```

```expected
调试 构建 | 平台：Linux/其他
```

---

## 练习 2：带文档的数学库

为下面的数学工具模块补全文档注释，每个函数都需要 `# Examples` 章节和至少一个有效的断言。

```rust editable
//! 简单数学工具库。

/// TODO：添加文档注释（描述 + Examples 章节）
pub fn square(n: i32) -> i32 {
    n * n
}

/// TODO：添加文档注释（描述 + Examples 章节）
pub fn is_even(n: i32) -> bool {
    n % 2 == 0
}

/// TODO：添加文档注释（描述 + Examples 章节）
pub fn clamp(value: i32, min: i32, max: i32) -> i32 {
    if value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

fn main() {
    println!("square(5) = {}", square(5));
    println!("is_even(4) = {}", is_even(4));
    println!("clamp(15, 0, 10) = {}", clamp(15, 0, 10));
}
```

```expected
square(5) = 25
is_even(4) = true
clamp(15, 0, 10) = 10
```

---

## 练习 3：Feature 控制

下面的代码需要用 `cfg!()` 来判断是否开启了 "verbose" 功能（在 playground 里用 `debug_assertions` 模拟），实现条件化输出。

```rust editable
fn process(data: &[i32]) -> i32 {
    let sum: i32 = data.iter().sum();

    // TODO: 如果是调试模式（用 cfg!(debug_assertions) 模拟 "verbose" feature），
    // 打印 "处理 N 个元素" 的调试信息
    // 否则静默处理

    sum
}

fn main() {
    let data = vec![1, 2, 3, 4, 5];
    let result = process(&data);
    println!("结果：{}", result);
}
```

```expected
处理 5 个元素
结果：15
```
