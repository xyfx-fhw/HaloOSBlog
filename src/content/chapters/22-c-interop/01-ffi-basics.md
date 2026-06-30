---
title: "FFI 基础"
description: "学习如何让 Rust 与 C 语言代码进行互操作，掌握 extern \"C\"、ABI 和类型映射。"
difficulty: beginner
estimatedTime: 25
keywords: ["FFI", "ABI", "extern C", "C-Interop", "libc"]
---

# 基础概念

Rust 的 **FFI (Foreign Function Interface)** 允许它调用其他语言（主要是 C）编写的函数，也允许其他语言调用 Rust。这对于复用现有的库或在现有 C 系统中引入 Rust 至关重要。

## 什么是 ABI？

要让两种不同的编程语言相互通信，它们必须在二进制层面上达成一致。这种约定被称为 **ABI（Application Binary Interface，应用二进制接口）**。

ABI 规定了：
- 函数参数是如何传递的（是通过寄存器还是栈？顺序如何？）
- 返回值如何处理。
- 函数在内存中的符号名称（Symbol Name）如何生成。

由于 C 语言是事实上的系统编程标准，绝大多数平台都定义了「标准的 C ABI」。

## `extern "C"` 块

为了在 Rust 中调用 C 函数，我们需要声明该函数的原型，并告知 Rust 使用 C ABI。

```rust
extern "C" {
    fn abs(input: i32) -> i32;
}

fn main() {
    unsafe {
        println!("Absolute value of -3 according to C: {}", abs(-3));
    }
}
```

- **`extern "C"`**：指定使用 C ABI。
- **`unsafe` 块**：调用外部函数总是被标记为 `unsafe`。因为 Rust 编译器无法检查外部 C 代码是否遵守 Rust 的内存安全规则（如指针有效性）。

## 导出 Rust 函数给 C

既然我们能调用 C，反过来，我们也需要让 C 能够调用 Rust。为了实现这一点，我们同样需要在 Rust 函数定义上使用 `extern "C"`。

在 Rust 中，`extern "C"` 有两种用法：
1. **`extern "C" { ... }` 块**：用于**声明**（导入）外部已经存在的 C 函数。
2. **`extern "C" fn ...`**：用于**定义**（导出）一个符合 C ABI 的 Rust 函数。

```rust
// 这是一个符合 C 调用约定的 Rust 函数
#[no_mangle]
pub extern "C" fn my_rust_library_function(x: i32) -> i32 {
    x * 2
}
```

**为什么要这么做？**
虽然函数的逻辑是用 Rust 写的，但当 C 程序调用它时，它必须穿上「C 的制服」（使用 C ABI 进行压栈、跳转和返回）。如果没有 `extern "C"`，Rust 编译器会使用由于性能优化而经常变动的 Rust 默认调用约定，这在 C 看来就是一堆无法理解的乱码。

## 符号名重整 (Name Mangling)

如果没有重整，它们在生成的二进制文件中都会被简简单单地命名为 `add`。当你尝试运行程序时，链接器会因为发现两个同名的「符号」而报错（符号冲突）。Rust 通过将名字重整为类似 `_ZN4math3add17h123abc456def789E` 的形式，确保了全球唯一性。

### FFI 中的尴尬

然而，C 语言及其链接器非常「单纯」。它不支持命名空间或函数重载，因此它期望你在代码里写 `call_from_c`，二进制文件里也必须叫 `call_from_c`。

如果我们想让 Rust 函数能被 C 链接器精准识别，就必须使用 `#[no_mangle]` 属性，强制要求 Rust 编译器：「原封不动地保留这个名字」。

```rust runnable
// 使用 #[no_mangle] 告诉编译器不要重整函数名
// 这样在编译出的库中，函数名依然是 "call_from_c"
#[no_mangle]
pub extern "C" fn call_from_c() {
    println!("成功收到 C 的调用：Rust 没把我的名字改掉！");
}
```

# 类型映射

跨越语言边界最大的挑战在于：**如何确保两边对内存数据的理解完全一致？**

这是双向的要求：
- **从 C 到 Rust**：当你在 `extern "C"` 块中声明 C 函数时，必须将 C 的参数类型准确映射为对应的 Rust 类型，否则 Rust 给 C 传参时可能会因为字节数对不上而造成崩溃。
- **从 Rust 到 C**：当你写一个给 C 调用函数时，必须使用 C 兼容的类型和布局（如 `#[repr(C)]`），否则 C 语言会解析错你的数据结构。

## 基础数值类型

你可能会想：C 里的 `int` 不就是 Rust 里的 `i32` 吗？

**不一定。** 在不同的 C 编译器和 CPU 架构下，`int` 可能是 16 位、32 位甚至 64 位。为了处理这种不确定性，Rust 在 `std::os::raw`（或 `core::ffi`）中定义了跨平台别名。

| C 类型 | Rust 别名 | 建议 |
| :--- | :--- | :--- |
| `int` | `c_int` | 始终优先使用别名，而非硬编码 `i32` |
| `unsigned int` | `c_uint` | 匹配 C 的无符号整型 |
| `long` | `c_long` | 极其重要：在 Windows 上通常是 32 位，Linux 上通常是 64 位 |
| `size_t` | `usize` | 虽然大部分情况等价，但在 FFI 签名中显式使用 `libc::size_t` 更规范 |

## 结构体布局：`#[repr(C)]`

这是初学者最容易掉进去的坑。

默认情况下，Rust 编译器为了优化内存空间（对齐和填充），可能会**重新排列**结构体中字段的顺序。而 C 语言严格按照定义的顺序排列字段。

```rust runnable expect-error
// ❌ 危险：这个结构体传给 C 会解析出错
struct Data {
    a: u8,
    b: u64,
}

// ✅ 正确：强制使用 C 兼容的内存布局
#[repr(C)]
struct SafeData {
    a: u8,
    b: u64,
}
```

### `#[repr(C)]` 会影响性能吗？

这是一个很好的问题。答案是：**几乎没有性能开销，但可能会有轻微的内存开销。**

- **运行开销（零成本）**：`#[repr(C)]` 只是在编译时告诉编译器如何摆放数据。它不会在运行时产生多余的指令或 CPU 开销。
- **空间开销（填充）**：Rust 默认的布局非常「聪明」，它会为了减少内存空隙而重排字段。例如，它可能会把几个小的 `u8` 塞进一个 `u64` 留下的缝隙里。而 `#[repr(C)]` 禁用了这种聪明才智，必须按照 C 的古老规则保留固定顺序。这意味着你的结构体可能会因为额外的 **填充字节（Padding）** 而大出几个字节。

> **结论**：为了 FFI 的正确性，这点小小的内存牺牲是必须的，且在 99% 的场景下，这种尺寸差异对性能的影响微乎其微。

> **记住**：任何要传给 C 或从 C 接收的结构体，必须标注 `#[repr(C)]`。

## 指针与 `void*`

C 语言中随处可见的 `T*` 指针在 Rust 中对应的是**裸指针 (Raw Pointers)**。它们之间的映射关系如下：

- `const T*` -> `*const T`
- `T*` (可变) -> `*mut T`
- `void*` (通用指针) -> `*mut c_void`

裸指针不像引用那样受借用检查器的保护，你可以随意解引用它们（但在 `unsafe` 块中），也可以随意在它们之间强转。

## C 语言字符串处理

处理字符串是 FFI 中最繁琐的部分，因为两者的设计理念完全不同：
- **C 字符串**：一段连续内存，以 `\0` (nul) 结尾。没有长度信息。
- **Rust 字符串**：有效的 UTF-8 序列，拥有显式的长度信息。

### 1. `CString`：将 Rust 字符串发往 C

当你需要生成一个 C 兼容的字符串并传给外部库时，使用 `CString`。它会分配内存并在末尾自动补上 `\0`。

```rust
use std::ffi::CString;

let s = CString::new("Hello C").expect("字符串内部不能包含 nul 字节");
// 注意：必须保持 c_str 的生命周期比 C 调用长
unsafe {
    some_c_function(s.as_ptr());
}
```

### 2. `CStr`：读取来自 C 的字符串

当 C 库返回给你一个 `*const char` 时，使用 `CStr` 来「包裹」它，从而能够以借用的方式读取数据，而无需立即拷贝。

```rust
use std::ffi::CStr;
use std::os::raw::c_char;

fn handle_callback(ptr: *const c_char) {
    let c_str = unsafe {
        assert!(!ptr.is_null());
        CStr::from_ptr(ptr)
    };
    println!("C 传来的消息: {:?}", c_str.to_str().unwrap());
}
```

# 代码实战示例

本节将通过完整的示例代码，展示如何将前面学到的知识点串联起来。

## 示例 1：调用 C 标准库进行数学计算

在 C 语言中，`sqrt` 函数用于计算平方根。在 Rust 中我们不需要手动链接库，因为它通常包含在默认链接的标准库中。

```rust runnable
use std::os::raw::c_double;

// 声明外部 C 函数
extern "C" {
    fn sqrt(x: c_double) -> c_double;
    fn pow(base: c_double, exp: c_double) -> c_double;
}

fn main() {
    let x: f64 = 2.0;
    let y: f64 = 3.0;

    unsafe {
        println!("2.0 的平方根是: {}", sqrt(x));
        println!("2.0 的 3.0 次方是: {}", pow(x, y));
    }
}
```

## 示例 2：向 C 传递复杂的配置结构体

当我们需要向外部库传递配置信息时，通常会定义一个 `#[repr(C)]` 的结构体。

```rust
use std::os::raw::{c_int, c_char};
use std::ffi::CString;

// 1. 定义兼容 C 的结构体
#[repr(C)]
pub struct Config {
    pub id: c_int,
    pub name: *const c_char,
    pub active: bool,
}

// 2. 声明位于 C 库中的函数原型
extern "C" {
    fn process_config(config: *const Config);
}

fn main() {
    // 3. 准备数据：注意 CString 的生命周期
    let name = CString::new("Rust-InterOp-Service").unwrap();

    let config = Config {
        id: 1024,
        name: name.as_ptr(),
        active: true,
    };

    // 4. 调用外部函数
    unsafe {
        process_config(&config);
    }
}
```

> **💡 思考：手动写这些太麻烦了怎么办？**
>
> 你可能已经发现了：C 语言只需要 `#include <header.h>` 就能拿到定义，Rust 难道必须手动重写一遍 C 库里成百上千个结构体吗？
>
> 答案是：**不需要。** 虽然 Rust 编译器本身不理解 `.h` 文件，但我们可以使用工具 **`bindgen`**。它能自动解析 C 头文件并生成对应的 Rust `extern "C"` 块和 `#[repr(C)]` 结构体。在处理大型 C 项目时，自动化工具是绝对的主流。我们将在下一篇文章里详细探讨它。

> **注意**：在上面的代码中，`process_config` 函数的实现是在外部的 C 库（如 `.c` 文件或 `.so/.dll` 动态库）中。Rust 编译器在编译时会通过 `extern "C"` 块生成一个待链接的符号，并在链接阶段将其指向真实的 C 实现。

## 示例 3：处理 C 风格的回调函数

C 语言库经常通过函数指针来提供异步或事件回调。在 Rust 中，我们可以通过 `extern "C" fn` 来定义符合要求的函数。

```rust
use std::os::raw::c_int;

// 1. 定义函数指针类型（符合 C ABI）
type Callback = extern "C" fn(c_int, c_int) -> c_int;

extern "C" {
    // 2. 声明一个接收回调的外部 C 函数
    fn run_operation(a: c_int, b: c_int, cb: Callback);
}

// 3. 在 Rust 中编写回调函数的具体实现
// 必须加上 extern "C" 以匹配调用约定
extern "C" fn my_rust_callback(a: c_int, b: c_int) -> c_int {
    println!("Rust 回调被触发：a = {}, b = {}", a, b);
    a + b
}

fn main() {
    unsafe {
        // 4. 将 Rust 函数作为回调传给 C
        run_operation(10, 20, my_rust_callback);
    }
}
```

# 练习题

## 核心概念测验

```quiz single
Q: 为什么调用 C 函数必须使用 `unsafe` 块？
- 因为 C 运行速度太快，Rust 需要减速。
- 因为 C 语言只支持 32 位系统。
+ 因为 Rust 编译器无法验证外部 C 代码是否符合 Rust 的内存安全规则。
- 因为外部函数总是会抛出异常。
E: 编译器只能保证 Rust 代码的安全性，对于越过 FFI 边界的代码，安全性必须由开发者手动保证。
```

```quiz single
Q: 关于 `#[no_mangle]` 属性的作用，哪项描述是正确的？
- 它会让代码运行得更快。
+ 它禁止编译器修改函数的符号名称，确保 C 链接器能找到它。
- 它会自动把 Rust 代码转换成 C 语言。
- 它允许函数在没有 main 函数的情况下运行。
E: Name Mangling（符号重整）是 Rust 用来处理函数重载等特性的机制，但在 FFI 中需要禁用它以保持导出符号的可预测性。
```

```quiz multi
Q: 下列哪些关于 CString 和 CStr 的描述是正确的？
+ CString 拥有字符串所有权，并在末尾添加 `\0`。
- CStr 用于创建一个新的拥有所有权的字符串。
+ CStr 通常用于引用来自 C 代码的字符串数据。
- 把 Rust 的 `&str` 直接强制转换为 `*const c_char` 是绝对安全的。
E: CString 类似 String（有所有权），CStr 类似 &str（无所有权）。直接强转 &str 及其危险，因为 Rust 字符串末尾没有 `\0`。
```

```quiz single
Q: 在 Rust 中调用 `extern "C"` 函数时，参数传递的顺序 and 方式是由什么决定的？
- 操作系统版本。
- 程序员的心情。
+ ABI (Application Binary Interface)。
- CPU 的核心数。
E: ABI 规定了跨语言调用时的参数传递和返回值规范。
```

```quiz single
Q: 如果你想在 Rust 中完美匹配 C 语言的 `int` 类型，最推荐的做法是？
- 始终使用 `i32`。
- 使用 `usize`。
+ 使用 `std::os::raw::c_int` (或 `core::ffi::c_int`)。
- 使用 `u32`。
E: `c_int` 会根据目标平台的 C 标准自动调整大小（可能是 16 位、32 位或更多），比硬编码类型更稳健。
```
