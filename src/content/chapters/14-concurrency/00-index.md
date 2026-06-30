---
title: "并发编程"
description: "探索 Rust 的无畏并发：从多线程基础到消息传递与共享状态。"
difficulty: intermediate
estimatedTime: 60
keywords: ["并发", "多线程", "Arc", "Mutex", "Channels", "线程安全"]
---

Rust 的设计目标之一就是「无畏并发」（Fearless Concurrency）。通过所有权系统，Rust 在编译期就能消除绝大多数并发错误（如数据竞争）。

## 章节目录

1. **[使用线程](01-threads)** - 如何创建多线程及 `move` 闭包的使用。
2. **[消息传递 (Channels)](02-channels)** - 通过通道在线程间传递数据。
3. **[共享状态 (Arc & Mutex)](03-shared-state)** - 安全地在线程间共享和修改同一份数据。
4. **[Sync 与 Send Trait](04-sync-send)** - 揭秘 Rust 线程安全背后的底层标记 Trait。
