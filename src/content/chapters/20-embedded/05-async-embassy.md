---
title: "异步嵌入式：Embassy 框架"
description: "让嵌入式开发进入异步时代：学习如何使用 Embassy 构建低功耗、高性能的异步嵌入式应用。"
difficulty: advanced
estimatedTime: 20
keywords: ["Embassy", "async/await", "异步嵌入式", "执行器", "低功耗"]
---

# 异步嵌入式：Embassy 框架

在传统的嵌入式开发中，我们通常只有两种选择：
1. **前后台模式 (Superloop)**：一个 `loop` 跑到底，所有的等待（如等待串口数据）都是阻塞的。
2. **中断驱动**：通过大量复杂的中断回调来处理异步事件，代码很快就会变成难懂的「面条代码」。

**Embassy** (Embedded + Async) 的出现彻底改变了这一局面。它将 Rust 强大的 `async/await` 特性带入了嵌入式世界。

## 1. 为什么在嵌入式中使用异步？

### 极简的并发
假设你要同时闪烁两个 LED，频率不同。在 `async` 环境下，代码非常直观：

```rust
#[embassy_executor::task]
async fn blink_led(mut pin: Output<'static, AnyPin>, interval: Duration) {
    loop {
        pin.set_high();
        Timer::after(interval).await;
        pin.set_low();
        Timer::after(interval).await;
    }
}
```
你只需要开启两个 `task`，它们就会并发运行。不需要手写复杂的定时器状态机。

### 极致的低功耗
Embassy 的执行器（Executor）非常聪明。当所有异步任务都处于 `await`（挂起）状态时，它会自动让 CPU 进入 **低功耗睡眠模式**（如 ARM 的 WFI 指令）。只有当硬件中断发生时，处理器才会被唤醒。

## 2. Embassy 的核心组件

- **`embassy-executor`**：异步任务调度器。它负责轮询所有任务，且**不需要堆内存分配**。
- **`embassy-time`**：提供 `Timer`, `Instant`, `Duration` 等时间 API，支持毫秒甚至微秒精度。
- **`embassy-stm32` / `nrf` / `rp`**：针对特定芯片的 HAL 层。每个外设（如 UART, SPI）都提供了异步接口。

## 3. 一个典型的 Embassy 程序结构

```rust
use embassy_executor::Spawner;
use embassy_time::{Duration, Timer};
use {panic_halt as _, embassy_stm32 as _};

#[embassy_executor::main]
async fn main(spawner: Spawner) {
    // 初始化硬件
    let p = embassy_stm32::init(Default::default());

    // 派发一个后台任务
    spawner.spawn(my_task()).unwrap();

    loop {
        println!("主循环运行中...");
        Timer::after(Duration::from_secs(1)).await;
    }
}

#[embassy_executor::task]
async fn my_task() {
    loop {
        // 执行异步操作
        Timer::after(Duration::from_millis(500)).await;
    }
}
```

## 4. 异步 vs RTOS (实时操作系统)

Embassy 虽然提供了类似 RTOS 的便利（多任务、同步原语），但它有显著的优势：
- **更小的开销**：由于 `async` 基于编译器生成的协程，它不需要为每个任务分配独立的栈空间，内存消耗极低。
- **更强的类型检查**：异步接口能更好地感知「借用和所有权」，避免了 RTOS 中常见的共享资源竞争问题。

# 练习题

## 核心概念测验

```quiz single
Q: 在 Embassy 中，当没有任务需要处理时，CPU 通常会处于什么状态？
- 报错崩溃。
- 直接关机。
- 依然全速运行空的循环。
+ 进入硬件定义的低功耗睡眠模式（如 WFI）。
E: Embassy 的执行器集成了功率管理。如果没有任务就绪，它会自动调用处理器的低功耗指令，这使得异步 Rust 非常适合电池供电的项目。
```

```quiz single
Q: 相比于 FreeRTOS 等传统 RTOS，Embassy 的任务（Task）有什么显著的内存优势？
- 它们只能运行在 FLASH 中。
+ 它们共享一个栈，不需要为每个任务预留独立的栈空间（Stack）。
- 它们完全不占用内存。
- 它们由操作系统调度。
E: RTOS 的每个线程都需要几百字节到几 KB 的独立栈空间。而 Rust 的异步任务由编译器计算所需的最小状态机空间，极大地节省了 RAM。
```

```quiz multi
Q: Embassy 框架主要由哪些部分组成？
- 文件系统驱动 (embassy-fs)
+ 时间管理器 (embassy-time)
+ 硬件抽象层 (如 embassy-stm32)
+ 执行器 (embassy-executor)
E: Embassy 是专注于底层控制的框架，核心在于调度、时间和硬件适配。
```

```quiz single
Q: 在嵌入式 Rust 中，`#[embassy_executor::task]` 标记的函数通常返回什么？
- `()`
- `Result<(), Error>`
+ `async` 函数（即一个 Future）
- `!`
E: 虽然写法上看起来像普通函数，但它必须由 `async` 修饰，以便执行器能够在该任务等待硬件操作时将其挂起并切换到其他任务。
```

```quiz single
Q: 为什么在 Embassy 中可以使用 `println!` 等带有阻塞倾向的操作？
+ 实际开发中应尽量避免在主循环中做耗时的同步阻塞操作，应使用异步版本的 IO。
- 因为 Embassy 会自动将其转化为异步。
- 不可以，这会损坏芯片。
- 因为芯片速度太快，感知不到阻塞。
E: 异步系统的核心是「协作式」。如果你在一个任务中同步阻塞太久，整个系统的响应速度都会下降，因为它会阻止执行器去调度其他就绪的任务。
```
