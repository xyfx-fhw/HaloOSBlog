---
title: "共享状态"
description: "学习用 Mutex<T> 保护共享数据，用 Arc<T> 跨线程共享所有权，理解两者组合的标准模式。"
difficulty: intermediate
estimatedTime: 30
keywords: ["Mutex", "Arc", "共享状态", "互斥锁", "原子引用计数", "线程安全"]
---

# Mutex\<T\>：互斥锁

通道是「通过通信共享数据」，本节介绍另一种思路：**让多个线程直接共享同一块数据，但每次只允许一个线程访问**。

这个机制叫**互斥锁**（Mutex，Mutual Exclusion）。你可以把它想象成公共厕所门上的锁：进去之前先锁门，出来后开锁，这样里面永远只有一个人。

## Mutex 的基本用法

```rust runnable
use std::sync::Mutex;

fn main() {
    // 把数据"装进" Mutex，外人无法直接访问
    let m = Mutex::new(5);

    {
        // lock() 获取锁，返回 MutexGuard 智能指针
        // 如果锁已被其他线程持有，当前线程会阻塞等待
        let mut num = m.lock().unwrap();
        *num = 6; // 通过 MutexGuard 修改内部数据
    } // 这里 num 离开作用域，MutexGuard 自动 drop，锁自动释放

    println!("m = {:?}", m);
}
```

关键点：
- **获取数据必须先拿锁**：`Mutex<T>` 把数据包裹起来，不 `lock()` 就无法访问 `T`
- **锁自动释放**：`MutexGuard` 是智能指针，离开作用域时 `Drop` 实现会自动释放锁，不需要手动解锁
- **中毒（Poisoning）**：如果持有锁的线程 panic 了，锁进入"中毒"状态。其他线程再调用 `lock()` 会得到 `Err`，调用 `.unwrap()` 就会 panic。

## 用 {} 手动控制持锁范围

`MutexGuard` 在离开**当前作用域**时才释放锁，所以用 `{}` 块包裹可以精确控制持锁时间：

```rust runnable
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(0);

    {
        let mut num = m.lock().unwrap();
        *num += 1;
    } // ← num 在这里 drop，锁立刻释放

    // 锁已释放，可以再次获取
    println!("m = {:?}", m);
}
```

> **经验法则**：只在真正需要修改数据的几行外套 `{}`，改完立刻释放。持锁时间越短，其他线程等待的时间就越短，并发效率越高。

## 单线程场景验证

先确保单线程里 Mutex 正常工作，再推进到多线程：

```rust runnable
use std::sync::Mutex;

fn main() {
    let scores = Mutex::new(vec![]);

    {
        let mut s = scores.lock().unwrap();
        s.push(10);
        s.push(20);
    } // 锁释放

    {
        let mut s = scores.lock().unwrap();
        s.push(30);
    } // 锁再次释放

    println!("{:?}", scores.lock().unwrap()); // [10, 20, 30]
}
```

# Arc\<T\>：线程安全的引用计数

## 为什么不能用 Rc\<T\>

你可能想到：多线程共享数据，上一章用 `Rc<T>` 实现了多所有权，直接用不就好了？

```rust runnable expect-error
use std::rc::Rc;
use std::sync::Mutex;
use std::thread;

fn main() {
    let counter = Rc::new(Mutex::new(0));

    let counter2 = Rc::clone(&counter);
    thread::spawn(move || {
        // 编译错误：Rc<T> 不实现 Send，不能发送到其他线程
        *counter2.lock().unwrap() += 1;
    });
}
```

编译器拒绝了：**`Rc<T>` 不是线程安全的**。原因在于 `Rc<T>` 的引用计数是普通整数操作，两个线程同时克隆时可能同时修改引用计数，导致计数混乱，最终引发内存安全问题。

## Arc\<T\>：原子引用计数

`Arc<T>`（Atomic Reference Counting）是 `Rc<T>` 的线程安全版本。它用**原子操作**来更新引用计数，保证计数的修改不会被打断：

```rust runnable
use std::sync::Arc;
use std::thread;

fn main() {
    let data = Arc::new(vec![1, 2, 3]);

    let data2 = Arc::clone(&data);
    let handle = thread::spawn(move || {
        // data2 现在属于子线程，和主线程的 data 共享同一份堆内存
        println!("子线程看到的数据：{:?}", data2);
    });

    handle.join().unwrap();
    println!("主线程看到的数据：{:?}", data);
    // 两个 Arc drop 后，堆内存才真正释放
}
```

> `Arc` 和 `Rc` 的 API 完全相同，只是多线程场景下换成 `Arc` 即可。代价是原子操作比普通整数操作稍慢，所以单线程仍然首选 `Rc`。

# Arc\<Mutex\<T\>\>：共享可变状态

## 组合两者

`Arc<T>` 解决了"多个线程都持有所有权"的问题，但 `Arc<T>` 本身是**不可变**的。要让多个线程共享**并修改**同一份数据，需要把 `Mutex<T>` 套在里面：`Arc<Mutex<T>>`。

- **`Arc`** 负责：让多个线程都能持有这份数据的所有权（引用计数）
- **`Mutex`** 负责：保证同一时刻只有一个线程在修改数据（加锁）

```rust runnable
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Arc<Mutex<i32>>：可以跨线程共享的可变计数器
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..5 {
        // Arc::clone 增加引用计数，每个线程都得到一份"门票"
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            // 每个线程轮流获取锁，修改数据
            let mut num = counter.lock().unwrap();
            *num += 1;
        }); // num 在这里 drop，锁自动释放
        handles.push(handle);
    }

    // 等待所有线程完成
    for handle in handles {
        handle.join().unwrap();
    }

    println!("最终计数：{}", *counter.lock().unwrap()); // 5
}
```

5 个线程各自加 1，最终结果一定是 5，不会出现数据竞争。

## 内部可变性的回顾

你会发现 `counter` 是不可变绑定，但我们却能修改它内部的值——这和 `RefCell<T>` 的道理一样，都是**内部可变性**。

| 组合 | 适用场景 |
|------|---------|
| `Rc<RefCell<T>>` | 单线程，需要多所有权 + 可变性 |
| `Arc<Mutex<T>>` | 多线程，需要多所有权 + 可变性 |

`Mutex<T>` 是多线程版的 `RefCell<T>`：区别在于 `RefCell<T>` 在运行时检查借用规则，而 `Mutex<T>` 通过操作系统级别的锁来保证互斥。

## 死锁：需要注意的风险

Rust 能防止数据竞争，但**无法防止死锁**。死锁发生在：线程 A 持有锁 1，等待锁 2；线程 B 持有锁 2，等待锁 1——两者互相等待，永远不会释放。

避免死锁的简单原则：
- 尽量缩短持有锁的时间（把锁的作用域写小）
- 多把锁时，所有线程按相同顺序获取

# 选哪个？决策指南

学完智能指针和并发这两章，你面前摆着一堆工具：`Box`、`Rc`、`Arc`、`RefCell`、`Mutex`……初学者最容易困惑的就是"我到底该用哪个"。这里给出一个清晰的决策思路。

## 第一步：是否需要多所有权？

**不需要**（一个值只有一个所有者）→ 直接用普通所有权或 `Box<T>`。

**需要**（多个地方都要"拥有"同一份数据）→ 继续往下看。

## 第二步：是否跨线程？

**单线程** → 用 `Rc<T>`（引用计数，轻量，不带线程安全开销）

**多线程** → 用 `Arc<T>`（原子引用计数，线程安全）

## 第三步：是否需要修改共享的数据？

只读共享：到上一步就够了，`Rc<T>` 或 `Arc<T>` 直接用。

需要修改：

| 场景 | 用法 |
|------|------|
| 单线程，多所有权 + 可变 | `Rc<RefCell<T>>` |
| 多线程，多所有权 + 可变 | `Arc<Mutex<T>>` |

## 完整速查表

| 需求 | 推荐工具 | 原因 |
|------|---------|------|
| 堆分配 / 递归类型 | `Box<T>` | 最简单的堆指针，单一所有权 |
| 单线程多所有权（只读） | `Rc<T>` | 引用计数，零线程开销 |
| 单线程多所有权（可变） | `Rc<RefCell<T>>` | RefCell 提供运行时借用检查 |
| 多线程多所有权（只读） | `Arc<T>` | 原子引用计数 |
| 多线程多所有权（可变） | `Arc<Mutex<T>>` | Mutex 保证互斥访问 |
| 多线程单向数据传递 | `mpsc::channel` | 所有权转移，天然安全 |

> **经验法则**：能用普通所有权就不用 `Rc`；能用 `Rc` 就不用 `Arc`；能用通道就不用 `Mutex`。越简单的工具，出错的可能性越小。

# 练习题

## 测验

```quiz single
Q: Mutex<T> 中，lock() 方法返回的是什么？
- &mut T（直接的可变引用）
- T 本身（移出 Mutex）
+ MutexGuard<T>（一个智能指针，离开作用域自动释放锁）
- Option<T>
E: MutexGuard 实现了 Deref 和 DerefMut，所以可以像引用一样使用；同时它实现了 Drop，确保离开作用域时锁自动释放，避免忘记解锁。
```

```quiz single
Q: 为什么不能在多线程中使用 Rc<T>？
- 因为 Rc 没有实现 Copy
+ 因为 Rc 的引用计数操作不是原子的，多线程同时修改会导致计数错误
- 因为 Rc 不支持克隆
- 因为 Rc 分配在栈上
E: 原子操作保证了"读-修改-写"不会被其他线程打断。Rc 的普通整数加减在多线程下可能同时发生，产生竞争，Arc 用原子指令解决了这个问题。
```

```quiz single
Q: Arc<Mutex<T>> 中，Arc 和 Mutex 各自负责什么？
+ Arc 负责让多个线程都能持有所有权，Mutex 负责保证同一时刻只有一个线程修改数据
- 两者功能重叠，只用 Arc 就够了
- Arc 负责栈内存，Mutex 负责堆内存
- Arc 负责加锁，Mutex 负责引用计数
E: 两者各司其职：Arc 解决"多所有权"问题，Mutex 解决"互斥访问"问题。缺少任何一个，要么无法跨线程传递，要么有数据竞争。
```

```quiz single
Q: 如果持有 Mutex 锁的线程 panic 了，其他线程调用 lock() 会发生什么？
+ 返回 Err（锁被"中毒"），调用 unwrap() 也会 panic
- 正常获取锁，继续运行
- 永久阻塞
- 自动重置锁，不受影响
E: 这叫锁中毒（Poisoning）。Rust 认为 panic 后数据可能处于不一致状态，所以让后续的 lock() 返回 Err 来提醒你。可以用 .unwrap_or_else(|e| e.into_inner()) 强制忽略中毒状态。
```

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let n = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    for _ in 0..3 {
        let n = Arc::clone(&n);
        handles.push(thread::spawn(move || {
            *n.lock().unwrap() += 10;
        }));
    }
    for h in handles { h.join().unwrap(); }
    println!("{}", *n.lock().unwrap());
}
```

```quiz single
Q: 上面的代码最终打印的结果是什么？
- 0
+ 30
- 不确定，可能是 0、10 或 30
- 10
E: 3 个线程各自加 10，Mutex 保证了每次加操作是串行的，不会丢失更新，所以最终结果一定是 30。
```

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let n = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    for i in 1..=3 {
        let n = Arc::clone(&n);
        handles.push(thread::spawn(move || {
            *n.lock().unwrap() = i * 10; // 赋值，不是累加
        }));
    }
    for h in handles { h.join().unwrap(); }
    println!("{}", *n.lock().unwrap());
}
```

```quiz single
Q: 把上面的 += 改成赋不同值（= i * 10），最终打印结果是？
- 一定是 30
+ 不确定，可能是 10、20 或 30，取决于哪个线程最后执行
- 一定是 10
- 编译错误
E: += 是累积操作，所有线程的贡献都叠加，顺序不影响最终和。= 赋不同值是"最后写赢"——Mutex 只保证同一时刻没有竞争，但不控制线程执行顺序，谁最后拿到锁谁决定最终值。
```

```quiz single
Q: Mutex<T> 和 RefCell<T> 最核心的区别是？
- Mutex 支持多所有权，RefCell 不支持
+ Mutex 使用操作系统锁实现线程安全的互斥，RefCell 只做运行时借用检查（非线程安全）
- RefCell 更快，Mutex 更慢，其余没有区别
- Mutex 在堆上分配，RefCell 在栈上
E: RefCell 的借用检查只在单线程运行时检查，不保证线程安全。Mutex 通过 OS 锁机制确保多线程下的互斥，代价是可能阻塞线程。
```
