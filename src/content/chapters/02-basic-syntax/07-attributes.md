---
title: "属性"
description: "学习 Rust 属性的语法与用途，掌握 dead_code 警告处理和 cfg 条件编译的核心写法。"
difficulty: beginner
estimatedTime: 30
keywords: ["属性", "attribute", "cfg", "dead_code", "allow", "条件编译", "derive"]
---

# 属性基础

属性（attribute）是 Rust 中为代码附加元数据的机制，编译器会读取这些元数据并据此改变编译行为。

## 什么是属性

属性可以应用于 crate、模块、函数、结构体等任何 Rust 项。最常见的属性之一是 `#[derive(...)]`，它告诉编译器自动为类型生成某些 trait 的实现：

```rust runnable
// #[derive(Debug)] 是一个属性，让编译器自动实现 Debug trait
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 3, y: 5 };
    println!("{:?}", p); // {:?} 格式需要 Debug trait
}
```

属性能做什么？常见用途包括：

- 自动派生 trait 实现（`#[derive(...)]`）
- 条件编译，只在特定平台或配置下包含某段代码（`#[cfg(...)]`）
- 禁用或启用编译器警告（`#[allow(...)]`、`#[warn(...)]`）
- 标记单元测试函数（`#[test]`）
- 设置文档注释（`#[doc = "..."]`）

## 语法格式

Rust 属性有两种作用范围：

- **`#[attribute]`**：作用于紧跟其后的**单个项**（函数、结构体等）
- **`#![attribute]`**：作用于**整个 crate 或模块**，通常放在文件顶部，注意多了一个 `!`

```rust runnable
// #![allow(unused_variables)] 放在文件顶部，作用于整个 crate
// 这里用函数级的 allow 来演示效果

#[derive(Debug, Clone)]        // #[attribute(value1, value2)] 形式
struct Color {
    r: u8,
    g: u8,
    b: u8,
}

fn main() {
    let red = Color { r: 255, g: 0, b: 0 };
    let also_red = red.clone(); // clone 由 derive 自动实现
    println!("{:?}", red);
    println!("{:?}", also_red);
}
```

属性可以带参数，有三种格式：

```rust
#[attribute = "value"]           // 键值对形式，如 #[doc = "说明文字"]
#[attribute(key = "value")]      // 括号键值对，如 #[cfg(target_os = "linux")]
#[attribute(value)]              // 单值，如 #[allow(dead_code)]
#[attribute(value1, value2)]     // 多值，如 #[derive(Debug, Clone)]
```

> `crate_type` 和 `crate_name` 是两个特殊的 crate 级属性（`#![crate_type = "lib"]`），可以在直接用 `rustc` 编译时指定 crate 类型和名称。但在 Cargo 项目中这两个属性**没有效果**——Cargo 通过 `Cargo.toml` 管理这些信息。

## dead_code 与 allow

Rust 编译器内置了一个 lint 叫 `dead_code`，当你写了一个函数但从未调用它时会产生警告：

```rust runnable
fn used_function() {
    println!("我被调用了");
}

fn unused_function() {
    // 这个函数没有被调用，编译器会产生 dead_code 警告
    println!("我从未被调用");
}

fn main() {
    used_function();
}
```

用 `#[allow(dead_code)]` 可以告诉编译器："我知道这个函数没被调用，这是故意的，不要警告"：

```rust runnable
fn used_function() {
    println!("我被调用了");
}

#[allow(dead_code)]
fn unused_function() {
    println!("我知道没被调用，但不要警告我");
}

fn main() {
    used_function();
}
```

如果想全局禁用整个文件的 `dead_code` 警告，可以在文件顶部使用 crate 级属性：

```rust runnable
#![allow(dead_code)]

fn a() {}
fn b() {}
fn c() {}

fn main() {
    a();
    // b 和 c 没被调用，但由于 #![allow(dead_code)]，不会有警告
}
```

> 在实际项目中，应当清理掉真正多余的死代码，而不是用 `allow` 来掩盖问题。`#[allow(dead_code)]` 更适合用于：库中暂未导出的内部函数、条件编译中某平台不会用到的函数。

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

`cfg` 支持三种逻辑运算符来组合条件：

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

fn main() {
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    linux_x64_only();

    #[cfg(any(target_os = "linux", target_os = "macos"))]
    unix_like();
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

这个区别很重要：如果某段代码用了只在特定平台存在的 API，**必须用 `#[cfg(...)]`** 而不是 `if cfg!(...)`，否则在其他平台会因为找不到 API 而编译报错。

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

除了内置条件，还可以通过 `--cfg` 标记向编译器传入自定义条件。下面的代码在 Playground 中运行时，`some_condition` 未被定义，因此 `conditional_function` 不会被编译进来：

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

> 在 Cargo 项目中，自定义条件通常通过 `build.rs` 构建脚本或 `features` 特性标志来管理，不直接使用 `--cfg` 命令行标记。

# 练习题

## 属性基础测验

```quiz single
Q: `#[attribute]` 和 `#![attribute]` 的区别是什么？
+ `#[attribute]` 作用于紧跟其后的单个项，`#![attribute]` 作用于整个 crate 或模块
- `#[attribute]` 只能用于函数，`#![attribute]` 只能用于结构体
- `#![attribute]` 是错误语法，Rust 不支持这种写法
- 两者完全相同，可以互换使用
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
- 这两个属性在所有 Rust 项目中都有效
+ 这两个属性只在直接用 rustc 编译时有效，在 Cargo 项目中没有效果
- 这两个属性已被废弃，不应再使用
- 这两个属性只能在库项目中使用
E: crate_name 和 crate_type 是 rustc 级别的属性。使用 Cargo 时，crate 名称和类型由 Cargo.toml 管理，这两个属性不起作用。这是 RBE 原文中特别提醒的注意点。
```

## 条件编译测验

```quiz single
Q: `#[cfg(target_os = "linux")]` 和 `if cfg!(target_os = "linux")` 最重要的区别是什么？
+ `#[cfg(...)]` 让代码在条件不满足时完全不被编译；`cfg!(...)` 始终编译代码，只在运行时返回 bool
- `#[cfg(...)]` 只能用于函数，`cfg!(...)` 可以用于任何地方
- 两者行为完全相同，可以互换
- `cfg!(...)` 性能更好，应该优先使用
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
- 只要是 Linux 就会编译
- 只要 CPU 是 x86_64 就会编译
+ 同时满足"目标是 Linux"且"CPU 架构是 x86_64"时才会编译
- 任何情况下都会编译
E: `cfg(all(...))` 要求括号内所有条件同时满足。这里需要目标操作系统是 linux 且目标架构是 x86_64，两个条件缺一不可。
```

```quiz multi
Q: 下列关于 Rust 属性的说法，哪些是正确的？
+ `#[cfg(not(条件))]` 表示条件不满足时才编译该项
+ `#![allow(dead_code)]` 放在文件顶部可以全局禁用 dead_code 警告
- `crate_name` 属性在 Cargo 项目中能正常设置 crate 名称
+ `cfg(any(条件A, 条件B))` 表示任意一个条件满足就编译
- `#[cfg(...)]` 和 `cfg!(...)` 在任何场景下都可以互换使用
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

### 练习二：条件编译问候语

使用 `cfg!` 宏让程序根据构建类型打印不同的消息。在 Rust Playground 中 `debug_assertions` 默认为 `true`（debug 模式）。

```rust editable
fn main() {
    // TODO：使用 cfg!(debug_assertions) 判断构建类型
    // debug 构建打印："调试模式：功能全开"
    // release 构建打印："发布模式：性能优先"
    println!("TODO");
}
```

```expected
调试模式：功能全开
```
