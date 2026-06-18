---
title: "panic! 与不可恢复错误"
description: "理解 Rust 错误处理的第一层：panic! 的触发时机、如何读懂 panic 输出、如何用 backtrace 定位问题根源。"
difficulty: beginner
estimatedTime: 20
keywords: ["panic", "错误处理", "backtrace", "不可恢复错误", "index out of bounds"]
---

# 错误的两种类型

所有程序都会遇到错误——文件不存在、用户输入了非法数据、网络连接超时。Rust 把这些情况分成截然不同的两类，并用不同的机制分别处理：

<img src="/RustCourse/diagrams/error.svg" alt="error" style="max-width:100%;margin:1rem 0;" />

- **不可恢复的错误（unrecoverable errors）**：程序遭遇了"不应该发生"的状态，继续运行会带来更大的风险。最典型的例子是代码中的 bug——访问了数组越界位置、违反了程序的核心不变量。这类情况的正确处理是**立即停止程序**。

- **可恢复的错误（recoverable errors）**：错误在预期范围内，程序可以做出响应并继续。文件不存在 → 提示用户或创建文件；格式解析失败 → 报告给调用者处理。这类错误用 `Result<T, E>` 来处理，下一篇会详细讲解。

本文聚焦第一类：**不可恢复的错误**和 `panic!` 宏。

## 使用 panic! 宏

`panic!` 宏用于"程序无法继续执行"的情况，调用后它会：

1. 打印一条错误信息
2. 清理调用栈（默认行为，称为"展开"）
3. 退出程序

```rust runnable
fn main() {
    panic!("发生了不可恢复的错误！");
}
```

运行后会看到类似这样的输出：

```text
thread 'main' panicked at '发生了不可恢复的错误！', src/main.rs:2:5
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

第一行告诉你：在哪个文件的哪一行触发了 panic，以及消息内容。第二行提示可以用 `RUST_BACKTRACE=1` 查看完整调用链。

## 自动触发的 panic

很多时候 panic 不是手动调用的，而是 Rust 内部检测到非法操作时**自动触发**的。最常见的例子是访问越界索引：

```rust runnable
fn main() {
    let v = vec![1, 2, 3];
    println!("{}", v[99]);  // 只有 3 个元素，index 99 不存在
}
```

Rust 会 panic 并提示：

```text
thread 'main' panicked at 'index out of bounds: the len is 3 but the index is 99'
```

**为什么 Rust 选择 panic 而不是返回垃圾值？** 这是有意识的安全设计。C 语言中，越界访问会直接读取那块内存里碰巧在那儿的数据，这叫**缓冲区溢出（buffer overread）**，是大量安全漏洞的根源。Rust 宁可程序立即崩溃，也不允许读取不属于该数组的内存。

## 用 backtrace 定位问题

当 panic 发生在标准库内部时，错误信息指向的是标准库的源码，不是你的代码。这时候 **backtrace（调用链追踪）** 很有用。

设置环境变量 `RUST_BACKTRACE=1` 再运行，可以看到从程序入口到 panic 点的完整调用链：

```bash
RUST_BACKTRACE=1 cargo run
```

输出中每一行是一个**栈帧**（函数调用记录）。读 backtrace 的关键是**从上往下找第一个写着你自己文件名的行**——那就是问题的发源地。

对于上面的越界例子，backtrace 里会有一行类似：

```text
12: panic_example::main
         at src/main.rs:3
```

这告诉你：问题在 `src/main.rs` 的第 3 行，也就是 `v[99]` 那里。

> **注意**：backtrace 需要程序以 debug 模式编译（不加 `--release`）。Release 模式下可能缺少调试符号，输出不够完整。

## 展开与终止：panic 的两种行为

panic 触发后，Rust 默认的行为是**展开（unwinding）**：顺着调用栈往回走，逐个清理各函数的数据（调用析构函数、释放内存）。这保证资源正确释放，但有一定开销。

如果你追求更小的二进制文件，可以改为**终止（abort）**：直接退出进程，让操作系统回收内存。在 `Cargo.toml` 里配置：

```toml
[profile.release]
panic = 'abort'
```

这样 release 模式下 panic 时会直接终止，不展开调用栈。

> 对于大多数应用来说，默认的展开行为就够用了。`panic = 'abort'` 主要用在两种场景：一是对二进制体积极度敏感的项目；二是嵌入式开发（`no_std` 环境），那里没有操作系统支持，调用栈展开的实现方式与具体芯片架构强绑定（ARM、RISC-V 等各不相同），通常直接 abort 更可靠。嵌入式场景还需要用 `#[panic_handler]` 自定义 panic 发生时的行为（比如让指示灯闪烁或复位芯片），但这属于嵌入式开发的专题内容。

# 练习题

## panic 基础测验

```rust
fn main() {
    let v = vec![1, 2, 3];
    let x = v[5];
    println!("{}", x);
}
```

```quiz single
Q: 上面的代码会发生什么？
- 打印 0（默认值）
- 打印随机内存中的值
+ 程序 panic，提示 index out of bounds
- 编译报错，无法运行
E: Rust 不允许越界访问。`v[5]` 在运行时触发 panic，程序立即退出，不会打印任何东西。这是 Rust 的安全设计：宁可 panic 也不读取未知内存。
```

```quiz single
Q: RUST_BACKTRACE=1 的主要作用是什么？
- 让程序出错时不 panic，改为打印日志
+ 在 panic 时显示完整的调用链，帮助定位问题来源
- 让程序在 release 模式下也显示调试信息
- 让 panic 变成一个可恢复的错误
E: RUST_BACKTRACE=1 是一个环境变量，设置后程序 panic 时会额外打印调用栈（stack trace），帮助你找到是从哪一行代码触发了 panic。
```

```quiz single
Q: panic! 和返回 Result::Err 的根本区别是什么？
- panic! 只能用在 main 函数里
- panic! 会显示更详细的错误信息
+ panic! 无法被调用者处理，程序立即终止；返回 Err 则将错误传递给调用者处理
- 没有区别，可以互换使用
E: panic! 是不可恢复的——一旦 panic，调用链上的任何代码都无法"接住"这个错误并继续。而返回 Err 是处理可恢复错误的正常方式，调用者收到 Err 后可以选择如何应对。
```

```quiz multi
Q: 下列哪些情况适合使用 panic!？（多选）
- 网络连接超时，需要告诉用户稍后重试
+ 在测试代码中，某个操作失败了（测试就应该失败）
- 用户输入了格式不正确的数据，需要提示重新输入
+ 代码检测到了一个本不可能发生的状态（代表存在 bug）
+ 用 unwrap 处理一个经过逻辑验证、不可能是 Err 的 Result
E: panic! 适合"这不应该发生"的场景：测试中的失败、代码 bug、违反程序不变量、以及你比编译器更清楚某个值一定合法的情况。用户输入错误和网络超时是可预期的、可恢复的错误，应该用 Result 处理。
```

```quiz single
Q: 在 Cargo.toml 中设置 panic = 'abort' 有什么效果？
- 程序永远不会 panic，所有错误都转为 Result
- panic 时直接打印错误并继续运行
+ panic 时直接终止进程，不展开调用栈清理资源，可减小二进制体积
- 禁止在代码中手动调用 panic!
E: abort 模式下 panic 会立刻杀死进程，不会逐帧清理调用栈。这样二进制文件更小，但也意味着 Drop 析构函数可能不会被调用。通常用于嵌入式或对体积敏感的场景。
```
