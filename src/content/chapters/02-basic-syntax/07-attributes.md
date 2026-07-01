---
title: "属性"
description: "学习 Rust 属性的语法与用途，掌握 dead_code 警告处理和 cfg 条件编译的核心写法。"
difficulty: intermediate
estimatedTime: 35
keywords: ["属性", "attribute", "cfg", "dead_code", "allow", "条件编译", "derive"]
---

# 属性基础

属性（attribute）是 Rust 中为代码附加**元数据**的机制。元数据就是**对代码的附加信息和标签**——比如"这个函数是测试函数"、"这段代码只在 Windows 平台编译"、"忽略这个未使用的变量的警告"。属性用 `#[...]` 的语法写在代码前面。编译器读取这些标签，并根据标签改变编译行为。

## 什么是属性

**属性不是代码本身，而是对代码的注解**。编译器根据不同的属性做不同的事情。属性用 `#[...]` 的语法写在代码前面，告诉编译器如何处理这段代码。

比如，如果你写了一个函数但没有使用它，编译器会给出警告。加上 `#[allow(dead_code)]` 属性就能压制这个警告：

```rust runnable
#[allow(dead_code)]  // 这是一个属性，告诉编译器忽略"未使用函数"的警告
fn unused_function() {
    println!("这个函数没有被调用");
}

fn main() {
    println!("主程序");
}
```

没有 `#[allow(dead_code)]`，编译器会警告这个函数没被使用。有了这个属性后，警告就被压制了。

## 属性的作用范围

Rust 属性有两种作用范围：

- **`#[attribute]`**：作用于紧跟其后的**单个项**（函数、结构体、模块等）
- **`#![attribute]`**：作用于**整个 crate 或模块**，通常放在文件顶部，注意多了一个 `!`

```rust runnable
// 整个文件级别的属性，放在最上方
#![allow(dead_code)]

// 作用于单个函数
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 3, y: 5 };
    println!("{:?}", p);
}
```

## 常用属性详解

### 警告控制：allow、warn、deny

最简单的属性是 `#[allow(...)]`，用来**禁止某些编译器警告**：

```rust runnable
#[allow(dead_code)]
fn unused_function() {
    println!("这个函数现在不被调用");
}

fn main() {
    println!("主程序");
}
```

没有 `#[allow(dead_code)]`，编译器会警告 `unused_function` 没有被调用。但加上这个属性后，警告就被压制了。

`#[warn(...)]` 和 `#[deny(...)]` 用来控制警告级别：

- `#[allow(...)]`：压制警告，代码可以通过编译
- `#[warn(...)]`：强制显示警告（在被全局关闭时重新启用）
- `#[deny(...)]`：把警告当作错误，编译失败

**实际场景**：假设整个项目用 `#![allow(unused_variables)]` 关闭了未使用变量警告，但在某个关键函数中想检查，就可以用 `#[warn(...)]` 重新启用。

### 自动派生：derive

`#[derive(...)]` 告诉编译器**自动为某个类型生成某些功能**：

```rust runnable
#[derive(Debug, Clone)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p1 = Point { x: 3, y: 5 };
    let p2 = p1.clone();  // Clone 由 derive 自动生成
    println!("p1: {:?}", p1);  // Debug 由 derive 自动生成
    println!("p2: {:?}", p2);
}
```

### 其他常用属性

- `#[deprecated]`：标记已过时的代码，编译器会提示用户使用新版本
- `#[must_use]`：标记函数返回值不应被忽视，忽视会得到编译警告
- `#[inline]`、`#[inline(always)]`、`#[inline(never)]`：控制函数是否被内联（优化编译结果）
- `#[repr(...)]`：控制结构体或枚举在内存中的布局
- `#[doc = "..."]`：添加文档注释（也可以用 `///` 注释）
- `#[non_exhaustive]`：标记结构体或枚举以后可能添加新字段，防止用户全量匹配
- `#![crate_name]`、`#![crate_type]`：指定 crate 名称和编译类型。**但这是 rustc 级别属性，只在直接用 `rustc` 编译时有效**。使用 Cargo 项目时，由 `Cargo.toml` 中的 `name` 和 `crate-type` 字段管理，代码中的这两个属性会被忽略（不常用）。

## 属性的参数格式

属性可以带参数，根据参数个数和形式，常见的格式有：

**单个参数**：

```rust
#[allow(dead_code)]          // 单值参数
#[warn(unused_variables)]    // 单值参数
```

**多个参数**：

```rust
#[derive(Debug, Clone)]      // 多个参数用逗号分隔
```

**键值对参数**：

```rust
#[cfg(target_os = "linux")]  // 键值对形式
#[doc = "这是文档注释"]      // 等号形式
```

实际应用中，大多数常用属性都是单值或多值形式。根据不同属性的定义，参数形式会有所不同。

> **属性是固定的**：属性名称由 Rust 语言规定，你不能随意创建属于自己的属性。编译器只能识别特定的属性名（如 `allow`、`derive` 等），其他名称会被编译器忽略或报错。如果你对自定义属性感兴趣，那是一个高级特性（涉及过程宏），暂时不在本章范围内。

# 条件编译

条件编译允许你根据目标平台、编译配置等因素，在编译时选择性地包含或排除某段代码。

## cfg 属性

`#[cfg(...)]` 放在函数或其他项的上方，当条件不满足时，该项**完全不会被编译进二进制文件**：

```rust runnable
// 只在 Linux 上编译这个函数
#[cfg(target_os = "linux")]
fn platform_info() {
    println!("运行在 Linux 上");
}

// 在非 Linux 系统上编译这个函数
#[cfg(not(target_os = "linux"))]
fn platform_info() {
    println!("运行在非 Linux 系统上");
}

fn main() {
    platform_info(); // 根据平台自动调用对应版本
}
```

Rust Playground 运行在 Linux 上，所以上面的代码会打印"运行在 Linux 上"。

`cfg` 支持三种逻辑运算符，并且支持组合条件：

```rust runnable
// all：两个条件都满足
#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
fn linux_x64_only() {
    println!("仅在 Linux x86_64 上运行");
}

// any：任一条件满足
#[cfg(any(target_os = "linux", target_os = "macos"))]
fn unix_like() {
    println!("Unix-like 系统");
}

// not：条件不满足
#[cfg(not(target_os = "windows"))]
fn not_windows() {
    println!("非 Windows 系统");
}

// 组合条件：在 Unix 系列且是 x86_64 架构，但不是 macOS
#[cfg(all(any(target_os = "linux", target_os = "freebsd"), target_arch = "x86_64", not(target_os = "macos")))]
fn complex_condition() {
    println!("满足复杂条件");
}

fn main() {
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    linux_x64_only();

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    unix_like();

    #[cfg(not(target_os = "windows"))]
    not_windows();

    #[cfg(all(any(target_os = "linux", target_os = "freebsd"), target_arch = "x86_64", not(target_os = "macos")))]
    complex_condition();
}
```

## cfg! 宏

`cfg!(...)` 是属性的"宏版本"——在**布尔表达式**中使用，编译时就确定返回 `true` 或 `false`：

```rust runnable
fn main() {
    if cfg!(target_os = "linux") {
        println!("这是 Linux 系统");
    } else {
        println!("这不是 Linux 系统");
    }

    // 判断是否是 debug 构建（Playground 默认是 debug 模式）
    let is_debug = cfg!(debug_assertions);
    println!("调试模式：{}", is_debug);
}
```

**`#[cfg(...)]` 与 `cfg!(...)` 的关键区别：**

| | `#[cfg(...)]` | `cfg!(...)` |
|---|---|---|
| 用途 | 控制代码是否编译 | 布尔表达式 |
| 不满足时 | 代码**完全不编译** | 代码编译，值为 `false` |
| 适用场景 | 使用平台专属 API | 运行时根据条件走不同分支 |

**类比 C 语言**：

在 C 语言中有两种条件编译方式：

```c
// 方式 1：编译时排除代码（类似 Rust 的 #[cfg(...)]）
#ifdef LINUX
void linux_only() {
    printf("Only on Linux\n");
}
#endif

// 方式 2：编译时保留代码，运行时判断（类似 Rust 的 cfg!(...)）
void platform_check() {
    if (LINUX) {  // LINUX 是编译时常量，通常通过 -DLINUX 定义
        printf("On Linux\n");
    } else {
        printf("Not on Linux\n");
    }
}
```

对应的 Rust 写法：

```rust
// 方式 1：编译时完全排除代码
#[cfg(target_os = "linux")]
fn linux_only() {
    println!("Only on Linux");
}

// 方式 2：编译时保留代码，运行时判断
fn platform_check() {
    if cfg!(target_os = "linux") {
        println!("On Linux");
    } else {
        println!("Not on Linux");
    }
}
```

**关键区别**：
- **C 的 `#ifdef`** = Rust 的 `#[cfg(...)]`：代码完全不编译进二进制
- **C 的 `#define` + `if`** = Rust 的 `cfg!(...)`：代码都编译进去，运行时判断

这个区别很重要：如果某段代码用了只在特定平台存在的 API，**必须用 `#[cfg(...)]`** 而不是 `if cfg!(...)`，否则在其他平台会因为找不到 API 而编译报错。就像在 C 中，如果用的是平台专属的系统调用（比如 `SetWindowPos` 只在 Windows 上存在），必须用 `#ifdef WIN32` 包裹，而不是 `if (WIN32)` 后再调用，否则编译器会在非 Windows 平台上找不到 `SetWindowPos` 的符号定义而报链接错误。

## 常用内置条件

Rust 提供了大量内置条件键：

| 条件 | 说明 | 常用值 |
|------|------|--------|
| `target_os` | 目标操作系统 | `"linux"`, `"macos"`, `"windows"` |
| `target_arch` | 目标 CPU 架构 | `"x86_64"`, `"arm"`, `"wasm32"` |
| `target_family` | 目标系统族 | `"unix"`, `"windows"` |
| `debug_assertions` | 是否开启调试断言 | debug 模式为 true |
| `test` | 是否在运行测试 | 跑 `cargo test` 时为 true |

```rust runnable
fn main() {
    // 根据系统族分别处理
    if cfg!(target_family = "unix") {
        println!("Unix 系族（Linux/macOS）");
    } else if cfg!(target_family = "windows") {
        println!("Windows");
    }

    // 判断构建类型
    if cfg!(debug_assertions) {
        println!("当前是 debug 构建（包含断言和调试信息）");
    } else {
        println!("当前是 release 构建（性能优化）");
    }
}
```

## 自定义条件

除了内置条件，还可以通过 `--cfg` 标记向编译器传入自定义条件。**重要的是，自定义条件不能像 C 语言的 `#define` 那样在代码里定义，必须从外部传入。**

下面的代码在 Playground 中运行时，`some_condition` 未被定义，因此 `conditional_function` 不会被编译进来：

```rust runnable
// some_condition 是自定义条件，需要通过 --cfg 传入才会生效
#[cfg(some_condition)]
fn conditional_function() {
    println!("条件满足！");
}

fn main() {
    // 在 Playground 中 some_condition 未定义，conditional_function 不存在
    // 如果取消下面的注释会编译报错：
    // conditional_function();
    println!("没有传入 --cfg some_condition，条件函数不存在");
}
```

使用 `rustc` 直接编译时通过 `--cfg` 启用：

```bash
# 不带标记：conditional_function 不被编译，调用它会链接错误
$ rustc custom.rs

# 带标记：some_condition 成立，conditional_function 被编译进来
$ rustc --cfg some_condition custom.rs && ./custom
条件满足！
```

**为什么 Rust 这样设计**：条件应该由编译环境决定（编译参数、目标平台、特性标志等），而不是代码本身决定。这样可以确保同一份源代码在不同的构建配置下得到不同的二进制，而不是靠代码内部的"开关"。对比 C 语言，`#define` 定义在代码里，容易导致同一个源文件在不同团队或工程中产生不同的二进制，难以追踪。

> 在 Cargo 项目中，自定义条件通常通过 `build.rs` 构建脚本或 `Cargo.toml` 中的 `features` 特性标志来管理，而不是直接使用 `--cfg` 命令行标记。

# 练习题

## 属性基础测验

```quiz single
Q: `#[attribute]` 和 `#![attribute]` 的区别是什么？
- `#![attribute]` 是错误语法，Rust 不支持这种写法
- 两者完全相同，可以互换使用
+ `#[attribute]` 作用于紧跟其后的单个项，`#![attribute]` 作用于整个 crate 或模块
- `#[attribute]` 只能用于函数，`#![attribute]` 只能用于结构体
E: `#[...]` 放在某个项上方，只作用于那一个项；`#![...]` 作用于包含它的整个 crate 或模块（通常放在文件顶部）。区分这两种形式是正确使用属性的基础。
```

```rust
fn used() {
    println!("used");
}

fn unused() {
    println!("unused");
}

fn main() {
    used();
}
```

```quiz single
Q: 上面的代码编译时会发生什么？
- 编译失败，Rust 不允许存在未使用的函数
+ 编译成功，但编译器会对 unused 函数产生 dead_code 警告
- 编译成功，没有任何警告
- 运行时 panic，因为 unused 没被调用
E: Rust 的 dead_code lint 会对未使用的函数产生**警告**，但不是错误，不会阻止编译。要消除警告，可以给 unused 函数加上 `#[allow(dead_code)]`，或者直接删除它。
```

```quiz single
Q: 下列关于 crate_name 和 crate_type 属性的说法，哪个正确？
- 这两个属性已被废弃，不应再使用
- 这两个属性只能在库项目中使用
+ 这两个属性只在直接用 rustc 编译时有效，在 Cargo 项目中没有效果
- 这两个属性在所有 Rust 项目中都有效
E: crate_name 和 crate_type 是 rustc 级别的属性。使用 Cargo 时，crate 名称和类型由 Cargo.toml 管理，这两个属性不起作用。这是 RBE 原文中特别提醒的注意点。
```

## 条件编译测验

```quiz single
Q: `#[cfg(target_os = "linux")]` 和 `if cfg!(target_os = "linux")` 最重要的区别是什么？
- `#[cfg(...)]` 只能用于函数，`cfg!(...)` 可以用于任何地方
- `cfg!(...)` 性能更好，应该优先使用
- 两者行为完全相同，可以互换
+ `#[cfg(...)]` 让代码在条件不满足时完全不被编译；`cfg!(...)` 始终编译代码，只在运行时返回 bool
E: 关键区别在编译层面。`#[cfg(...)]` 在条件不满足时跳过整段代码的编译——如果代码中用了平台专属 API，必须用这种方式，否则在不支持的平台上会因找不到 API 而编译报错。`cfg!(...)` 更像普通 if，代码始终被编译。
```

```rust
#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
fn special() {
    println!("special");
}
```

```quiz single
Q: 上面的函数在什么条件下会被编译进二进制文件？
+ 同时满足"目标是 Linux"且"CPU 架构是 x86_64"时才会编译
- 任何情况下都会编译
- 只要 CPU 是 x86_64 就会编译
- 只要是 Linux 就会编译
E: `cfg(all(...))` 要求括号内所有条件同时满足。这里需要目标操作系统是 linux 且目标架构是 x86_64，两个条件缺一不可。
```

```quiz multi
Q: 下列关于 Rust 属性的说法，哪些是正确的？
+ `#[cfg(not(条件))]` 表示条件不满足时才编译该项
+ `cfg(any(条件A, 条件B))` 表示任意一个条件满足就编译
- `#[cfg(...)]` 和 `cfg!(...)` 在任何场景下都可以互换使用
- `crate_name` 属性在 Cargo 项目中能正常设置 crate 名称
+ `#![allow(dead_code)]` 放在文件顶部可以全局禁用 dead_code 警告
E: not/any 语义正确；`#![allow(...)]` 确实可以全局作用；`crate_name` 在 Cargo 项目中没有效果；`#[cfg(...)]` 和 `cfg!(...)` 不可完全互换，前者跳过编译，后者不跳过。
```

## 编程练习

### 练习一：消除 dead_code 警告

下面的代码会产生 `dead_code` 警告，因为 `helper` 函数从未被调用。请添加合适的属性来消除警告，同时保留该函数。

```rust editable
fn main() {
    println!("主函数运行");
}

fn helper() {
    println!("辅助函数，暂时未使用");
}
```

```expected
主函数运行
```

### 练习二：使用 cfg! 宏判断构建类型

`cfg!(debug_assertions)` 是一个编译时常量，在 debug 模式下为 `true`，release 模式下为 `false`。

**任务**：补全下面代码中的 `???` 部分，使用 `cfg!` 来判断当前构建类型，在 debug 模式打印"调试模式：功能全开"，release 模式打印"发布模式：性能优先"。

（在 Rust Playground （即本网页编辑器） 中默认是 debug 模式，所以你写完后会看到"调试模式"的输出）

```rust editable
fn main() {
    if ??? {
        println!("调试模式：功能全开");
    } else {
        println!("发布模式：性能优先");
    }
}
```

```expected
调试模式：功能全开
```
