---
title: "借用与引用"
description: "学习如何通过引用借用值，而不转移所有权"
difficulty: intermediate
estimatedTime: 25
keywords: ["借用", "引用", "&T", "&mut T", "借用规则"]
---

# 什么是借用

## 引用的概念

**借用**允许你使用一个值而不取得其所有权。通过创建**引用**（reference）实现：

```rust runnable
fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s); // 借用 s
    println!("'{}' 的长度是 {}。", s, len); // s 依然有效
}

fn calculate_length(s: &String) -> usize {
    s.len()
}
```

## 借用 vs 移动

| | 移动 | 借用 |
|--|------|------|
| 语法 | `f(s)` | `f(&s)` |
| 原变量是否还能用 | 否 | 是 |
| 函数内能否修改 | 是 | 否（默认） |

# 不可变借用与可变借用

## 不可变引用 &T

不可变引用可以同时存在多个，但不能修改数据：

```rust runnable
fn main() {
    let s = String::from("hello");
    let r1 = &s;
    let r2 = &s; // 可以同时存在多个不可变引用
    println!("{} and {}", r1, r2);
}
```

## 可变引用 &mut T

可变引用在同一时刻只能有一个：

```rust runnable
fn main() {
    let mut s = String::from("hello");
    change(&mut s);
    println!("{}", s);
}

fn change(s: &mut String) {
    s.push_str(", world");
}
```

# 借用规则

## 核心约束

任意时刻，你只能拥有：

- **若干个**不可变引用，**或者**
- **一个**可变引用

这些规则在编译期由借用检查器（borrow checker）强制执行。

## 规则的好处

这个约束防止了**数据竞争**（data race）：同一时间有两个或更多指针访问同一数据，其中至少一个在写入，且访问没有同步机制。

# 悬垂引用

## 编译器防止悬垂引用

Rust 编译器保证引用永远不会成为**悬垂引用**（dangling reference）——指向已被释放内存的引用：

```rust runnable expect-error
fn dangle() -> &String {
    let s = String::from("hello");
    &s // s 在函数结束时被 drop，引用将悬垂
}

fn main() {
    let ref_to_nothing = dangle();
}
```

## 正确做法：返回值而非引用

```rust runnable
fn no_dangle() -> String {
    let s = String::from("hello");
    s  // 所有权转移出去，不会被 drop
}

fn main() {
    let s = no_dangle();
    println!("{}", s);
}
```
