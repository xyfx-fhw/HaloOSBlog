---
title: "线程"
description: "学习如何用 thread::spawn 创建线程、用 join 等待线程完成，以及用 move 闭包安全地跨线程传递数据。"
difficulty: intermediate
estimatedTime: 30
keywords: ["线程", "thread::spawn", "JoinHandle", "move 闭包", "并发"]
---

# 并发与线程

在大多数现代操作系统里，程序运行在一个**进程**（process）中，操作系统管理着多个进程。而进程内部，还可以拆分出多个同时运行的独立单元，叫做**线程**（thread）。

把工作分给多个线程能提升性能，但也带来了新挑战：

- **竞争状态**（Race condition）：多个线程以不可预期的顺序读写同一份数据
- **死锁**（Deadlock）：两个线程互相等待对方释放资源，永远卡住
- 只在特定时机才复现的玄学 bug

Rust 的设计哲学是「无畏并发」——通过所有权和类型系统，在**编译期**消除绝大部分并发错误。

## 线程模型：1:1 vs M:N

线程有两种主流实现方式，理解它们有助于你明白 Rust 的选择。

**1:1 模型**：程序创建的每个线程，操作系统都分配一个真实的 OS 线程与之对应。Rust 标准库使用这种模型。

**M:N 模型（绿色线程）**：语言运行时自己管理 M 个「用户态线程」，把它们调度到 N 个 OS 线程上运行，M 通常远大于 N。Go 的 goroutine、Erlang 的进程都是这种模型。

| | 1:1 模型（Rust 标准库） | M:N 模型（Go goroutine） |
|---|---|---|
| **线程由谁管理** | 操作系统 | 语言运行时 |
| **创建开销** | 较大（需要系统调用） | 极小（用户态切换） |
| **可并发数量** | 受 OS 限制，通常数千 | 可轻松开百万个 |
| **需要运行时** | 不需要 | 需要内置调度器 |

**Rust 为什么选 1:1？** Rust 的核心目标之一是「零额外运行时」——程序可以直接和 C 互操作，部署到嵌入式等受限环境。M:N 模型需要一个内置的线程调度器，这与目标冲突。

> 如果你需要百万级并发，Rust 生态提供了 `tokio`、`async-std` 等**异步运行时** crate。它们用少量 OS 线程驱动大量异步任务，效果类似 M:N，但以 crate 形式存在而非绑定进语言本身——用不到就零开销。异步编程是后续章节的主题。

## 使用 spawn 创建线程

调用 `thread::spawn` 并传入一个闭包，闭包里的代码就在新线程中运行：

```rust runnable
use std::thread;
use std::time::Duration;

fn main() {
    // 创建一个新线程
    thread::spawn(|| {
        for i in 1..=5 {
            println!("子线程：第 {} 次", i);
            thread::sleep(Duration::from_millis(1)); // 睡眠 1 毫秒，让出 CPU，给其他线程运行机会
        }
    });

    // 主线程自己也在运行
    for i in 1..=3 {
        println!("主线程：第 {} 次", i);
        thread::sleep(Duration::from_millis(1)); // 同上，制造交替执行的效果
    }
    // 主线程结束 → 整个程序结束，子线程可能还没跑完！
}
```

运行这段代码你会发现：**主线程一结束，子线程也被强制终止**，不管它有没有跑完。输出顺序也是不确定的，因为操作系统随时可能切换线程。

## join：等待子线程完成

`thread::spawn` 返回一个 `JoinHandle`。对它调用 `.join()` 会**阻塞当前线程**，直到对应的子线程结束：

```rust runnable
use std::thread;
use std::time::Duration;

fn main() {
    // 把 JoinHandle 保存下来
    let handle = thread::spawn(|| {
        for i in 1..=5 {
            println!("子线程：第 {} 次", i);
            thread::sleep(Duration::from_millis(1)); // 睡眠 1 毫秒，让出 CPU
        }
    });

    for i in 1..=3 {
        println!("主线程：第 {} 次", i);
        thread::sleep(Duration::from_millis(1)); // 同上
    }

    // 在这里等待子线程结束，再继续
    handle.join().unwrap();
    println!("所有线程都完成了！");
}
```

现在子线程的 5 次输出一定会全部打印出来。

> **join 放在哪里很重要**：如果在主线程的 `for` 循环之前就 `join`，那主线程会先等子线程跑完，再执行自己的循环——两者就不再并发了。

# move 闭包与所有权

## 为什么需要 move

子线程需要用到外部数据时，直接借用会有问题。来看一个例子：

```rust runnable expect-error
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    // 编译错误：闭包借用了 v，但 Rust 不知道这个线程会活多久
    let handle = thread::spawn(|| {
        println!("向量：{:?}", v);
    });

    // 如果这里 drop(v)，子线程就访问了悬空引用！
    handle.join().unwrap();
}
```

编译器会报错：闭包试图借用 `v`，但 Rust 无法保证主线程不会在子线程还在用 `v` 的时候把它丢弃。这是一个**合理的担忧**——比如主线程可以调用 `drop(v)` 后立刻结束，子线程就读到了悬空数据。

## 用 move 转移所有权

解决办法是在闭包前加 `move` 关键字，强制闭包**获取**它用到的所有值的所有权：

```rust runnable
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    // move 把 v 的所有权移入闭包，子线程独占 v
    let handle = thread::spawn(move || {
        println!("向量：{:?}", v);
    });

    // v 已经移走了，这里不能再用 v
    handle.join().unwrap();
}
```

加了 `move` 后，`v` 的所有权转移给了子线程的闭包。主线程再也无法访问 `v`，从根本上避免了悬空引用的可能。

## move 闭包的所有权效果

```rust runnable expect-error
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("{:?}", v); // v 已被 move 进来
    });

    drop(v); // 编译错误！v 已经移走了，这里无法使用

    handle.join().unwrap();
}
```

这正是 Rust 给我们的保护：`move` 之后，所有权规则确保主线程不可能再碰 `v`，消除了一类典型的并发 bug。

# 练习题

## 测验

```quiz single
Q: 调用 thread::spawn 后，如果不保存返回的 JoinHandle，会发生什么？
- 程序会报编译错误
- 子线程会立即终止
+ 子线程会运行，但主线程不会等它，主线程结束时子线程可能被强制终止
- 子线程会在后台永久运行，即使主线程已退出
E: JoinHandle 只是一个"凭证"，不保存它不会阻止子线程运行，但你就没有办法等待它完成了。主线程一退出，整个进程结束，所有子线程也随之终止。
```

```quiz single
Q: handle.join() 的作用是什么？
- 合并两个线程为一个
+ 阻塞当前线程，直到 handle 对应的线程结束
- 终止 handle 对应的线程
- 让 handle 对应的线程进入睡眠状态
E: join() 会让调用它的线程（通常是主线程）等在那里，直到目标线程执行完毕。这是确保子线程能跑完的最简单方式。
```

```rust
use std::thread;
fn main() {
    let msg = String::from("hello");
    thread::spawn(move || println!("{}", msg));
}
```

```quiz single
Q: 以上0代码，如果去掉 move 关键字会怎样？
- 正常编译，因为 println! 只需要引用
+ 编译错误，因为 Rust 无法保证引用在子线程整个生命周期内都有效
- 运行时 panic
- 编译警告，但能运行
E: Rust 的借用检查器知道子线程的生命周期可能比主线程更长（或主线程随时可以 drop 数据），所以不允许在子线程中借用主线程栈上的数据——除非明确用 move 转移所有权。
```

```quiz single
Q: 加了 move 之后，主线程还能访问被 move 进闭包的变量吗？
+ 不能，所有权已经转移给了闭包
- 可以，move 只是复制了一份
- 可以只读，不可写
- 取决于变量的类型
E: move 就是所有权转移，不是复制。转移之后原来的绑定失效，主线程试图访问就会得到编译错误。
```

```quiz single
Q: Rust 标准库的线程使用的是哪种模型？
- M:N 绿色线程
+ 1:1 操作系统线程
- 协程模型
- 事件循环模型
E: Rust 标准库选择 1:1 模型：每个 Rust 线程对应一个真实的操作系统线程。这保证了行为可预期，代价是线程创建和切换有一定开销。
```

```quiz single
Q: 下列关于 join() 放置位置的说法，哪个是正确的？
- join() 必须紧跟在 thread::spawn 后面
- join() 只能在程序末尾调用
+ join() 的位置决定了主线程何时开始等待，影响并发效果
- join() 可以在任意线程里调用，效果都一样
E: 把 join() 放在主线程循环之前，主线程会先等子线程跑完再执行循环，失去并发效果；放在循环之后，两者才能真正并发运行。
```

## 编程练习

下面的代码希望创建一个子线程打印 1 到 5，主线程打印 "A" 到 "C"，并且保证子线程一定能跑完。请补全 `TODO` 部分：

```rust editable
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..=5 {
            // TODO: 打印 "子线程: {i}"
        }
    });

    for c in ['A', 'B', 'C'] {
        println!("主线程: {c}");
    }

    // TODO: 等待子线程结束
}
```

```expected
主线程: A
主线程: B
主线程: C
子线程: 1
子线程: 2
子线程: 3
子线程: 4
子线程: 5
```
