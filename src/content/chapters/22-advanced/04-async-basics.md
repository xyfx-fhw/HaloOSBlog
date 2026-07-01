---
title: "异步编程基础"
description: "从阻塞 I/O 的痛点出发，理解 Future、async/await 的工作原理，迈入 Rust 异步编程的大门"
difficulty: advanced
estimatedTime: 40
keywords: ["async", "await", "Future", "tokio", "异步编程", "并发"]
---

# 为什么需要异步

## 从一个网络服务器说起

假设你在写一个简单的 Web 服务器，需要处理多个用户同时发来的请求：

```text
用户A：请求数据库 → 等待 50ms → 返回结果
用户B：请求数据库 → 等待 50ms → 返回结果
用户C：请求数据库 → 等待 50ms → 返回结果
```

如果用**单线程同步**处理，只能一个一个来：

```text
[等用户A的DB回复 50ms][等用户B的DB回复 50ms][等用户C的DB回复 50ms]
总耗时：150ms
```

等待数据库回复时，CPU 是完全空闲的。50ms 对 CPU 来说是漫长的虚度——现代 CPU 在 50ms 里可以执行几亿条指令。

## 多线程：好，但有代价

第一个想法是用多线程，每个请求一个线程：

```text
线程A：[等待50ms]
线程B：   [等待50ms]
线程C：      [等待50ms]
总耗时：~50ms（并行等待）
```

好多了！但线程有代价：

- **内存**：每个线程默认占用 2MB 栈内存。1000 个并发请求 = 2GB 内存
- **切换开销**：操作系统在线程间切换需要保存/恢复寄存器，每次切换耗时几微秒
- **实际上限**：一台普通服务器能稳定运行几千个线程，但很多场景需要万级别的并发

## 异步：等待时切换，不等着浪费

**异步编程**的核心思路是：**当一个任务在等待时，切换去执行另一个任务，而不是让线程傻傻地等着**。

```text
单线程异步：
任务A开始 → 发起DB请求 → 切换到B
任务B开始 → 发起DB请求 → 切换到C
任务C开始 → 发起DB请求 → DB结果回来
                         → 完成A → 完成B → 完成C
总耗时：~50ms（单线程处理3个请求）
```

这就像一个高效的餐厅服务员：不是为每位顾客派一个专属服务员（多线程），而是一个服务员在几桌之间来回——桌A在等菜时，去服务桌B，桌B在等菜时，去服务桌C。

## 什么时候用异步，什么时候用线程

| 场景 | 推荐方案 |
|------|----------|
| 大量 I/O 等待（网络、文件） | **异步**（async/await + tokio） |
| CPU 密集计算（加密、图像处理） | **多线程**（rayon 或 thread::spawn） |
| 简单脚本，不需要并发 | **同步**就好 |

# Future 与 async/await

## Future：对"未来结果"的承诺

Rust 异步编程的核心概念是 **`Future`**。

`Future` 就是一个**尚未完成的计算的描述**——不是"现在给你结果"，而是"我知道怎么得到结果，但可能要等一会儿"。

你可以把 `Future` 想象成外卖单：你下单（创建 Future），但外卖还没到（结果还没出来）。拿到外卖单本身并不会触发任何计算——只有当外卖员轮询"这单做好了吗？"时，才会推进进度。

`Future` trait 的核心定义（简化版）：

```rust
// 标准库里 Future trait 的核心（简化）
trait Future {
    type Output;  // 最终产出的值的类型

    fn poll(&mut self) -> Poll<Self::Output>;
    // Poll::Pending  → 还没好，等会儿再问
    // Poll::Ready(v) → 好了，结果是 v
}
```

**关键特性**：`Future` 是**惰性的**。创建一个 `Future` 不会让任何事情发生——必须有人（运行时）来"驱动"它（调用 `poll`），它才会推进。

## async/await：让你写出异步代码看起来像同步

直接操作 `Future` 和手动实现状态机非常繁琐。`async`/`await` 语法让这件事变简单：

- **`async fn`**：将一个函数标记为异步，函数体可以"暂停等待"
- **`.await`**：在异步函数内等待一个 `Future` 完成，等待期间可以切换去做别的

```rust
// async fn 的返回类型变成 impl Future<Output = i32>
async fn fetch_data() -> i32 {
    // 模拟异步等待
    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    //                                                       ^^^^^^
    // .await 在这里"暂停"这个函数，等待 sleep 完成
    // 暂停期间，运行时可以去执行别的任务
    42
}

async fn main_logic() {
    let result = fetch_data().await;
    // fetch_data() 返回一个 Future，.await 等它完成后才继续
    println!("结果：{}", result);
}
```

注意：**`async fn` 本身不会立即执行**——调用 `async fn` 只是创建了一个 `Future` 对象，需要被 `.await` 或交给运行时才会真正运行。

```rust
// 这两行代码没有任何区别——只是"描述了计算"，什么都没执行
let future1 = fetch_data();  // 没有 .await，什么都没发生
let future2 = fetch_data();  // 同上
```

## 运行时：谁来驱动 Future

`Future` 是惰性的，需要有人不断调用 `poll` 来推进它。这个"推进者"叫**异步运行时（async runtime）**。

Rust 标准库只定义了 `Future` trait，**没有内置运行时**。你需要选择一个：

| 运行时 | 特点 | 适用场景 |
|--------|------|----------|
| **tokio** | 最流行，功能全面，高性能 | Web 服务、网络应用（推荐） |
| **async-std** | 接口类似标准库，学习曲线低 | 入门项目 |
| **smol** | 轻量简洁 | 嵌入式或资源受限场景 |

用 tokio 的基本项目依赖配置（`Cargo.toml`）：

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

## 第一个真正的异步程序

用 `#[tokio::main]` 宏告诉编译器：用 tokio 运行时来执行这个 `async main`：

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    println!("开始");
    slow_greeting("Alice").await;
    slow_greeting("Bob").await;
    println!("结束");
}

async fn slow_greeting(name: &str) {
    sleep(Duration::from_millis(100)).await;
    println!("你好，{}！", name);
}
```

> **注意**：这段代码需要在有 tokio 依赖的项目中运行（Playground 环境不支持 tokio）。
> 你可以通过 `cargo new my-async-app` 新建项目后自行尝试。

## 并发执行：真正发挥异步的威力

上面的例子是**顺序**执行两个异步任务（先等 Alice，再等 Bob）。异步真正的威力在于**并发**：

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // tokio::join! 并发运行多个 Future，等所有都完成
    let (a, b) = tokio::join!(
        slow_greet("Alice"),
        slow_greet("Bob")
    );
    println!("{}", a);
    println!("{}", b);
    println!("两个任务并发完成！");
}

async fn slow_greet(name: &str) -> String {
    sleep(Duration::from_millis(100)).await;
    format!("你好，{}！", name)
}
// 总耗时约 100ms（而不是 200ms）
```

`tokio::spawn` 则用于"后台运行"——不等待它完成就继续：

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // spawn 把任务丢到后台，立即返回一个 JoinHandle
    let handle = tokio::spawn(async {
        sleep(Duration::from_millis(100)).await;
        println!("后台任务完成！");
        42  // 任务的返回值
    });

    println!("主任务继续运行...");

    // 等待后台任务完成，获取结果
    let result = handle.await.unwrap();
    println!("后台任务的结果：{}", result);
}
```

# 练习题

## 异步编程概念测验

```quiz single
Q: 调用一个 async fn（不加 .await）会发生什么？
- 函数立即开始执行，但不等待结果
- 函数在后台异步执行
- 编译错误，必须加 .await
+ 只是创建了一个 Future 对象，什么都没执行
E: async fn 是惰性的——调用它只是创建了一个描述"如何计算"的 Future 对象，实际代码一行都没运行。只有对这个 Future 调用 .await（或交给运行时）时，才会真正开始执行。
```

```quiz single
Q: 为什么 Rust 标准库不包含异步运行时，而是让用户选择 tokio / async-std 等？
- 运行时太复杂，标准库不接受复杂代码
- 因为运行时需要额外安装，不能内置
- 因为 Rust 团队还没有时间实现
+ 不同场景需要不同的运行时策略（如嵌入式场景需要 no_std，Web 需要高并发调度器），统一内置的运行时无法满足所有需求
E: Rust 的哲学是"机制与策略分离"：Future trait 是机制（由标准库定义），运行时是策略（由用户选择）。Web 服务器需要多线程高并发运行时（tokio），嵌入式设备可能需要单线程无堆运行时（embassy），让用户自己选择最合适的策略。
```

```quiz single
Q: .await 的行为是什么？
+ 如果 Future 还未完成，暂停当前异步任务，让运行时去执行其他任务；Future 完成时恢复执行
- 立即取消 Future
- 在新线程里运行 Future
- 阻塞当前线程，直到 Future 完成
E: .await 是非阻塞的——它不是"让线程等着"，而是"让这个异步任务暂停，去干别的"。线程还在运行，只是在处理其他就绪的任务。当被等待的 Future 完成后，运行时会恢复这个任务继续往下执行。
```

```quiz single
Q: async/await 最适合优化哪类程序的性能？
+ I/O 密集型程序（网络请求、文件读写、数据库查询）
- 所有程序都能得到同等优化
- CPU 密集型程序（大量计算、图像处理、加密）
- 内存密集型程序（大量内存分配）
E: async/await 的核心是"等待时切换，不浪费 CPU"。只有在等待外部资源（网络、磁盘、数据库）时，切换才有意义。CPU 密集型任务没有等待——CPU 一直在工作，切换反而有开销。CPU 密集任务用多线程（rayon），I/O 密集任务用异步。
```

```quiz multi
Q: 关于 tokio::join! 和 tokio::spawn，下列哪些说法是正确的？
+ tokio::spawn 将任务放到后台，当前代码不等待它完成立即继续
- tokio::join! 会在新线程中运行各个 Future
+ tokio::join! 并发运行多个 Future，等待全部完成后再继续
- tokio::spawn 和 std::thread::spawn 的功能完全等价
E: join! 是"并发等待"：在当前任务内并发推进多个 Future，全部完成才继续，不创建新线程。spawn 是"后台运行"：把任务提交给运行时，当前代码立即继续，通过 JoinHandle.await 取回结果。thread::spawn 创建真实的操作系统线程，tokio::spawn 创建的是轻量级的"绿色线程"（协程），代价小得多。
```
