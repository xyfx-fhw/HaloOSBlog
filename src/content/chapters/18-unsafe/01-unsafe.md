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

> **既然有 `Mutex`，为何不直接用 `static Mutex<T>` 代替 `static mut`？**
>
> 对于普通应用代码，这**完全可以**，也是推荐做法——`static Mutex<T>` 不需要 `unsafe`，且天然线程安全。但 `static mut` 在某些场景下不可替代：
>
> - **嵌入式 / `no_std` 环境**：没有操作系统，标准库的 `Mutex` 依赖 OS 的阻塞原语，根本无法使用
> - **FFI / 与 C 交互**：C 代码不认识 Rust 的 `Mutex`，共享全局状态只能用裸变量
> - **极致性能路径**：已在外部保证了单线程访问，不想引入任何加锁开销
>
> 所以 `static mut` 主要留给系统级、嵌入式和 FFI 场景；普通代码尽量用 `static Mutex<T>` 或 `static AtomicXxx`。

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

**什么是 unsafe trait？**

普通的 trait 只是一组方法签名，编译器可以验证你的实现类型是否匹配。但有些 trait 还附带一条**编译器无法验证的安全承诺**——这样的 trait 就标注为 `unsafe trait`，实现它时必须写 `unsafe impl`，意思是："我承诺满足了那条隐性规则。"

用一个具体例子来建立直觉。先想想这个问题：如果你要把一块内存里的所有字节都设为 `0`，然后把它当作某个类型的值来用，这安全吗？

答案是：**看类型**。

- `u32`：4 个字节全零 = 数字 `0`，完全合法
- `bool`：只允许 `0`（false）或 `1`（true），全零是 `0`，合法
- `&str`：是一个指针，全零 = null 指针，**Rust 的引用不允许为 null，立刻未定义行为**

编译器知道每种类型占多少字节，但它**不知道哪些字节模式对这个类型是合法值**——这是语义层面的规则，只有程序员才清楚。

这就是 `unsafe trait` 的用武之地：让程序员用 `unsafe impl` 向编译器做出承诺：

```rust runnable
// 定义一个 unsafe trait，附带一条承诺：
// "实现了这个 trait 的类型，全零字节是合法值"
unsafe trait Zeroable {}

// u32 全零就是数字 0，合法，我们承诺
unsafe impl Zeroable for u32 {}

// bool 全零就是 false，也合法
unsafe impl Zeroable for bool {}

// &str 我们不实现 —— null 引用是未定义行为，不能承诺

// 有了 Zeroable 约束，这个函数才敢调用 mem::zeroed
fn zeroed<T: Zeroable>() -> T {
    unsafe { std::mem::zeroed() }
}

fn main() {
    let n: u32 = zeroed();
    let b: bool = zeroed();
    println!("u32: {}", n);   // 0
    println!("bool: {}", b);  // false
}
```

**整个过程的逻辑链：**

1. `std::mem::zeroed::<T>()` 把 T 的内存全部清零并返回——这是 `unsafe fn`，因为编译器不知道全零对 T 是否合法
2. 我们定义 `Zeroable` trait，语义是"全零合法"的承诺
3. `zeroed<T: Zeroable>` 函数里，因为 T 被约束为 `Zeroable`，我们知道全零一定合法，所以可以安心调用 `mem::zeroed`
4. 调用者只能对 `u32`、`bool` 这些我们手动 `unsafe impl` 过的类型使用 `zeroed()`——如果尝试 `zeroed::<&str>()`，编译器会直接报错

> 写下 `unsafe impl` 不会让类型自动变安全——编译器只是信任了你的承诺。如果承诺是错的（比如为 `&str` 实现 `Zeroable`），程序照样崩溃，编译器不会再阻拦你。

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
+ 调用通过 extern "C" 声明的 C 函数
E: 创建裸指针本身是安全的（只是记录了一个地址），只有解引用才需要 unsafe。通过 extern "C" 声明的 C 函数调用需要 unsafe，因为 Rust 编译器看不到 C 的实现，无法验证调用是否安全，责任由你承担。
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
