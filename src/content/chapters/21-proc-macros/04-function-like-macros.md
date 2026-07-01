---
title: "类函数宏"
description: "了解类函数宏的定义与使用，学会用 #[proc_macro] 处理任意 token 序列，实现编译时 DSL 解析等高级用法。"
difficulty: advanced
estimatedTime: 35
keywords: ["类函数宏", "proc_macro", "DSL", "TokenStream", "编译时解析"]
---

# 类函数宏的形式

## 三种宏的外观对比

你现在认识了三种宏，它们看起来是：

```rust
// 1. 声明宏（macro_rules!）
vec![1, 2, 3]
println!("hello")

// 2. derive 宏
#[derive(Debug, Clone)]
struct Point { ... }

// 3. 类属性宏
#[route(GET, "/")]
async fn index() { ... }

// 4. 类函数宏
let query = sql!(SELECT * FROM users WHERE id = ?);
html! { <div class="main">Hello</div> }
```

**类函数宏**（Function-like Macro）看起来像普通函数调用（加 `!`），但它的括号里可以是**任意 token 序列**，不需要是合法的 Rust 表达式。

`sql!(SELECT * FROM users)` 这行代码括号里的内容是 SQL，不是 Rust。声明宏和普通函数都做不到接受这样的输入——类函数过程宏可以。

## 与 macro_rules! 的区别

| | `macro_rules!` | 类函数过程宏 |
|--|--|--|
| 实现方式 | 模式匹配规则 | 任意 Rust 代码逻辑 |
| 能力 | 受限于模式匹配 | 可以做任意分析和生成 |
| 错误信息 | 有时难以理解 | 可以自定义精确错误位置 |
| 调试 | 难调试 | 是正常的 Rust 函数，可以 println! 调试 |
| 适用场景 | 简单重复模式 | 复杂解析、编译时验证、DSL |

## 函数签名

类函数宏只接收一个 `TokenStream`：

```rust
#[proc_macro]
pub fn my_macro(input: TokenStream) -> TokenStream {
    // input 是括号里的所有 token
    // 返回值是展开后的代码
    input
}
```

注意 `#[proc_macro]` 而不是 `#[proc_macro_derive]` 或 `#[proc_macro_attribute]`。

# 实现一个 HTML 生成宏

## 目标

实现一个简单的 `html!` 宏，把类似 HTML 的语法转换为字符串拼接代码：

```rust
let output = html!(div "container" { "Hello, " strong { "World" } "!" });
// 生成：<div class="container">Hello, <strong>World</strong>!</div>
```

真正的 `html!` 宏（如 `yew` 框架的）非常复杂。这里实现一个简化版，重点学习类函数宏的结构。

## 简化版实现：编译时验证数学表达式

先从更简单的例子开始——一个 `assert_positive!` 宏，在编译时检查字面量是否为正数：

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, LitInt};

// assert_positive!(42)    → 编译通过
// assert_positive!(-1)    → 编译错误（但 i32 字面量不能是负数，所以这个例子需要调整）
// assert_positive!(0)     → 编译错误：0 不是正数

#[proc_macro]
pub fn assert_positive(input: TokenStream) -> TokenStream {
    // 解析输入为整数字面量
    let lit = parse_macro_input!(input as LitInt);
    let value: i64 = lit.base10_parse().expect("需要整数字面量");

    if value <= 0 {
        // 返回编译错误
        return quote! {
            compile_error!("assert_positive! 需要正整数");
        }.into();
    }

    // 编译通过，生成值本身的代码
    let u = value as u64;
    quote! { #u }.into()
}
```

使用时：

```rust
use my_macros::assert_positive;

fn main() {
    let n = assert_positive!(42);   // ✅ 编译时确认 42 > 0
    println!("{}", n);              // 42
    
    // let m = assert_positive!(0); // ❌ 编译错误：assert_positive! 需要正整数
}
```

这个宏虽然简单，但演示了核心能力：**在编译时验证数据的合法性**，违法时给出清晰错误，比运行时的 `assert!` 更早发现问题。

## 实现一个格式验证宏（checked_parse）

下面实现一个更实用的宏：在编译时验证字符串是否是合法的格式：

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, LitStr};

// 检查 IP 地址格式（编译时）
#[proc_macro]
pub fn ip(input: TokenStream) -> TokenStream {
    let lit = parse_macro_input!(input as LitStr);
    let value = lit.value();

    // 在编译时解析 IP 地址——如果格式不对，编译报错
    let parsed: Result<std::net::IpAddr, _> = value.parse();
    match parsed {
        Ok(_) => {
            // 合法 IP，生成解析表达式
            quote! {
                #lit.parse::<std::net::IpAddr>().unwrap()
            }.into()
        }
        Err(_) => {
            // 非法 IP，编译时报错，并精确指向这个宏调用的位置
            let msg = format!("非法的 IP 地址：{}", value);
            quote! {
                compile_error!(#msg)
            }.into()
        }
    }
}
```

使用时：

```rust
use my_macros::ip;

fn main() {
    let addr = ip!("192.168.1.1");   // ✅ 编译时验证通过
    println!("{}", addr);            // 192.168.1.1

    // let bad = ip!("999.999.0.0"); // ❌ 编译错误：非法的 IP 地址：999.999.0.0
    // let bad2 = ip!("localhost");  // ❌ 编译错误：非法的 IP 地址：localhost
}
```

这是类函数过程宏的经典用途：**把运行时才会发现的错误，提前到编译时报告**。

## 实现一个 SQL 模板宏（简化版）

真实框架中 `sqlx` 的 `query!` 宏会在编译时连接数据库验证 SQL。这里实现一个简化版，只验证 SQL 语法关键字：

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, LitStr};

// sql!("SELECT * FROM users") → 生成字符串常量，同时验证以 SELECT/INSERT/UPDATE/DELETE 开头
#[proc_macro]
pub fn sql(input: TokenStream) -> TokenStream {
    let lit = parse_macro_input!(input as LitStr);
    let query = lit.value();
    let query_upper = query.trim().to_uppercase();

    let valid_start = ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP"]
        .iter()
        .any(|kw| query_upper.starts_with(kw));

    if !valid_start {
        let msg = format!(
            "SQL 语句必须以 SELECT/INSERT/UPDATE/DELETE/CREATE/DROP 开头，得到：\"{}\"",
            query
        );
        return quote! { compile_error!(#msg) }.into();
    }

    // 验证通过，返回字符串
    quote! { #lit }.into()
}
```

使用时：

```rust
use my_macros::sql;

fn main() {
    let q = sql!("SELECT * FROM users WHERE id = 1");  // ✅
    println!("执行查询：{}", q);

    // let bad = sql!("HACK users SET admin = true");  // ❌ 编译错误
}
```

# 练习题

## 类函数宏测验

```quiz single
Q: 类函数宏和声明宏（macro_rules!）的最大优势差异是什么？
+ 类函数宏可以运行任意 Rust 逻辑来分析 token，而 macro_rules! 只能做模式匹配替换
- 类函数宏不需要 !
- 类函数宏执行速度更快
- 类函数宏可以被测试，macro_rules! 不行
E: macro_rules! 的核心限制：它只能检查输入 token 是否"看起来像某种形状"，然后按模板替换——无法运行代码逻辑、无法做计算、无法在编译时查询外部资源（如数据库）。类函数过程宏本质是一个 Rust 函数，可以运行任意逻辑，包括在编译时连接数据库验证 SQL（sqlx 就这么做）。
```

```quiz single
Q: 类函数宏的主要应用场景是哪个？
- 只能用于生成 trait 实现
- 实现运算符重载
- 替代所有的 macro_rules! 宏
+ 编译时验证（验证字符串格式、SQL 语法、正则表达式等），以及实现需要任意 token 输入的 DSL
E: 类函数宏的杀手级用途是"把运行时错误提前到编译时"——比如 regex!("...") 编译时验证正则表达式是否合法，sql!("...") 编译时验证 SQL 语法，format_spec!("...") 验证格式字符串。这些在 macro_rules! 里很难甚至无法实现。
```

```rust
#[proc_macro]
pub fn double(input: TokenStream) -> TokenStream {
    let lit = parse_macro_input!(input as LitInt);
    let value: u64 = lit.base10_parse().unwrap();
    let doubled = value * 2;
    quote! { #doubled }.into()
}
```

```quiz single
Q: double!(21) 这个宏展开后是什么？
- 生成一个名为 double_21 的常量
- 调用一个名为 double 的函数，传入 21
+ 直接替换为数字字面量 42
- 编译错误，21 * 2 不能在编译时计算
E: 过程宏在编译时执行。double!(21) 调用时，宏接收 21 这个 token，在编译时计算 21 * 2 = 42，然后返回 quote! { 42 }。在最终的编译结果里，double!(21) 就等于直接写 42，没有任何运行时开销。
```

```quiz multi
Q: 以下哪些是类函数过程宏的合理使用场景？
- 替代普通的 fn 函数定义
+ 实现一个类似 HTML 模板的 DSL，括号里写 HTML 语法
+ 在编译时连接数据库验证 SQL 查询的列名和类型是否存在（sqlx 的做法）
+ 在编译时验证正则表达式格式是否合法（如 regex!("[invalid")）
E: 类函数宏的核心价值：处理非标准 Rust 语法的 token（DSL）、在编译时运行任意逻辑（验证、查询外部资源）。不能用于定义函数——那是类属性宏的事（虽然属性宏可以帮你生成函数，但类函数宏本身不是函数定义语法）。
```
