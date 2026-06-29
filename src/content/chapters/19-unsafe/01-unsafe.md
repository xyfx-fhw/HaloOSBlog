---
title: "unsafe 块与超能力"
description: "理解 unsafe 块的作用范围、Rust 的五大 unsafe 超能力，以及何时才真正需要 unsafe"
difficulty: advanced
estimatedTime: 35
keywords: ["unsafe", "超能力", "裸指针", "mutable static", "FFI", "不安全代码"]
---

# 为什么需要 unsafe

Rust 的安全保证来自编译器——借用检查器、类型系统、生命周期检查，它们在编译期拦截了绝大多数内存错误。但这套系统并非万能：有时候你写的代码**确实是安全的**，编译器却因为信息不足而无法证明。

典型场景：
- 调用 C 语言函数——编译器不了解 C 的内存契约
- 直接操作硬件寄存器——访问地址由硬件手册决定，而非 Rust 类型系统
- 实现 `Vec`、`Arc` 这样的底层数据结构——需要手动管理内存布局

为了支持这些场景，Rust 提供了 `unsafe` 关键字，让你对编译器说："这里我比你更了解情况，放行。"

## unsafe 块做了什么（和你以为的不一样）

**常见误解**：`unsafe {}` 会关闭借用检查器。

**实际上**：`unsafe` 块**不会**禁用任何安全检查。借用规则、生命周期、类型检查在 `unsafe` 块里一样全力运行。`unsafe` 只是**解锁了五种额外操作**，在普通代码里这五种操作是被禁止的。

```rust runnable
fn main() {
    let mut x = 5;

    unsafe {
        // 在 unsafe 块里，借用检查器仍然工作
        let r1 = &x;
        let r2 = &x;
        println!("{} {}", r1, r2); // 正常：两个不可变借用

        // 下面这行在 unsafe 里也会编译失败：
        // let r3 = &mut x; // 错误：不可变借用仍然活跃
        let _ = r1;
    }

    // unsafe 块唯一做的事：允许解引用裸指针
    let raw = &mut x as *mut i32;
    unsafe {
        *raw += 1; // 只有这步需要 unsafe
    }
    println!("x = {}", x); // 6
}
```

> **关键心智模型**：`unsafe` 是你对编译器做出的**承诺**——"我检查过了，这里的内存操作是安全的"。责任从编译器转移到了你。

## 五大 unsafe 超能力

只有以下五种操作需要 `unsafe` 块或 `unsafe` 标注，其他的什么都不需要：

| 操作 | 为何危险 |
|------|--------|
| 解引用裸指针 `*const T` / `*mut T` | 指针可能为空、已释放或未对齐 |
| 调用 `unsafe` 函数或方法 | 函数要求调用者满足特定前提条件 |
| 读写可变静态变量 `static mut` | 多线程下存在数据竞争风险 |
| 实现 `unsafe trait` | trait 要求实现者保证某些编译器无法验证的契约 |
| 访问 `union` 的字段 | union 的内存解释完全由你负责 |

# 五大超能力详解

## 超能力一：解引用裸指针

**为什么编译器不允许？**

Rust 的引用（`&T` / `&mut T`）有严格的编译期保证：总是有效、非 null、已对齐、有正确的生命周期。裸指针（`*const T` / `*mut T`）没有任何这些保证——它可能是 null、指向已释放的内存、指向未初始化的数据，或者根本没有对齐。编译器无法检查，所以默认禁止。

**什么时候真正需要它？**

- 调用 C 函数：C 的 API 返回裸指针，你必须解引用才能读数据
- 构建双向链表、自引用结构——这些结构用安全引用无法表达
- 在手动分配的内存上读写数据（如实现自己的 `Vec` 或内存池）

**你需要保证什么：** 解引用时，指针非 null、指向已初始化的有效内存、内存对齐满足 `T` 的要求、且指向的数据在整个使用期间不会被释放。

```rust runnable
fn main() {
    let x = 42i32;

    // 创建裸指针不需要 unsafe——只是记录了一个地址
    let ptr: *const i32 = &x as *const i32;

    // 解引用需要 unsafe，因为编译器无法保证 ptr 有效
    // 但我们知道它有效：ptr 来自合法引用，x 还活着
    unsafe {
        println!("通过裸指针读取: {}", *ptr);
    }

    // 演示危险：null 指针解引用 = 程序崩溃
    let null_ptr: *const i32 = std::ptr::null();
    println!("null 指针是否为 null: {}", null_ptr.is_null());
    // unsafe { println!("{}", *null_ptr); } // 千万别这样做，直接 crash
}
```

> 一句话记忆：**创建裸指针安全，解引用裸指针危险**。

## 超能力二：调用 unsafe 函数

**为什么编译器不允许？**

有些函数的正确性依赖于调用者必须满足的前提条件，但这些条件无法用类型系统表达，编译器检查不了。例如：

- `std::str::from_utf8_unchecked(bytes)` — 要求字节序列是合法的 UTF-8，否则字符串乱码或 panic
- `Vec::set_len(new_len)` — 要求 `new_len` 不超过容量且新范围内的元素已初始化，否则访问未初始化内存
- `slice::get_unchecked(idx)` — 要求 `idx` 在范围内，否则越界读

这类函数把安全责任明确转移给调用者，用 `unsafe fn` 标注是一种警告：**"调用我之前，你必须自己检查。"**

**什么时候真正需要它？**

- 性能敏感路径，已经在外部验证了条件，不想再做重复的边界检查
- FFI：所有 `extern "C"` 函数都是隐式 `unsafe fn`
- 标准库底层实现内部

**你需要保证什么：** 该函数的 `# Safety` 文档里写了什么，你就保证什么。没有 `# Safety` 文档的 `unsafe fn` 是写得不够好的代码。

```rust runnable
fn main() {
    let bytes = vec![104u8, 101, 108, 108, 111]; // "hello" 的 UTF-8

    // 安全版本：会验证 UTF-8，返回 Result
    let s_safe = std::str::from_utf8(&bytes).unwrap();
    println!("安全版本: {}", s_safe);

    // 不安全版本：跳过验证，直接转换
    // 我们保证了 bytes 确实是合法的 UTF-8
    let s_fast = unsafe { std::str::from_utf8_unchecked(&bytes) };
    println!("不安全版本: {}", s_fast);

    // 如果传入非法 UTF-8，from_utf8_unchecked 会产生未定义行为
    // 这正是它需要 unsafe 的原因
}
```

> 注意：所有通过 `extern "C"` 声明的 C 函数都属于这一类——Rust 编译器看不到 C 的实现，无法验证安全性，所以调用 C 函数也需要 `unsafe` 块。

## 超能力三：读写可变静态变量

**为什么编译器不允许？**

不可变静态变量（`static FOO: i32 = 0`）是安全的，因为只读不存在竞争。可变静态变量（`static mut`）是全局共享的可变状态——如果两个线程同时读写同一个全局变量，就会产生**数据竞争**（data race），这是未定义行为。

编译器无法知道你的程序在哪里会产生多线程访问，所以对所有 `static mut` 的读写都要求 `unsafe`，把"我保证不会有并发访问"这个责任交给你。

**什么时候真正需要它？**

- 嵌入式系统：中断处理程序和主循环共享的硬件寄存器状态
- 单线程小程序里的简单全局计数器
- 与 C 代码共享全局变量（C 常用全局状态）

**你需要保证什么：** 要么程序是单线程的；要么对这个变量的所有访问都通过互斥锁（`Mutex`）或原子操作保护。

```rust runnable
static mut REQUEST_COUNT: u64 = 0;

// 假设这个函数只会在单线程中被调用
fn handle_request() {
    unsafe {
        REQUEST_COUNT += 1;
    }
    // 处理请求逻辑...
}

fn main() {
    handle_request();
    handle_request();
    handle_request();

    unsafe {
        println!("处理了 {} 个请求", REQUEST_COUNT); // 3
    }
}
```

> **生产代码的替代方案**：用 `std::sync::atomic::AtomicU64` 代替 `static mut u64`，用 `Mutex<T>` 代替 `static mut T`。它们的读写不需要 `unsafe`，且天然线程安全。

## 超能力四：实现 unsafe trait

**为什么编译器不允许？**

有些 trait 的正确实现需要满足特定的安全契约，但编译器无法自动验证这些契约。最典型的是：

- `Send`：类型可以安全地移动到另一个线程。编译器可以自动检查"所有字段是否都是 `Send`"，但无法检查"裸指针指向的内存是否有正确的线程所有权"
- `Sync`：类型可以安全地被多个线程通过共享引用访问

当你的类型包含裸指针时，编译器拒绝自动推导这两个 trait——因为它不知道你的指针管理是否正确。

**什么时候真正需要它？**

- 你封装了一个裸指针，但保证了通过额外的同步机制（锁、原子操作）使其线程安全
- 你在嵌入式环境中实现自定义的同步原语
- 你编写了一个 C 库的 Rust 封装，需要告诉 Rust 这个类型可以跨线程使用

**你需要保证什么：** 对于 `Send`，保证值移动到另一个线程后，没有其他线程还持有对它内部数据的引用；对于 `Sync`，保证多个线程同时持有 `&T` 不会产生数据竞争。

```rust runnable
use std::sync::Mutex;

// 包含裸指针的类型，编译器不会自动实现 Send
struct SharedBuffer {
    ptr: *mut u8,
    len: usize,
}

// 我们的保证：所有对 ptr 的访问都通过外部 Mutex 保护
// 因此多线程下是安全的
unsafe impl Send for SharedBuffer {}
unsafe impl Sync for SharedBuffer {}

impl SharedBuffer {
    fn new(size: usize) -> Self {
        let layout = std::alloc::Layout::array::<u8>(size).unwrap();
        let ptr = unsafe { std::alloc::alloc_zeroed(layout) };
        SharedBuffer { ptr, len: size }
    }
}

impl Drop for SharedBuffer {
    fn drop(&mut self) {
        let layout = std::alloc::Layout::array::<u8>(self.len).unwrap();
        unsafe { std::alloc::dealloc(self.ptr, layout); }
    }
}

fn main() {
    let buf = Mutex::new(SharedBuffer::new(1024));
    let guard = buf.lock().unwrap();
    println!("分配了 {} 字节的共享缓冲区", guard.len);
}
```

> 写 `unsafe impl Send for T {}` 不会让 T 自动变得线程安全——它只是让编译器停止报错。**你的实现必须真的是安全的**，否则多线程下数据竞争依然存在。

## 超能力五：访问 union 字段

**为什么编译器不允许？**

`union` 的所有字段共享同一块内存。当你写入 `u.i = 42`，之后读 `u.f`，得到的是把 `42i32` 的内存字节解释为 `f32` 的结果——这可能是一个无意义的浮点数，也可能引发更严重的问题（如把整数当指针解引用）。编译器不会跟踪"当前这个 union 里存的是哪个类型"，所以读取任何字段都需要你承诺"我知道现在存的是这个类型"。

**什么时候真正需要它？**

- FFI：C 语言大量使用 union（如 `sockaddr` 网络地址结构、`ioctl` 参数）
- 位操作技巧：把 `f32` 的内存位直接当 `u32` 读（fast inverse square root 算法就用了这个）
- 手动实现带标签的 union（不过 Rust 的 `enum` 在大多数场合更好）

**你需要保证什么：** 读取某个字段时，union 中存储的确实是该字段的有效值，且该值满足该类型的有效性约束（如引用类型的字段不能是无效地址）。

```rust runnable
union FloatBits {
    f: f32,
    bits: u32,
}

fn float_to_bits(val: f32) -> u32 {
    let u = FloatBits { f: val };
    unsafe { u.bits }
}

fn main() {
    // 利用 union 查看浮点数的内部二进制表示
    println!("1.0 的位表示: {:#010x}", float_to_bits(1.0));   // 0x3f800000
    println!("0.5 的位表示: {:#010x}", float_to_bits(0.5));   // 0x3f000000
    println!("-1.0 的位表示: {:#010x}", float_to_bits(-1.0)); // 0xbf800000

    // 演示危险：写入 i，读取 f
    let u = FloatBits { bits: 0x40000000 }; // 2.0f32 的位表示
    unsafe {
        println!("bits=0x40000000 解释为 f32: {}", u.f); // 2.0
    }
}
```

> **与 enum 的对比**：Rust 的 `enum` 是"有标签的 union"——编译器自动跟踪当前存的是哪个变体，读取时通过 `match` 确保类型正确。没有特殊需求（FFI、位操作）时，优先用 `enum` 而非 `union`。

# 练习题

## unsafe 基础测验

```quiz single
Q: unsafe 块会关闭 Rust 的借用检查器吗？
- 会，unsafe 块内可以同时拥有多个可变引用
+ 不会，借用检查器在 unsafe 块内照常工作，只是额外解锁了 5 种操作
- 会，但只关闭生命周期检查
- 取决于编译器优化级别
E: unsafe 块不禁用任何安全检查。借用规则、生命周期、类型检查全部保持有效。unsafe 唯一做的是允许执行五种平时被禁止的操作：解引用裸指针、调用 unsafe 函数、访问可变静态变量、实现 unsafe trait、访问 union 字段。
```

```quiz multi
Q: 以下哪些操作必须在 unsafe 块或 unsafe 函数中才能执行？
+ 解引用 *const i32 类型的裸指针
+ 调用标注了 unsafe fn 的函数
+ 修改 static mut 全局变量
- 创建 *const i32 类型的裸指针（不解引用）
- 调用普通的 C 标准库函数（通过 extern "C" 声明后）
E: 创建裸指针本身是安全的，只有解引用才需要 unsafe。通过 extern "C" 声明的外部函数调用也需要 unsafe（因为 Rust 无法验证 C 代码的安全性）——第五个选项的说法"普通调用"是混淆项，extern 函数调用同样需要 unsafe 块。
```

```rust
static mut TOTAL: i32 = 0;

fn add(n: i32) {
    TOTAL += n;
}
```

```quiz single
Q: 上面的代码能编译通过吗？
+ 不能，修改 static mut 变量必须在 unsafe 块内
- 能，这是普通的全局变量修改
- 能，但运行时会 panic
- 不能，static 变量不能被修改
E: static mut 是可变的全局静态变量，读写它都需要 unsafe 块，因为在多线程环境下存在数据竞争的潜在风险。正确写法是在 add 函数体里加 unsafe { TOTAL += n; }，或者改用线程安全的 Mutex<i32>。
```

```quiz single
Q: 关于 unsafe fn，以下说法哪个正确？
- unsafe fn 内部可以不遵守借用规则
+ unsafe fn 要求调用者满足函数注释中说明的安全前提条件
- unsafe fn 等价于 C 语言中的函数
- 只有涉及裸指针的函数才需要标注 unsafe fn
E: unsafe fn 是一种契约：函数作者在文档（通常是 # Safety 注释）中说明调用者必须保证的条件，编译器无法自动验证这些条件。标注 unsafe fn 不只用于裸指针，任何具有无法静态验证的安全前提的函数都应该标注。
```

```quiz single
Q: 以下哪个操作不需要 unsafe？
- 解引用 *mut u8 类型的裸指针
- 调用 extern "C" 声明的 C 函数
+ 把引用转换为裸指针（不解引用）
- 实现 Send trait（当编译器未自动实现时）
E: 把引用转换为裸指针（如 &x as *const i32）是安全操作——只是记录了一个内存地址，没有做任何危险的内存访问。真正危险的是解引用，那才需要 unsafe。
```

## 编程练习

下面的代码尝试通过裸指针交换两个变量的值，但缺少必要的 `unsafe` 标注，请修复它：

```rust editable
fn swap_via_ptr(a: &mut i32, b: &mut i32) {
    let pa: *mut i32 = a as *mut i32;
    let pb: *mut i32 = b as *mut i32;
    let tmp = *pa;   // 需要 unsafe
    *pa = *pb;       // 需要 unsafe
    *pb = tmp;       // 需要 unsafe
}

fn main() {
    let mut x = 10;
    let mut y = 20;
    swap_via_ptr(&mut x, &mut y);
    println!("x={}, y={}", x, y);
}
```

```expected
x=20, y=10
```
