---
title: "并发编程"
description: "探索 Rust 的无畏并发：从多线程基础到消息传递与共享状态。"
difficulty: beginner
estimatedTime: 5
keywords: ["并发", "多线程", "Arc", "Mutex", "Channels", "线程安全"]
---

Rust 的设计目标之一是「无畏并发」（Fearless Concurrency）——通过所有权系统，Rust 在**编译期**就能消除绝大多数并发错误（如数据竞争），而不是把问题留到运行时。

并发模型的核心选择只有两种：**消息传递**（线程之间发送数据，不共享内存）和**共享状态**（线程之间共享数据，用锁保护）。Rust 对这两种模式都提供了安全的实现，本章将分别讲解。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [多线程基础](./01-threads) | 创建线程、`join` 等待、`move` 闭包捕获环境 |
| [消息传递与 Channel](./02-channels) | 通过通道在线程间安全传递数据 |
| [共享状态：Arc 与 Mutex](./03-shared-state) | 多线程下安全共享和修改同一份数据 |
| [Sync 与 Send Trait](./04-sync-send) | 线程安全背后的底层标记 Trait，编译期线程安全保证的来源 |
