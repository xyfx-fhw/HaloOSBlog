---
title: "借用与引用"
description: "学习如何通过引用借用值，而不转移所有权"
difficulty: intermediate
estimatedTime: 25
keywords: ["借用", "引用", "&T", "&mut T", "借用规则"]
---

## 什么是借用

**借用**允许你使用一个值而不取得其所有权。通过创建引用（reference）实现：

```rust
fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s); // 借用 s
    println!("'{}' 的长度是 {}。", s, len); // s 依然有效
}

fn calculate_length(s: &String) -> usize {
    s.len()
}
```

## 不可变借用与可变借用

| 类型 | 语法 | 同时可以有几个 |
|------|------|--------------|
| 不可变引用 | `&T` | 任意多个 |
| 可变引用 | `&mut T` | 仅一个 |

## 借用规则

任意时刻，你只能拥有：

- **若干个**不可变引用，**或者**
- **一个**可变引用

这些规则在编译期由借用检查器（borrow checker）强制执行。

## 悬垂引用

Rust 编译器保证引用永远不会成为**悬垂引用**（dangling reference）：

```rust
// 以下代码无法编译：
fn dangle() -> &String {
    let s = String::from("hello");
    &s // s 在函数结束时被 drop，引用将悬垂
}
```
