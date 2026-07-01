---
title: "消息传递"
description: "学习用 mpsc 通道在线程间传递数据，理解所有权如何让消息传递天然安全。"
difficulty: intermediate
estimatedTime: 20
keywords: ["通道", "mpsc", "消息传递", "发送者", "接收者", "并发"]
---

# 通道：线程间的单行道

Go 语言有一句著名的口号："**不要通过共享内存来通信，而要通过通信来共享内存。**"

这句话描述了一种并发思路：与其让多个线程同时读写同一块内存（复杂、危险），不如给每个线程一个"收件箱"，线程之间传递消息，接收方从自己的收件箱里取数据。

Rust 标准库提供了**通道**（channel）来实现这个模式。

## 什么是 mpsc 通道

`std::sync::mpsc` 里的 `mpsc` 是 **Multiple Producer, Single Consumer** 的缩写——**多个发送者、一个接收者**。

可以把通道想象成一条传送带：
- **发送端**（`Sender<T>`）：往传送带上放东西
- **接收端**（`Receiver<T>`）：从传送带末端取东西
- 传送带只有一个出口，但入口可以有多个（克隆发送端）

```rust runnable
use std::sync::mpsc;
use std::thread;

fn main() {
    // channel() 返回 (发送端, 接收端) 的元组
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        // 把 tx 移入子线程，发送一条消息
        tx.send(String::from("你好，主线程！")).unwrap();
    });

    // recv() 会阻塞，直到有消息到来
    let msg = rx.recv().unwrap();
    println!("收到：{}", msg);
}
```

## 发送与接收

接收端有两个方法：

| 方法 | 行为 |
|------|------|
| `rx.recv()` | **阻塞**等待，有消息则返回 `Ok(T)`，通道关闭则返回 `Err` |
| `rx.try_recv()` | **立即返回**，有消息返回 `Ok(T)`，暂无消息返回 `Err`（不阻塞） |

当发送端被丢弃（所有 `tx` 都 drop 了），通道关闭，`recv()` 会返回 `Err`。

## 所有权与消息传递

通道传值会**转移所有权**，这是 Rust 并发安全的关键之一：

```rust runnable expect-error
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hello");
        tx.send(val).unwrap();
        // 编译错误：val 的所有权已经转移给通道了，这里不能再用
        println!("val = {}", val);
    });

    println!("收到：{}", rx.recv().unwrap());
}
```

`send(val)` 的签名是 `fn send(&self, t: T) -> Result<...>`，它会**消耗** `val`。这防止了"已发送的数据还被发送方修改"这类竞争 bug。

# 发送多条消息

## 把接收端当迭代器

实际场景里子线程往往需要发送多条消息。可以把 `rx` 当作迭代器来遍历，通道关闭后迭代自动结束：

```rust runnable
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let items = vec!["苹果", "香蕉", "橙子", "葡萄"];
        for item in items {
            tx.send(item).unwrap();
            thread::sleep(Duration::from_millis(100));
        }
        // tx 在这里 drop，通道关闭，rx 的迭代随之结束
    });

    // for received in rx 会阻塞等待，直到通道关闭
    for received in rx {
        println!("收到：{}", received);
    }

    println!("所有消息接收完毕");
}
```

## 多生产者：克隆发送端

`mpsc` 的 **M**（Multiple Producer）体现在：你可以克隆发送端，让多个线程各自往同一个通道里发消息：

```rust runnable
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    // 克隆一份发送端给第二个线程
    let tx2 = tx.clone();

    thread::spawn(move || {
        tx.send("来自线程 1 的消息").unwrap();
    });

    thread::spawn(move || {
        tx2.send("来自线程 2 的消息").unwrap();
    });

    // 接收两条消息（顺序不确定）
    for _ in 0..2 {
        println!("{}", rx.recv().unwrap());
    }
}
```

两个线程各自拥有一个发送端，谁先发到就先收到谁的。接收端仍然只有一个。

# 练习题

## 测验

```quiz single
Q: mpsc 是什么意思？
- Multi-thread Parallel Safety Channel
- Multiple Process, Single Channel
- Message Passing Standard Channel
+ Multiple Producer, Single Consumer
E: mpsc = Multiple Producer, Single Consumer，即多个发送端、单个接收端。这是 Rust 标准库通道的设计。
```

```quiz single
Q: 以下关于 send(val) 的说法，哪个正确？
- send 返回 val 的一个克隆
+ send 会消耗 val 的所有权，之后 val 不可再用
- send 只发送引用，val 仍归发送方所有
- send 会复制 val，原变量仍然有效
E: send 的参数是 T（不是引用），调用后所有权转移给通道，这防止了发送方在发送后继续修改数据，消除了数据竞争的可能。
```

```quiz single
Q: recv() 和 try_recv() 的主要区别是什么？
+ recv 会阻塞等待消息，try_recv 立即返回（无消息则返回 Err）
- 两者完全相同，只是名字不同
- recv 只能接收一条消息，try_recv 可以接收多条
- recv 是异步的，try_recv 是同步的
E: recv() 阻塞当前线程直到有消息；try_recv() 立即返回，如果通道里没有消息就返回 Err，适合在等待消息的同时还要做其他事情的场景。
```

```quiz single
Q: 当所有发送端都被丢弃后，接收端的 recv() 会？
+ 返回 Err，表示通道已关闭
- 返回 Ok(None)
- 永久阻塞
- panic
E: 所有 Sender 都 drop 了，说明不会再有新消息了。此时 recv() 返回 Err，for received in rx 的迭代也会自然结束。
```

```quiz single
Q: 如果想让 3 个线程都往同一个通道发消息，应该怎么做？
+ 克隆发送端两次，每个线程持有一个克隆
- 用 Arc<Sender<T>> 包装发送端
- 创建 3 个独立的通道
- 不可能实现，mpsc 只支持一个发送者
E: tx.clone() 可以创建多个发送端，每个线程 move 进去一个即可。这就是 mpsc 中 "Multiple Producer" 的含义。
```

```quiz single
Q: 把 rx 用于 for 循环（for msg in rx）时，循环何时结束？
- 接收到 10 条消息后
+ 通道关闭时（所有发送端都被 drop）
- 程序退出时
- 手动调用 break 时
E: Receiver<T> 实现了 Iterator，当通道关闭（即所有 Sender 都 drop 了）时，迭代器返回 None，for 循环自然结束。
```
