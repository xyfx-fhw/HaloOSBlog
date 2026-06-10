---
title: "Hello, World!"
description: "从零编写并运行第一个 Rust 程序，理解 main 函数、println! 宏和编译流程，感受 Rust 的设计哲学。"
difficulty: beginner
estimatedTime: 20
keywords: ["Hello World", "main函数", "println!", "rustc", "编译", "预编译"]
---

# 你的第一个 Rust 程序

按照程序员世界的传统，学习一门新语言的第一件事，就是让计算机说出 "Hello, world!"。这不只是仪式感——它能让你快速感受到这门语言最基本的节奏：写代码、编译、运行。

## 创建项目目录

Rust 对代码存放的位置没有任何限制，但养成规范的目录结构是好习惯。我们在主目录下创建一个统一的 `projects` 目录，存放本教程的所有练习。

**Linux / macOS / Windows PowerShell：**

```bash
mkdir ~/projects
cd ~/projects
mkdir hello_world
cd hello_world
```

**Windows CMD：**

```bash
mkdir "%USERPROFILE%\projects"
cd /d "%USERPROFILE%\projects"
mkdir hello_world
cd hello_world
```

> **文件命名约定：** 如果文件名包含多个单词，统一用小写字母并通过下划线分隔，例如 `hello_world.rs`，而不是 `helloworld.rs` 或 `HelloWorld`。这是 Rust 社区的惯例。

## 编写第一个程序

在 `hello_world` 目录下，创建名为 `main.rs` 的文件（Rust 源文件以 `.rs` 结尾），输入以下内容：

```rust runnable
fn main() {
    println!("Hello, world!");
}
```

保存文件。你刚才写完了人生中第一个 Rust 程序，只有两行代码。接下来我们逐行拆解它。

## 程序解剖：每行代码的含义

这个程序虽然简单，但 Rust 的几个核心语法已经悄悄出现了。

### `fn main()` 是什么？

`fn` 是 **function（函数）** 的缩写，`main` 是这个函数的名字，`()` 表示它不接收任何参数。

```rust runnable
// main 函数是程序的入口点
// Rust 运行时总是从这里开始执行
fn main() {
    // 函数体放在一对大括号里
}
```

`main` 函数是每个可执行 Rust 程序的**入口点**——就像马拉松的起跑线，无论程序有多复杂，都从 `main` 跑起来。

> Rust 规范要求左大括号 `{` 和函数声明放在同一行，中间加一个空格。如果你不确定格式是否规范，可以运行 `rustfmt main.rs`，这是 Rust 工具链内置的格式化工具，会自动帮你整理代码风格。

### `println!` 是什么？

注意 `println` 后面有一个感叹号 `!`。在 Rust 中，**带 `!` 的是宏（macro），不是普通函数**：

```rust runnable
fn main() {
    println!("Hello, world!");  // println! 是宏
}
```

宏和函数有本质区别——宏在编译阶段就会展开处理代码，能做到函数做不到的事情（比如接受数量不固定的参数）。`println!` 就是一个功能强大的宏，能格式化并把文本打印到终端。

关于"宏到底是什么"先按下不表，等你对 Rust 有了更多了解之后，我们会专门深入讲解。**现在只需记住一条规则：看到 `!` = 调用的是宏。**

### 字符串字面量与分号

```rust runnable
fn main() {
    //        双引号包裹的文本叫字符串字面量
    println!("Hello, world!");
    //                        ^ 英文分号，表示这条语句结束
}
```

还有两个细节值得注意：

1. **4 个空格的缩进**，不是 Tab。这是 Rust 社区的统一约定。
2. **英文分号 `;`** 表示这条语句已经完整结束。Rust 中大多数语句都以 `;` 结尾——后续你会理解为什么"大多数"而不是"全部"。

## 编译并运行

Rust 是**编译型语言**，必须先把源代码编译成二进制可执行文件，才能运行。

### 第一步：编译

在终端中，确保你在 `hello_world` 目录下，执行：

```bash
rustc main.rs
```

这条命令调用 Rust 编译器 `rustc`，把 `main.rs` 编译成可执行文件。编译成功后不会有任何输出——**没有消息就是好消息**。

### 第二步：查看生成的文件

```bash
ls          # Linux / macOS
dir /B      # Windows CMD
```

你会看到：

| 文件 | 说明 |
|------|------|
| `main.rs` | 你写的源代码 |
| `main`（Linux/macOS）或 `main.exe`（Windows） | 编译产出的可执行文件 |
| `main.pdb`（仅 Windows） | 调试符号文件 |

### 第三步：运行

```bash
./main          # Linux / macOS
.\main.exe      # Windows PowerShell / CMD
```

终端应该输出：

```text
Hello, world!
```

看到这行输出了吗？**恭喜你，你已经是一名 Rust 开发者了！**

## 编译型 vs 解释型：为什么 Rust 要编译？

如果你之前学过 Python、Ruby 或 JavaScript，可能会觉得"先编译再运行"多了一步，有点麻烦。但这背后有深刻的权衡。

| 特性 | 解释型（Python / JS） | 编译型（Rust / C++） |
|------|----------------------|---------------------|
| 运行方式 | 需要解释器逐行执行 | 直接运行二进制文件 |
| 分发程序 | 对方需要安装对应运行时 | 对方不需要安装任何东西 |
| 性能 | 相对较慢 | 接近硬件极限 |
| 错误发现时机 | 运行时才暴露 | **编译时就能发现大多数错误** |

Rust 选择做**预编译（ahead-of-time compiled）语言**，带来了两个关键好处：

**分发简单**：你可以把编译好的 `main` 文件直接发给任何人，他们不需要安装 Rust 就能直接运行。发给朋友一个 Python 脚本，他得先装 Python；发给他一个 Rust 编译出的可执行文件，双击就跑。

**错误前置**：Rust 编译器极其严格，能在你运行代码之前发现大量潜在错误。这也是 Rust"安全性"的核心来源之一——它不让不安全的程序通过编译关。

> 每次看到编译器报错，请别沮丧。Rust 的报错信息在所有主流语言里是出了名的详细和友好，它在帮你、不是在为难你。渐渐地你会发现，「把错误解决在编译阶段」是一件很爽的事。

## 小结

这篇文章里，你完成了人生中第一个 Rust 程序，并了解了它的每一行代码。回顾关键点：

- 每个 Rust 可执行程序都从 `fn main()` 开始运行
- `println!` 是一个**宏**，注意感叹号 `!`
- `rustc main.rs` 编译源代码，生成可执行文件
- Rust 是预编译语言，生成的二进制文件可以独立分发

用 `rustc` 直接编译对小程序没问题，但随着项目规模增长，管理依赖、组织代码文件会变得很繁琐。下一篇文章，我们来认识 Rust 的构建和包管理工具 **Cargo**，它才是你日常开发的真正起点。

# 练习题

## 程序入口

```quiz single
Q: 每个可执行 Rust 程序必须有一个什么函数？
- run
- start
+ main
- init
E: Rust 规定每个可执行程序的入口点是 main 函数，运行时从这里开始执行。run、start、init 在其他语言中常见，但 Rust 不认。
```

## 宏的标志

```quiz single
Q: 下列哪种写法是调用宏，而不是调用函数？
- println("Hello")
+ println!("Hello")
- print("Hello")
- console.log("Hello")
E: Rust 中宏调用以感叹号 ! 结尾，例如 println!。没有 ! 的 println 是函数调用，但标准库中并不存在这个函数，会报编译错误。
```

## 缩进风格

```quiz single
Q: Rust 社区约定的代码缩进是？
- 2 个空格
- 1 个 Tab
+ 4 个空格
- 2 个 Tab
E: Rust 官方代码风格约定使用 4 个空格缩进，rustfmt 格式化工具也遵循这一规范。
```

## 编译命令

```quiz single
Q: 把 main.rs 编译成可执行文件，应该用哪条命令？
- cargo main.rs
- rust main.rs
+ rustc main.rs
- compile main.rs
E: rustc 是 Rust 编译器的命令行工具，rustc main.rs 会把源文件编译成可执行文件。cargo 是更高级的构建工具，后续会学到。
```

## 预编译语言的优势

```quiz multi
Q: 与解释型语言相比，Rust 作为预编译语言有哪些优势？
+ 编译产物可以在没有安装 Rust 的机器上直接运行
- 代码不需要编译，可以直接执行
+ 很多错误在编译阶段就能被发现，而不是运行时
+ 生成的二进制文件运行性能更高
E: 预编译语言的核心优势是：①可执行文件独立分发，对方无需安装运行时；②编译器提前检查错误；③性能接近硬件极限。「不需要编译」恰好相反，那是解释型语言的特点。
```

## 错误修复

下面的代码有**两处**语法错误，找出并修复它们，让程序输出 `Hello, world!`。

```rust editable
fn main() {
    println("Hello, world!")
}
```

```expected
Hello, world!
```
