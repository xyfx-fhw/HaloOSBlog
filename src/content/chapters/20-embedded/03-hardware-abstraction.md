---
title: "硬件抽象：PAC 与 HAL"
description: "掌握 Rust 嵌入式开发的三层模型，学习如何通过类型安全的方法操作硬件外设和寄存器。"
difficulty: advanced
estimatedTime: 30
keywords: ["PAC", "HAL", "寄存器", "svd2rust", "类型状态模式"]
---

# 硬件抽象：如何与芯片交谈

在 C 语言中，操作硬件通常涉及到大量的宏（Macros）和指针强转（如 `*(uint32_t*)0x4001080C = 0x01`）。这种方式非常容易出错，且编译器无法提供任何保护。

Rust 的嵌入式生态采用了一套三层模型，将硬件操作逐步抽象：

## 1. 寄存器访问层（PAC）

**PAC (Peripheral Access Crate)** 是最底层的抽象。它通常由工具 **`svd2rust`** 直接从芯片厂商提供的 SVD 文件（XML 格式的描述文件）自动生成。

PAC 把内存地址变成了结构体。

### 传统的 C 风格操作：
```c
// 很容易写错地址或位偏移
RCC->APB2ENR |= (1 << 3);
```

### Rust PAC 风格操作：
```rust
// 类型安全的 API
dp.RCC.apb2enr.modify(|_, w| w.iopben().set_bit());
```
在 PAC 中，你依然是在操作寄存器，但 Rust 的闭包 API 确保了：
- **原子性**：`modify` 会处理读-写循环。
- **只读/只写保护**：你无法写入一个被标记为只读的寄存器。
- **字段校验**：无法设置非法的位组合。

## 2. 硬件抽象层（HAL）

**HAL (Hardware Abstraction Layer)** 在 PAC 之上提供了更高级、更符合人体工程学的 API。它不要求你记住寄存器名称，而是操作具体的业务逻辑（如「初始化串口」）。

```rust
// 使用 HAL 初始化 GPIO B 的第 12 号引脚为推挽输出
let gpiob = dp.GPIOB.split();
let mut led = gpiob.pb12.into_push_pull_output();

led.set_high(); // 点亮 LED
```

## 3. 核心机制：类型状态模式 (Typestate Pattern)

这是 Rust 嵌入式开发最神奇的地方。利用 Rust 的 **所有权机制**，我们可以将硬件的**状态**编码到类型中。

### 场景：配置一个引脚
一个 GPIO 引脚在同一时间只能是「输入」或「输出」，绝不能同时是两者。

```rust
let pin = gpioa.pa1.into_floating_input(); // 此时 pin 的类型是 Pin<Input<Floating>>
// pin.set_high(); // ❌ 编译报错！输入引脚没有 set_high 方法

let output_pin = pin.into_push_pull_output(); // 消耗原引脚，返回 Pin<Output<PushPull>>
output_pin.set_high(); // ✅ 正常工作
```

这意味着：**如果你错误地在代码里操作了状态不对的硬件，编译器会拒绝编译。** 这种「编译期拦截」极大地减少了硬件调试的压力。

## 4. 通用标准：Embedded-HAL

如果你写了一个 OLED 屏幕的驱动，你肯定希望它既能跑在 STM32 上，也能跑在 ESP32 上。

**`embedded-hal`** 定义了一套标准的 Trait（接口）：
- `OutputPin`（输出引脚）
- `SpiBus`（SPI 总线）
- `I2cAddress`（I2C 地址）

只要你的驱动程序要求接收一个「实现了 `OutputPin` 的类型」，那么它就可以在任何实现了该标准的硬件平台上复用。这促成了 Rust 嵌入式社区极其丰富的驱动库（Display, Sensor, Radio 等）。

# 练习题

## 核心概念测验

```quiz single
Q: 什么是 PAC (Peripheral Access Crate)?
+ 基于芯片寄存器映射自动生成的低层访问代码。
- 一个用于管理嵌入式包的工具。
- 一种新型的微控制器固件。
- 一个用于调试串口的软件。
E: PAC 是通过 svd2rust 工具解析 SVD 文件生成的，它将硬件寄存器地址映射为 Rust 的类型安全结构体。
```

```quiz single
Q: Rust 嵌入式开发中的「类型状态模式」如何防止硬件损坏？
- 它通过不断检测电压来防止短路。
- 它提供了一个硬件仿真器。
- 它自动配置所有的中断。
+ 它在编译阶段强制检查引脚状态，防止程序员对未配置的硬件调用非法方法。
E: 通过让不同的引脚状态（如输入、输出、串口模式）对应不同的 Rust 类型，可以确保只有处于正确状态的硬件才能调用对应的方法，从而在编译期排除潜在的逻辑错误。
```

```quiz multi
Q: 使用 HAL (Hardware Abstraction Layer) 相比直接操作 PAC 有哪些好处？
+ 提供了更直观、更接近应用逻辑的 API（如 `set_high`）。
- 运行速度快了 10 倍以上。
+ 利用所有权自动管理硬件外设的独占性。
+ 代码在同系列的不同芯片之间更具可移植性。
E: HAL 是更高一层的封装，它关注「功能」而非「寄存器细节」。虽然抽象通常会稍微增加代码量，但它显著提升了开发效率和安全性。其运行效率通常与直接操作寄存器持平。
```

```quiz single
Q: 为什么驱动程序的开发者应该依赖 `embedded-hal` 而不是特定的芯片库？
- 因为特定芯片库是不开源的。
+ 为了让驱动代码具备跨硬件平台的通用性。
- 因为 `embedded-hal` 运行更稳定。
- 因为 Rust 强制要求这么做。
E: `embedded-hal` 是一套接口标准。只要遵循该标准编写驱动，该驱动就能用于所有实现了这些接口的 MCU 平台。
```

```quiz single
Q: PAC 中修改寄存器的闭包参数 `|r, w| ...`，其中的 `w` 代表什么？
- width（位宽）。
- read（读取）。
+ write（写入）。
- wait（等待）。
E: 在 PAC 的 API 中，`r` 通常代表当前寄存器的值，而 `w` 提供了一系列用于修改各个位字段的方法。
```
