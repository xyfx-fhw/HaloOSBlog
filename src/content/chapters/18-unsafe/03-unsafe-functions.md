---
title: "unsafe 函数与 Trait"
description: "学习 unsafe fn 的设计规范、# Safety 文档约定，以及 unsafe trait 与 Send/Sync 的实现原理"
difficulty: advanced
estimatedTime: 25
keywords: ["unsafe fn", "unsafe trait", "Send", "Sync", "Safety 文档", "extern fn"]
---

# unsafe 函数

## 什么时候需要 unsafe fn

当一个函数有**调用者必须满足但编译器无法验证的前提条件**时，就需要标注 `unsafe fn`。

常见场景：
- 函数接收裸指针，要求调用者保证指针有效且对齐
- 函数操作全局状态，要求单线程调用
- 函数调用了 C 代码，要求参数满足 C 接口的约定

标注 `unsafe fn` 的含义：**这个函数把安全责任转移给调用者**。

## unsafe fn 的基本语法

```rust runnable
/// # Safety
///
/// - `ptr` 必须指向一个有效的、已初始化的 `i32` 值
/// - `ptr` 必须在整个调用期间保持有效（不能是悬垂指针）
unsafe fn read_unchecked(ptr: *const i32) -> i32 {
    *ptr
}

fn main() {
    let x = 42;
    // 调用 unsafe fn 需要 unsafe 块
    let val = unsafe { read_unchecked(&x as *const i32) };
    println!("{}", val); // 42
}
```

> **`# Safety` 文档节**是 Rust 社区的约定：每个 `unsafe fn` 都应该有一个 `# Safety` 文档注释，说明调用者需要满足什么条件。这是 unsafe 代码可维护性的关键。

## unsafe fn 内部也需要 unsafe 块

**Rust 2021 和 2024 edition 在这里行为不同：**

- **2021 edition**：`unsafe fn` 的函数体是一个隐式的 unsafe 块，内部的危险操作不需要额外的 `unsafe {}`
- **2024 edition**：即使在 `unsafe fn` 内，每个危险操作也必须显式加 `unsafe {}` 块

2024 edition 的改动是故意的——强迫你精确标出每一个危险点，而不是让整个函数体"默认危险"，更容易做代码审查。本教程使用 2024 edition，所以你会看到 `unsafe fn` 内部仍然有 `unsafe {}` 块：

```rust runnable
unsafe fn process(ptr: *mut i32, count: usize) {
    // 2024 edition：即使在 unsafe fn 内，危险操作也要显式标出
    for i in 0..count {
        unsafe {
            *ptr.add(i) *= 2;
        }
    }
}

fn main() {
    let mut arr = [1, 2, 3, 4, 5];
    unsafe {
        process(arr.as_mut_ptr(), arr.len());
    }
    println!("{:?}", arr); // [2, 4, 6, 8, 10]
}
```

## 外部函数（extern fn）

通过 `extern "C"` 块声明的外部函数（通常来自 C 库）是隐式 `unsafe` 的——调用它们需要 `unsafe` 块：

```rust
extern "C" {
    fn abs(x: i32) -> i32;        // C 标准库的 abs 函数
    fn strlen(s: *const u8) -> usize;
}

fn main() {
    let result = unsafe { abs(-42) };
    println!("{}", result); // 42
}
```

为什么外部函数是 unsafe？因为 Rust 编译器对 C 代码一无所知——它无法验证 C 函数的内存安全性，所以要求调用者承担责任。

# unsafe Trait

## 什么是 unsafe trait

`unsafe trait` 表示这个 trait 有**实现者必须手动保证的安全不变量**，编译器无法自动验证。

最重要的两个例子是 `Send` 和 `Sync`：

| Trait | 含义 | 编译器自动实现的条件 |
|-------|------|------------------|
| `Send` | 类型可以安全地移动到另一个线程 | 所有字段都是 `Send` |
| `Sync` | 类型可以安全地被多个线程共享引用 | 所有字段都是 `Sync` |

## 手动实现 Send 和 Sync

当你的类型包含裸指针时，编译器会保守地不自动实现 `Send` 和 `Sync`。如果你确认线程安全，需要手动用 `unsafe impl` 声明：

```rust runnable
use std::sync::atomic::{AtomicI32, Ordering};

// 包含裸指针的类型：编译器不会自动实现 Send/Sync
struct AtomicCounter {
    inner: *mut AtomicI32,
}

// 我们手动保证：通过 AtomicI32 的原子操作，多线程访问是安全的
unsafe impl Send for AtomicCounter {}
unsafe impl Sync for AtomicCounter {}

impl AtomicCounter {
    fn new(val: i32) -> Self {
        let boxed = Box::new(AtomicI32::new(val));
        AtomicCounter { inner: Box::into_raw(boxed) }
    }

    fn increment(&self) {
        unsafe { (*self.inner).fetch_add(1, Ordering::SeqCst); }
    }

    fn get(&self) -> i32 {
        unsafe { (*self.inner).load(Ordering::SeqCst) }
    }
}

impl Drop for AtomicCounter {
    fn drop(&mut self) {
        unsafe { drop(Box::from_raw(self.inner)); }
    }
}

fn main() {
    let counter = AtomicCounter::new(0);
    counter.increment();
    counter.increment();
    println!("{}", counter.get()); // 2
}
```

## 定义自己的 unsafe trait

你也可以定义自己的 `unsafe trait`，用来表达某种合同：

```rust runnable
/// # Safety
///
/// 实现此 trait 的类型必须保证：
/// 内存布局与 C 中对应类型完全一致（#[repr(C)]）
unsafe trait ReprC: Sized {
    fn as_bytes(&self) -> &[u8] {
        unsafe {
            std::slice::from_raw_parts(
                self as *const Self as *const u8,
                std::mem::size_of::<Self>(),
            )
        }
    }
}

#[repr(C)]
struct Point { x: f32, y: f32 }

// 我们保证 Point 是 #[repr(C)] 布局的
unsafe impl ReprC for Point {}

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
    let bytes = p.as_bytes();
    println!("Point 占 {} 字节", bytes.len()); // 8
}
```

## 阻止自动实现：!Send 和 !Sync

有时你的类型天生不能跨线程，需要明确**阻止**编译器自动推导 `Send` 或 `Sync`。使用 `PhantomData` 加上 negative impl 是惯用方法：

```rust runnable
use std::marker::PhantomData;

// PhantomData<*const ()> 是 !Send 的，这会让 MyType 也变成 !Send
struct MyType {
    data: i32,
    _not_send: PhantomData<*const ()>,
}

fn main() {
    let x = MyType { data: 42, _not_send: PhantomData };
    println!("data = {}", x.data);

    // 下面这行会编译失败：MyType 不是 Send，不能跨线程移动
    // std::thread::spawn(move || { let _ = x; });
}
```

# 练习题

## unsafe 函数测验

```quiz single
Q: 为什么外部函数（extern "C" 声明的函数）调用需要 unsafe 块？
- 因为 C 函数运行速度快，需要特殊标注
- 因为 extern "C" 语法本身就是 unsafe 的
- 因为外部函数可能抛出异常
+ 因为 Rust 编译器无法验证 C 代码的内存安全性，需要调用者承担责任
E: Rust 的安全保证依赖于编译器对代码的完整分析。对于 C 函数，编译器看不到实现，无法验证它是否会产生悬垂指针、缓冲区溢出等问题，所以保守地要求所有调用都在 unsafe 块内，由程序员承诺"我知道这个 C 函数在这里调用是安全的"。
```

```rust
unsafe fn get_first(slice: &[i32]) -> i32 {
    *slice.as_ptr()
}
```

```quiz single
Q: 上面的 unsafe fn 有什么问题？
- 没有问题，代码完全正确
- unsafe fn 内部不需要额外的 unsafe 块，所以 *slice.as_ptr() 会报错
+ slice 为空时 slice.as_ptr() 仍然"有效"但解引用越界，应该检查长度或在 # Safety 注释中说明调用者必须保证 slice 非空
- as_ptr() 不能用于切片
E: 函数本身能编译，但语义上有问题：当 slice 为空时，as_ptr() 返回一个"有效的但不可解引用"的指针（Rust 规范允许这样的指针存在），解引用它是未定义行为。正确做法是要么加 assert!(!slice.is_empty())，要么在 # Safety 文档里明确要求调用者保证非空。
```

```quiz multi
Q: 关于 unsafe trait，以下哪些说法是正确的？
+ unsafe trait 附带了一条编译器无法验证的安全承诺，实现时必须写 unsafe impl
+ unsafe trait 可以没有任何方法，只是一个"标记承诺"
+ 写下 unsafe impl 后，如果承诺是错的，程序照样会出错——编译器只是不再阻拦
- 实现了 unsafe trait 之后，这个类型的所有操作都自动变得安全
E: unsafe trait 的核心是"承诺"而不是"魔法"。unsafe impl 只是让编译器信任你说的话，真正的安全仍然由你的代码保证。unsafe trait 也不需要有方法，像 Zeroable 这样的标记 trait 只是在说"我满足某个条件"，没有任何方法体。
```

```quiz single
Q: 在 unsafe fn 内部（2024 edition），执行 unsafe 操作需要额外的 unsafe {} 块吗？
- 不需要，unsafe fn 内所有操作都默认是 unsafe 的
- 不需要，unsafe fn 已经声明了整个函数不安全，内部无需再标
+ 需要，2024 edition 要求即使在 unsafe fn 内，危险操作也必须显式标出
- 只有解引用裸指针需要，其他操作不需要
E: 2024 edition 改变了这个行为。2021 及更早版本中，unsafe fn 的函数体是隐式 unsafe 块，内部不需要再套 unsafe {}。2024 edition 要求显式标出每个危险操作，目的是让代码审查者能一眼定位真正的危险点，而不是整个函数体"默认危险"。
```

## 编程练习

下面有一个 `unsafe fn`，但缺少 `# Safety` 文档注释，且内部的 unsafe 操作没有用 `unsafe` 块包裹。请修复它：

```rust editable
// TODO: 添加 # Safety 文档注释，说明调用者的前提条件
unsafe fn copy_bytes(src: *const u8, dst: *mut u8, count: usize) {
    for i in 0..count {
        // TODO: 用 unsafe 块包裹裸指针操作
        *dst.add(i) = *src.add(i);
    }
}

fn main() {
    let src = [1u8, 2, 3, 4, 5];
    let mut dst = [0u8; 5];

    unsafe {
        copy_bytes(src.as_ptr(), dst.as_mut_ptr(), src.len());
    }

    println!("{:?}", dst);
}
```

```expected
[1, 2, 3, 4, 5]
```
