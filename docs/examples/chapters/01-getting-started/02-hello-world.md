---
title: "Hello, World!"
description: "使用 Cargo 创建第一个 Rust 项目并运行"
difficulty: beginner
estimatedTime: 15
keywords: ["Hello World", "Cargo", "main 函数", "println!"]
---

# 创建项目

## 使用 Cargo

Rust 使用 **Cargo** 作为构建系统和包管理器。创建新项目：

```bash
cargo new hello_world
cd hello_world
```

Cargo 会生成以下结构：

```
hello_world/
├── Cargo.toml    # 项目配置文件
└── src/
    └── main.rs   # 程序入口
```

## Cargo.toml

`Cargo.toml` 是项目的配置文件，记录项目名称、版本和依赖：

```toml
[package]
name = "hello_world"
version = "0.1.0"
edition = "2021"
```

# 理解 main.rs

## 函数结构

打开 `src/main.rs`，默认内容：

```rust
fn main() {
    println!("Hello, world!");
}
```

- `fn main()` — 程序入口函数，每个可执行 Rust 程序都从 `main` 开始执行
- `println!` — 宏（注意感叹号），向标准输出打印一行文本

## println! 宏的用法

`println!` 支持格式化字符串，用 `{}` 作为占位符：

```rust runnable
fn main() {
    let name = "Rust";
    let year = 2015;
    println!("{} 于 {} 年正式发布。", name, year);
}
```

# 运行程序

## cargo run

```bash
cargo run
```

输出：

```
   Compiling hello_world v0.1.0
    Finished dev [unoptimized + debuginfo] target(s) in 0.5s
     Running `target/debug/hello_world`
Hello, world!
```

**恭喜！** 你已成功运行了第一个 Rust 程序。

## cargo build 与 cargo run 的区别

| 命令 | 作用 |
|------|------|
| `cargo build` | 只编译，生成可执行文件到 `target/debug/` |
| `cargo run` | 编译并立即运行 |
| `cargo build --release` | 以优化模式编译（更慢，但产物更快） |
