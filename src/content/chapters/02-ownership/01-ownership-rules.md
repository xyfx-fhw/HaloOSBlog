---
title: "所有权规则"
description: "深入理解 Rust 所有权的三条基本规则及其含义"
difficulty: intermediate
estimatedTime: 20
keywords: ["所有权规则", "移动", "Clone", "Copy"]
---

## 三条基本规则

Rust 中的所有权遵循以下三条规则：

1. 每个值都有一个变量作为其 **所有者**
2. 值在任一时刻只能有 **一个** 所有者
3. 当所有者离开作用域，值将被自动丢弃

## 移动语义

当你将一个变量赋值给另一个变量时，所有权会发生 **移动**（move）：

```rust
let s1 = String::from("hello");
let s2 = s1; // s1 的所有权移动到 s2
// println!("{}", s1); // 编译错误！s1 已失效
println!("{}", s2);
```

## Copy 类型

实现了 `Copy` trait 的类型（如整数、浮点数、bool）在赋值时会**复制**而非移动：

```rust
let x = 5;
let y = x; // x 被复制，x 和 y 都有效
println!("x = {}, y = {}", x, y);
```

## 函数与所有权

将值传给函数时，所有权同样会发生移动或复制，规则与赋值完全相同：

```rust
fn main() {
    let s = String::from("hello");
    takes_ownership(s);        // s 的所有权移入函数
    // println!("{}", s);      // 错误！s 已无效

    let x = 5;
    makes_copy(x);             // x 的值被复制
    println!("{}", x);         // 仍然有效
}

fn takes_ownership(some_string: String) {
    println!("{}", some_string);
} // some_string 在这里被 drop

fn makes_copy(some_integer: i32) {
    println!("{}", some_integer);
}
```
