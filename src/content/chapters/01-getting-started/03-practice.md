---
title: "练习：入门基础"
description: "巩固第一章内容的单选、多选与可编辑代码练习"
difficulty: beginner
estimatedTime: 15
keywords: ["练习", "rustup", "Hello World", "可变性"]
---

# 环境与工具链

## 单选：安装工具

```quiz single
Q: Rust 推荐使用哪一个工具来安装和管理工具链？
- apt-get
+ rustup
- cargo install
- brew install rust
E: rustup 是官方的工具链管理器，可以安装多个 Rust 版本（stable / beta / nightly）并在它们之间切换。
```

## 多选：Cargo 能做什么

```quiz multi
Q: 下列哪些操作由 Cargo 负责？
+ 创建新项目（cargo new）
+ 构建项目（cargo build）
- 安装操作系统补丁
+ 运行测试（cargo test）
E: Cargo 是 Rust 的构建系统与包管理器，负责项目创建、依赖管理、构建、测试、发布等，但不管系统级操作。
```

# 第一个程序

## 单选：main 函数

```quiz single
Q: Rust 可执行程序的入口函数名称是？
- start
- init
+ main
- run
E: 与 C/C++ 类似，Rust 用 `fn main()` 作为可执行程序入口。
```

## 编程题：补全 Hello, World!

下面的代码少了一行打印语句。请在 `main` 函数内补上 `println!("Hello, World!");`，然后点「运行」查看输出。

```rust editable
fn main() {
    // TODO: 在此处打印 Hello, World!
}
```

```expected
Hello, World!
```

# 变量与可变性

## 单选：可变变量

```quiz single
Q: 下列哪一种语法可以声明一个可变的 i32 变量？
- let x: i32 = 5;
+ let mut x: i32 = 5;
- var x: i32 = 5;
- mut x: i32 = 5;
E: Rust 变量默认不可变。要让变量可变，在 `let` 后加 `mut` 关键字。
```

## 编程题：修复可变性错误

下面的代码无法编译。请修复它，使得程序最终打印 `6`。

```rust editable
fn main() {
    let x = 5;
    x = 6;
    println!("{}", x);
}
```

```expected
6
```
