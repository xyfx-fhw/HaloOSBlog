---
title: "中断与并发安全"
description: "学习如何在没有操作系统的裸机环境下，利用 Rust 的所有权和 Critical Section 安全地处理硬件中断和数据共享。"
difficulty: advanced
estimatedTime: 30
keywords: ["中断", "ISR", "Mutex", "CriticalSection", "并发控制"]
---

# 中断与并发安全

在嵌入式开发中，**中断（Interrupt）** 是处理异步事件的核心机制。当按键被按下、串口接收到数据或定时器到时，硬件会自动「中断」主程序的执行，跳转去运行一段特定的代码：**中断服务程序（ISR, Interrupt Service Routine）**。

这引入了一个经典的并发难题：**如何在 `main` 循环和 `ISR` 之间安全地共享数据？**

## 1. 危险的全局变量

在 C 语言中，我们通常使用 `static volatile` 全局变量。但在 Rust 中，全局可变变量是 `static mut`，通过它修改数据是 **不可取且极度危险的**，因为 `main` 修改一半时，中断可能随时发生并试图再次修改，导致数据竞争。

## 2. 临界区（Critical Section）

解决共享数据最基础的方法是：**在操作共享变量时临时禁用所有中断**。这段被保护的代码块被称为「临界区」。

在 Rust 中，我们通常使用 `critical-section` crate。

```rust
use critical_section as cs;

cs::with(|cs_token| {
    // 这个闭包内的代码在运行期间，中断是禁用的
    // cs_token 是一个「令牌」，证明你已经安全地合上了锁
});
```

## 3. 裸机下的 Mutex 与 RefCell

为了在不引发数据竞争的前提下共享资源，Rust 嵌入式社区使用了一种特殊的 `Mutex`（互设锁）。

### 类型定义：
```rust
use core::cell::RefCell;
use critical_section::Mutex;

// 定义一个被锁保护的、可内部变更的全局变量
static SHARED_DATA: Mutex<RefCell<u32>> = Mutex::new(RefCell::new(0));
```

### 访问数据：
```rust
fn handle_interrupt() {
    // 1. 进入临界区（获取令牌）
    critical_section::with(|cs| {
        // 2. 借用互斥锁并传入令牌
        let mut data = SHARED_DATA.borrow(cs).borrow_mut();
        // 3. 安全地操作数据
        *data += 1;
    });
}
```

**为什么需要 `cs` 令牌？**
Rust 的嵌入式 `Mutex` 要求在调用 `borrow` 时必须传入一个 `CriticalSection` 令牌。由于获取令牌的唯一途径是调用 `cs::with`（这会禁用中断），这就保证了 **只要你在持有数据，中断就一定发不生**。

## 4. 原子操作（Atomic）

如果你只需要共享一个简单的数值（如标志位或计数器），使用原子类型（Atomics）是效率更高、成本更低的方案。由于硬件指令集支持原子读-改-写，这种操作本身就不受中断干扰，因此不需要进入临界区。

```rust
use core::sync::atomic::{AtomicBool, Ordering};

static IS_PRESSED: AtomicBool = AtomicBool::new(false);

fn main_loop() {
    if IS_PRESSED.load(Ordering::SeqCst) {
        // 处理按键逻辑
        IS_PRESSED.store(false, Ordering::SeqCst);
    }
}

// 中断函数
fn on_button_click() {
    IS_PRESSED.store(true, Ordering::SeqCst);
}
```

## 5. 独占外设：`Peripherals` 的单例性

Rust 嵌入式库通过 `take()` 方法确保硬件外设是**单例**的。

```rust
let dp = pac::Peripherals::take().unwrap();
```

如果你的程序中两个地方同时尝试 `take()`，第二次会返回 `None`。这在编译期（或运行期初始化时）就防止了两个不同的模块同时配置同一个定时器或串口。

# 练习题

## 核心概念测验

```quiz single
Q: 在 Rust 中处理嵌入式共享变量时，为什么不建议使用 `static mut`?
- 因为它的运行速度太慢。
- 因为它会消耗更多的电量。
+ 因为它容易导致数据竞争，且访问它必须包裹在 unsafe 块中，破坏了内存安全保证。
- 因为 Rust 编译器不支持全局变量。
E: `static mut` 没有任何并发保护。在主程序和中断服务程序同时访问时，可能导致数据不一致或崩溃。
```

```quiz single
Q: 裸机环境下的 `Mutex` 为什么要求传入一个 `CriticalSection` 令牌？
- 只是为了仪式感。
- 为了让代码更长。
+ 为了在语言层面强制要求：只有在「禁用中断」的环境下才允许访问共享数据。
- 为了启用硬件加密。
E: 这是一个巧妙的类型安全设计。没有令牌你就无法解开 Mutex 锁，而获得令牌的唯一合法途径是禁用中断，从而在原理上消除了数据竞争。
```

```quiz multi
Q: 关于原子操作 (Atomics) 的描述，哪项是正确的？
+ 它是零成本的，不需要禁用中断。
- 它只能用于大型结构体。
+ 它依赖处理器的特殊指令来保证操作的不可分割性。
+ 它是处理标志位（Flag）的最优选。
E: 原子操作直接利用硬件特性保证安全，不需要锁定总线或禁用中断，因此性能极高。
```

```quiz single
Q: `critical_section::with(|cs| { ... })` 块中，代码执行的特点是什么？
- 代码会并行运行。
- 代码会运行在 GPU 上。
+ 在此期间，硬件中断被暂时禁用，确保了执行过程不被打断。
- 它会自动把 Rust 代码转换成汇编。
E: 这就是所谓的「临界区」，它通过硬件手段（如修改微控制器的 PRIMASK 寄存器）保证了代码的独占执行。
```

```quiz single
Q: 如果两个不同的中断几乎同时发生，会发生什么？
- 处理器会爆炸。
- Rust 会报错。
+ 处理器会根据中断优先级（Priority）决定先执行哪一个。
- 两个中断会同时运行。
E: 嵌入式并发本质上是在单核上的切换。优先级系统决定了执行顺序，而我们要做的就是确保在切换发生时数据依然安全。
```
