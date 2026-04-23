---
title: "Hello, World!"
description: "使用 Cargo 创建第一个 Rust 项目并运行"
difficulty: beginner
estimatedTime: 15
keywords: ["Hello World", "Cargo", "main 函数", "println!"]
---

## 创建项目

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

## main.rs 的内容

打开 `src/main.rs`，默认内容：

```rust
fn main() {
    println!("Hello, world!");
}
```

- `fn main()` — 程序入口函数，每个可执行 Rust 程序都从 `main` 开始执行
- `println!` — 宏（注意感叹号），向标准输出打印一行文本

## 运行程序

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
