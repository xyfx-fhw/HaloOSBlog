---
title: "过程宏基础"
description: "理解过程宏的工作原理：TokenStream、proc-macro crate 的项目结构，以及过程宏与声明宏的核心区别。"
difficulty: advanced
estimatedTime: 30
keywords: ["过程宏", "TokenStream", "proc-macro", "元编程", "编译时"]
---

# 过程宏是什么

## 先回顾声明宏

你在前面学过 `macro_rules!`，它通过**模式匹配**来生成代码：

```rust runnable
macro_rules! say_hello {
    ($name:expr) => {
        println!("你好，{}！", $name);
    };
}

fn main() {
    say_hello!("Alice"); // 展开为 println!("你好，{}！", "Alice");
}
```

`macro_rules!` 的工作方式：**匹配输入的"形状"，按模板替换**。

这很强大，但有一个根本限制：你只能做**模式替换**，无法运行任意逻辑。

比如，你想根据结构体的字段数量生成不同的代码——`macro_rules!` 做不到，因为它不能"查看"结构体有几个字段。

## 过程宏：真正的 Rust 程序

**过程宏（Procedural Macro）**是完全不同的一种宏。

它是一段真正运行的 Rust 程序，在**编译时**被调用：

```text
你的源代码
    ↓
编译器遇到 #[derive(MyMacro)]
    ↓
调用你写的 Rust 程序（过程宏函数）
    ↓
你的程序接收 TokenStream（一串 token），可以运行任意逻辑
    ↓
输出新的 TokenStream（生成的代码）
    ↓
编译器把生成的代码和原代码合在一起继续编译
```

**声明宏 vs 过程宏：**

| | 声明宏 `macro_rules!` | 过程宏 |
|--|--|--|
| 实现方式 | 模式匹配替换 | 运行任意 Rust 代码 |
| 能力 | 只能做文本模板替换 | 可以分析 AST、运行逻辑、生成任意代码 |
| 错误提示 | 有限 | 可自定义详细错误信息 |
| 典型用途 | 简单代码生成 | `#[derive(Serialize)]`、`#[test]`、`sqlx::query!` |

## TokenStream：一串 token

过程宏接收和输出的是 **`TokenStream`**——编译器把源码解析成的"token 序列"。

"token"就是源码的最小语法单元，比如：

```text
struct Point { x: i32, y: i32 }
```

被分解成这些 token：

```text
`struct` `Point` `{` `x` `:` `i32` `,` `y` `:` `i32` `}`
```

过程宏函数的签名形式固定：

```rust
// 接收 token 序列，返回新的 token 序列
fn my_macro(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    // 可以读取 input 里的内容，生成新代码
    input // 最简单的情况：原样返回
}
```

## 三种过程宏

Rust 有三种不同形式的过程宏，分别用于不同场景：

### 1. 自定义 Derive 宏

最常见。为结构体或枚举自动实现 trait：

```rust
#[derive(Debug, Clone, Serialize)]  // Debug 和 Clone 是内置，Serialize 是 serde 库提供的
struct Point { x: f64, y: f64 }
```

你自己写一个 `#[derive(MyTrait)]`，让用户一行代码就能自动实现你的 trait。

### 2. 类属性宏

像内置属性一样，可以加在任意代码项上，并修改或替换该项：

```rust
#[route(GET, "/")]       // web 框架用属性宏标注路由
async fn index() { ... }

#[instrument]            // tracing 库的属性宏，自动追踪函数调用
fn my_function() { ... }
```

### 3. 类函数宏

看起来像函数调用（带 `!`），但能处理任意 token：

```rust
let query = sql!(SELECT * FROM users WHERE id = 42);
// sql! 是过程宏，可以在编译时验证 SQL 语句的语法！
```

# 搭建过程宏项目

## 为什么需要独立 crate

**过程宏必须放在独立的 crate 里。** 这是 Rust 编译器的硬性要求。

原因是：过程宏在**编译你的代码时**运行，而不是在运行时。编译器需要先编译过程宏，才能用它来编译你的项目。如果把过程宏和普通代码放在一起，就会产生循环依赖。

典型的项目结构：

```text
my-project/           ← 你的主项目
├── Cargo.toml
├── src/
│   └── main.rs       ← 使用过程宏的代码
│
└── my-macros/        ← 独立的过程宏 crate
    ├── Cargo.toml
    └── src/
        └── lib.rs    ← 过程宏的实现
```

## 过程宏 crate 的 Cargo.toml

过程宏 crate 需要在 `Cargo.toml` 中声明 `proc-macro = true`：

```toml
# my-macros/Cargo.toml
[package]
name = "my-macros"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true    # 告诉编译器这是一个过程宏 crate

[dependencies]
# 通常需要这两个库（后面章节会详细讲）
syn = "2"
quote = "1"
```

主项目依赖它：

```toml
# my-project/Cargo.toml
[dependencies]
my-macros = { path = "./my-macros" }
```

## 第一个过程宏：什么都不做

先写一个最简单的过程宏——接收输入，原样返回：

```rust
// my-macros/src/lib.rs

use proc_macro::TokenStream;

// #[proc_macro_derive(DoNothing)] 声明这是一个 derive 宏，名字叫 DoNothing
#[proc_macro_derive(DoNothing)]
pub fn do_nothing_derive(input: TokenStream) -> TokenStream {
    // 原样返回输入，不做任何修改
    input
}
```

用它：

```rust
// my-project/src/main.rs
use my_macros::DoNothing;

#[derive(DoNothing)]  // 什么都不做，只是演示结构
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    println!("编译成功！");
}
```

> **注意**：以上代码需要在有独立 proc-macro crate 的项目中运行，无法在 Rust Playground 中直接运行。可以用 `cargo new my-project` 新建项目，然后按上面的结构创建。

## 过程宏能做到什么（预告）

来看几个你已经每天都在用的过程宏：

```rust runnable
// #[derive(Debug)] 是一个过程宏（编译器内置实现）
// 它读取结构体的字段名和类型，自动生成 Debug 实现
#[derive(Debug, Clone, PartialEq)]
struct User {
    name: String,
    age: u32,
    active: bool,
}

fn main() {
    let u1 = User { name: "Alice".into(), age: 28, active: true };
    let u2 = u1.clone();           // Clone 来自 derive(Clone)
    println!("{:?}", u1);          // Debug 来自 derive(Debug)
    println!("{}", u1 == u2);      // PartialEq 来自 derive(PartialEq)
}
```

这段代码展示的就是过程宏的威力：不需要你手动写三个 trait 的实现，编译器调用内置的过程宏，扫描你的字段，自动生成正确的实现代码。

接下来的几篇文章，你将学会自己写这样的宏。

# 练习题

## 过程宏概念测验

```quiz single
Q: 下列关于过程宏的说法，哪个是正确的？
- 过程宏在程序运行时执行
- 过程宏必须写在 main.rs 中
- 过程宏和声明宏都只能做模式替换
+ 过程宏在编译时执行，可以接收 TokenStream、运行任意 Rust 逻辑、输出新的 TokenStream
E: 过程宏是在"编译时"运行的 Rust 程序。它的输入是 TokenStream（编译器传来的源码 token 序列），输出也是 TokenStream（生成的新代码）。这使得它可以运行任意逻辑，而不仅仅是模式替换。
```

```quiz single
Q: 为什么过程宏必须放在独立的 crate 里？
- 这只是一个约定，不是硬性要求
+ 因为过程宏在编译其他代码之前运行，必须先单独编译；若混在一起会产生循环依赖
- 为了让过程宏可以被多个项目复用
- 因为过程宏的语法和普通 Rust 不同，编译器需要特殊处理
E: 这是编译顺序决定的。编译器需要"先编译过程宏，才能用过程宏编译你的代码"。如果过程宏和用它的代码在同一个 crate，编译器就不知道先编译哪个，产生循环依赖。独立 crate 打破了这个循环。
```

```quiz single
Q: 以下哪个 Rust 标准库特性的底层实现用到了过程宏？
- fn main() 函数
+ #[derive(Debug)] 自动生成 Debug trait 实现
- for 循环
- let 变量绑定
E: #[derive(Debug)] 是编译器内置的过程宏（derive 宏）。它在编译时扫描结构体的字段，自动生成 fmt::Debug 的实现代码。#[test] 也是一个过程宏（类属性宏）。
```

```quiz single
Q: TokenStream 是什么？
- 网络传输的数据流
- 运行时的字节流
- 一种迭代器类型
+ 编译器将源码解析后的 token（词法单元）序列，是过程宏的输入和输出类型
E: 编译器首先把源码文本分解成 token（如 struct、Point、{、x 等），再把这些 token 打包成 TokenStream 传给过程宏函数。过程宏可以分析这些 token，然后返回新的 TokenStream 作为生成的代码。
```

```quiz multi
Q: Rust 的三种过程宏分别是什么？
+ 类属性宏：用 #[macro_name] 修饰任意代码项（函数、结构体等）
+ derive 宏：用 #[derive(MacroName)] 为类型自动实现 trait
- 闭包宏：用 |args| macro_body 定义
+ 类函数宏：看起来像 macro_name!(args) 的函数式调用形式
E: 三种过程宏：derive 宏（#[derive(X)]，自动生成 trait 实现）、属性宏（#[attr]，修改任意代码项）、函数式宏（name!(...)，处理任意 token）。没有"闭包宏"这个概念。
```
