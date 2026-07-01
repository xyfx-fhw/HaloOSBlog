---
title: "Send 与 Sync"
description: "理解 Send 和 Sync 这两个标记 trait，掌握 Rust 线程安全背后的底层逻辑。"
difficulty: intermediate
estimatedTime: 20
keywords: ["Send", "Sync", "标记trait", "线程安全", "Arc", "Rc"]
---

# 两个神奇的标记 Trait

前几节我们看到编译器拒绝了 `Rc<T>` 跨线程使用，接受了 `Arc<T>`。编译器是怎么知道谁能跨线程、谁不能的？答案就是两个内置于语言核心的标记 trait：`Send` 和 `Sync`。

它们定义在 `std::marker` 中，没有任何方法，只是一个「标签」——打上这个标签，就等于向编译器声明：「这个类型在多线程场景下是安全的。」

## 为什么需要标记 Trait

Rust 的所有权系统在单线程下已经能防止大量 bug。但多线程带来了新的问题：

- **数据竞争**：两个线程同时读写同一块内存，且至少有一个是写操作
- **悬空指针**：一个线程释放了数据，另一个线程还持有指向它的引用

`Send` 和 `Sync` 两个标记 trait，让编译器能在**编译期**就把这些问题拦截住。

# Send：可以跨线程转移所有权

## 什么是 Send

实现了 `Send` 的类型，其**所有权**可以安全地转移到另一个线程。

简单来说：如果你能把一个值 `move` 进 `thread::spawn` 的闭包，这个值就必须是 `Send` 的。

```rust runnable
use std::thread;

fn main() {
    let s = String::from("hello"); // String 实现了 Send

    let handle = thread::spawn(move || {
        // s 的所有权被 move 到了这个线程
        println!("{}", s);
    });

    handle.join().unwrap();
}
```

`String` 实现了 `Send`，所以可以安全地移入子线程。

## 哪些类型不是 Send

最典型的是 `Rc<T>`：

```rust runnable expect-error
use std::rc::Rc;
use std::thread;

fn main() {
    let rc = Rc::new(42);

    thread::spawn(move || {
        // 编译错误：Rc<i32> 没有实现 Send
        println!("{}", rc);
    });
}
```

为什么 `Rc<T>` 不是 `Send`？因为 `Rc` 的引用计数是普通整数操作，不是原子的。如果两个线程同时克隆同一个 `Rc`，会同时修改引用计数，导致计数错乱，引发内存安全问题。

`Arc<T>` 用原子操作来更新计数，所以是 `Send` 的。

## 自动推导规则

- 完全由 `Send` 类型组成的类型，自动是 `Send`
- 基本类型（`i32`、`bool`、`String` 等）几乎都是 `Send`
- 含有非 `Send` 类型字段的结构体，自动不是 `Send`

# Sync：可以被多线程共享引用

## 从 Send 到 Sync

`Send` 解决的是「**转移**所有权」的问题——值从一个线程移动到另一个线程。

但有时候我们不想转移，只想**共享**：主线程有一份数据，多个子线程都拿到它的引用，同时去读它。这就是 `Sync` 解决的问题。

> **定义**：如果类型 `T` 是 `Sync` 的，则 `&T`（对 T 的不可变引用）可以安全地同时存在于多个线程中。

换个更直观的说法：**多个线程同时读同一个值，不会出问题**，这个类型就是 `Sync`。

## 最简单的例子：只读共享

```rust runnable
use std::sync::Arc;
use std::thread;

fn main() {
    // Arc 让多个线程共享所有权，内部的 Vec 是 Sync 的（只读）
    let data = Arc::new(vec![1, 2, 3, 4, 5]);

    let mut handles = vec![];
    for i in 0..3 {
        let data = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            // 多个线程同时持有 &Vec<i32>，只读，完全安全
            println!("线程 {} 看到长度：{}", i, data.len());
        }));
    }

    for h in handles { h.join().unwrap(); }
}
```

`Vec<i32>` 是 `Sync` 的，因为多个线程同时**读**它不会产生任何问题——没有人在改它，不会有竞争。

## 为什么 RefCell\<T\> 不是 Sync

`RefCell<T>` 内部有一个**借用计数器**（一个整数），记录当前有几个活跃的借用。每次调用 `borrow()` 或 `borrow_mut()` 都要修改这个计数器。

问题在于：这个计数器的修改**不是原子的**。

想象两个线程同时对同一个 `RefCell` 调用 `borrow()`：
1. 线程 A 读到计数器是 0
2. 线程 B 读到计数器也是 0
3. 线程 A 把计数器写成 1（"我借用了"）
4. 线程 B 把计数器也写成 1（覆盖了 A 的写入！）

现在计数器是 1，但实际有两个活跃借用——借用规则被悄悄破坏了，后续可能出现两个可变借用同时存在的情况，导致数据竞争。

所以编译器禁止把 `RefCell` 的引用共享给多个线程：

```rust runnable expect-error
use std::cell::RefCell;
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(RefCell::new(0));
    let data2 = Arc::clone(&data);

    thread::spawn(move || {
        // 编译错误：RefCell<i32> 没有实现 Sync
        // Arc 内部的 &RefCell<i32> 不能安全地跨线程共享
        *data2.borrow_mut() += 1;
    });
}
```

## Mutex\<T\> 是 Sync 的原因

`Mutex<T>` 也保护内部数据，但它用**操作系统锁**来保证互斥，而不是一个普通整数计数器。任何线程想访问数据都必须先拿锁，拿不到就阻塞——不可能有两个线程同时进入临界区。

因此 `Mutex<T>` 的引用可以安全地在多个线程间共享，它是 `Sync` 的。

## Send 与 Sync 的关系

两者可以用一句话总结：

| Trait | 保证的事 | 典型场景 |
|-------|---------|---------|
| `Send` | **所有权**可以转移到另一个线程 | `move` 闭包 |
| `Sync` | **引用**可以同时存在于多个线程 | `Arc<T>` 包裹后共享 |

它们之间有一个数学关系：**如果 `&T` 是 `Send`，则 `T` 就是 `Sync`**。

理解这句话：`&T` 是 `Send` 意味着"这个引用可以安全地发送到另一个线程"，也就是说另一个线程拿着 `&T` 读数据不会出问题——这正好就是 `Sync` 的定义。

## 常见类型的 Send / Sync 一览

| 类型 | Send | Sync | 原因 |
|------|------|------|------|
| `i32`, `bool`, `String` | ✅ | ✅ | 基本类型，无共享状态 |
| `Rc<T>` | ❌ | ❌ | 引用计数非原子 |
| `Arc<T>` | ✅ | ✅ | 引用计数原子操作 |
| `Mutex<T>` | ✅ (T: Send) | ✅ | OS 锁保证互斥 |
| `RefCell<T>` | ✅ (T: Send) | ❌ | 借用检查非原子 |
| `*mut T`（裸指针） | ❌ | ❌ | 无安全保证 |

# 练习题

## 测验

```quiz single
Q: Send trait 的含义是什么？
- 类型可以发送网络消息
- 类型可以被复制到其他线程
+ 类型的所有权可以安全地转移到另一个线程
- 类型实现了序列化
E: Send 表示"所有权转移"是线程安全的。move 进 thread::spawn 闭包的值必须实现 Send。
```

```quiz single
Q: Sync trait 的含义是什么？
- 类型可以被多个线程同时修改
- 类型可以同步到磁盘
+ 类型的引用（&T）可以安全地在多个线程间共享
- 类型实现了同步原语
E: Sync 表示"共享引用"是线程安全的。如果 &T 是 Send，则 T 就是 Sync。多个线程持有同一个值的引用不会产生数据竞争。
```

```quiz single
Q: 为什么 Rc<T> 既不是 Send 也不是 Sync？
+ 因为 Rc 的引用计数操作不是原子的，多线程同时修改计数会导致内存安全问题
- 因为 Rc 只能存储不可变数据
- 因为 Rc 没有实现 Clone
- 因为 Rc 性能太差
E: 非原子的整数操作在多线程下会产生竞争：两个线程同时 clone Rc 会同时读-改-写同一个计数器，结果不可预期，可能导致提前释放或内存泄漏。
```

```quiz single
Q: RefCell<T> 是 Send 但不是 Sync，这意味着什么？
- 可以在多线程中共享引用，但不能 move 所有权
- 在多线程中完全可以使用
- 既不能 move 也不能共享引用
+ 可以把 RefCell 的所有权 move 进另一个线程（单独使用），但不能让多个线程同时持有它的引用
E: RefCell 的借用检查状态（运行时计数器）不是原子的，所以不能被多个线程同时访问（即不是 Sync）。但转移所有权给单个新线程是安全的（即是 Send）。
```

```quiz single
Q: 如果你定义了一个结构体 struct Wrapper(Rc<i32>)，它是 Send 吗？
- 取决于如何使用这个结构体
- 是的，因为 i32 是 Send
- 是的，因为结构体默认是 Send
+ 不是，因为含有非 Send 的字段（Rc<i32>），整个结构体自动变为非 Send
E: Send 的自动推导是保守的：只要有一个字段不是 Send，整个类型就不是 Send。这确保了安全性的传递性。
```

```quiz single
Q: 以下哪种组合在多线程中既能共享所有权又能安全修改数据？
+ Arc<Mutex<T>>
- Rc<RefCell<T>>
- Arc<RefCell<T>>
- Rc<Mutex<T>>
E: Arc 提供线程安全的多所有权（实现了 Send + Sync），Mutex 提供线程安全的互斥修改（实现了 Sync）。Rc 和 RefCell 都不是线程安全的。
```
