---
title: "安全抽象"
description: "学习如何在 unsafe 实现上封装安全的公共接口，掌握不变量文档化与最小化 unsafe 范围的工程实践"
difficulty: advanced
estimatedTime: 30
keywords: ["安全抽象", "unsafe", "不变量", "Safety 文档", "封装", "safe wrapper"]
---

# 封装原则

## 核心思想：unsafe 实现，safe 接口

Rust 标准库里的 `Vec`、`String`、`Arc` 全都用了 unsafe——但你作为使用者从来不需要写 `unsafe` 就能用它们。这就是 **unsafe 实现 + safe 接口**的设计模式。

设计原则：

1. **把 unsafe 限制在最小范围**：一两个函数内部，而不是整个模块
2. **维护不变量（invariant）**：unsafe 代码的正确性依赖于某些永远成立的条件，你要确保这些条件在所有路径上都成立
3. **文档化前提条件**：用 `# Safety` 注释说明"调用者需要保证什么"

```rust runnable
// 不好的做法：unsafe 泄漏到公共接口
pub unsafe fn get_element(ptr: *const i32, idx: usize) -> i32 {
    *ptr.add(idx)  // 调用者要自己保证一切
}

// 好的做法：unsafe 实现，safe 接口
pub fn get_element_safe(slice: &[i32], idx: usize) -> Option<i32> {
    if idx < slice.len() {
        // unsafe 只在这里，且我们已经验证了安全前提
        Some(unsafe { *slice.as_ptr().add(idx) })
    } else {
        None
    }
}

fn main() {
    let arr = [10, 20, 30];
    println!("{:?}", get_element_safe(&arr, 1));  // Some(20)
    println!("{:?}", get_element_safe(&arr, 9));  // None
}
```

## 什么是不变量

**不变量**（invariant）是 unsafe 代码正确运行所依赖的永远成立的条件。破坏不变量 = 未定义行为。

例如，一个简单的 `FixedSlice` 结构体持有裸指针和长度，它的不变量是：
- `ptr` 指向至少 `len` 个有效的、已初始化的 `T` 值
- `ptr` 指向的内存在 `FixedSlice` 存活期间始终有效

```rust runnable
use std::marker::PhantomData;

// 不变量：ptr 始终指向 len 个有效的 T 值
struct FixedSlice<T> {
    ptr: *const T,
    len: usize,
    _marker: PhantomData<T>, // 告诉编译器我们"拥有"T 类型数据
}

impl<T> FixedSlice<T> {
    /// # Safety
    /// `ptr` 必须指向至少 `len` 个有效的、已初始化的 `T` 值，
    /// 且在 `FixedSlice` 存活期间保持有效。
    pub unsafe fn from_raw(ptr: *const T, len: usize) -> Self {
        FixedSlice { ptr, len, _marker: PhantomData }
    }

    // 安全方法：内部验证 idx < len，才解引用
    pub fn get(&self, idx: usize) -> Option<&T> {
        if idx < self.len {
            // Safety: idx < len 已验证，不变量保证 ptr 有效
            Some(unsafe { &*self.ptr.add(idx) })
        } else {
            None
        }
    }

    pub fn len(&self) -> usize { self.len }
}

fn main() {
    let data = [1i32, 2, 3, 4, 5];
    // unsafe 只在创建时出现一次
    let slice = unsafe { FixedSlice::from_raw(data.as_ptr(), data.len()) };

    // 之后全是安全调用
    println!("len = {}", slice.len());
    println!("get(2) = {:?}", slice.get(2));  // Some(3)
    println!("get(9) = {:?}", slice.get(9));  // None
}
```

# 实战示例

## 示例：手写一个 StackVec

用裸指针实现一个固定容量、栈分配的向量，展示完整的封装过程：

```rust runnable
use std::mem::MaybeUninit;

/// 固定容量 N 的栈上向量
/// 不变量：self.data[0..self.len] 中的元素已初始化
struct StackVec<T, const N: usize> {
    data: [MaybeUninit<T>; N],
    len: usize,
}

impl<T, const N: usize> StackVec<T, N> {
    pub fn new() -> Self {
        StackVec {
            data: unsafe { MaybeUninit::uninit().assume_init() },
            len: 0,
        }
    }

    /// 向末尾追加元素，容量满时返回 Err
    pub fn push(&mut self, val: T) -> Result<(), T> {
        if self.len >= N {
            return Err(val);
        }
        // Safety: len < N，索引在界内；写入后 len 递增维护不变量
        unsafe { self.data[self.len].write(val); }
        self.len += 1;
        Ok(())
    }

    /// 读取第 idx 个元素的引用
    pub fn get(&self, idx: usize) -> Option<&T> {
        if idx < self.len {
            // Safety: idx < len，不变量保证此位置已初始化
            Some(unsafe { self.data[idx].assume_init_ref() })
        } else {
            None
        }
    }

    pub fn len(&self) -> usize { self.len }
}

impl<T, const N: usize> Drop for StackVec<T, N> {
    fn drop(&mut self) {
        for i in 0..self.len {
            unsafe { self.data[i].assume_init_drop(); }
        }
    }
}

fn main() {
    let mut v: StackVec<String, 4> = StackVec::new();

    v.push(String::from("hello")).ok();
    v.push(String::from("world")).ok();
    v.push(String::from("rust")).ok();

    println!("len = {}", v.len());
    println!("get(1) = {:?}", v.get(1));

    let overflow = v.push(String::from("!"));
    assert!(overflow.is_ok());
    println!("push 到容量上限前正常: Ok");
    println!("再 push 超出容量: {}", v.push(String::from("overflow")).is_err());
}
```

## 最小化 unsafe 的实践

一个常见错误是把 unsafe 块写得太大。把每个危险操作单独放进小 unsafe 块，可以更容易地定位问题：

```rust runnable
fn double_all(data: &mut [i32]) {
    let ptr = data.as_mut_ptr();
    let len = data.len();

    // 不好的写法（注释掉）：
    // unsafe {
    //     let sum: i32 = data.iter().sum(); // 这行其实是安全的，不必放进 unsafe
    //     for i in 0..len { *ptr.add(i) *= 2; }
    // }

    // 好的写法：安全操作和不安全操作分开
    let sum: i32 = data.iter().sum(); // 安全，不需要 unsafe
    for i in 0..len {
        unsafe { *ptr.add(i) *= 2; } // 只有这步是 unsafe
    }
    println!("翻倍前总和: {}", sum);
}

fn main() {
    let mut arr = [1, 2, 3, 4, 5];
    double_all(&mut arr);
    println!("{:?}", arr); // [2, 4, 6, 8, 10]
}
```

# 练习题

## 安全抽象测验

```quiz single
Q: 以下哪种做法最符合"安全抽象"的设计原则？
- 把所有涉及裸指针的代码都放在 unsafe 模块里，对外暴露 unsafe 接口
- 完全避免使用 unsafe，用安全 Rust 重写所有功能
+ unsafe 只出现在内部实现，对外暴露的公共函数全部是安全的
- 用 unsafe 块包裹整个函数体以减少代码缩进
E: 安全抽象的精髓是：把 unsafe 的复杂性封装起来，让使用者不需要关心也不需要写 unsafe。这正是标准库 Vec、String 等类型的做法。完全避免 unsafe 有时不可能（涉及 FFI、底层内存操作），全部暴露 unsafe 则把责任推给了每一个调用者。
```

```quiz single
Q: 不变量（invariant）在 unsafe 代码中扮演什么角色？
- 不变量是 Rust 编译器自动检查的条件
+ 不变量是 unsafe 代码正确性所依赖的、需要手动维护的条件，破坏它会导致未定义行为
- 不变量只在 unsafe trait 中有意义
- 不变量是函数的前置条件，在 # Safety 注释中声明后编译器会验证
E: 编译器无法验证 unsafe 代码的不变量——这正是"unsafe"的本质。不变量由程序员在所有修改状态的地方手动维护。好的 unsafe 代码每个 unsafe 块旁边都有一条 // Safety: 注释，说明当前的不变量为什么成立。
```

```rust
struct Wrapper {
    ptr: *mut i32,
}

impl Wrapper {
    pub fn new(val: i32) -> Self {
        let b = Box::new(val);
        Wrapper { ptr: Box::into_raw(b) }
    }

    pub fn get(&self) -> i32 {
        unsafe { *self.ptr }
    }
}
```

```quiz single
Q: 上面的代码有什么问题？
- get() 不需要 unsafe 块
- Box::into_raw() 不能这样使用
+ Wrapper 没有实现 Drop，Box 分配的内存永远不会被释放，存在内存泄漏
- ptr 是 *mut i32，但 get() 只读，应该用 *const i32
E: Box::into_raw() 会"泄漏" Box 的所有权（Box 不再负责 drop），内存的释放责任转移到了你手上。Wrapper 必须实现 Drop，在其中调用 unsafe { drop(Box::from_raw(self.ptr)) } 来归还内存。这是 unsafe 封装中最常见的错误之一。
```

```quiz multi
Q: 关于最小化 unsafe 范围，以下哪些做法是推荐的？
+ 只把真正的 unsafe 操作放入 unsafe 块，不把安全代码也放进去
+ 在每个 unsafe 块旁边写注释说明为什么这里是安全的
+ 把 unsafe 操作封装进私有函数，对外暴露安全接口
- 用一个大 unsafe {} 包裹整个函数体，减少大括号嵌套
E: unsafe 块越小，审查越容易，出错越难。用一个大 unsafe 包裹整个函数会把安全和不安全操作混在一起，代码审查者无法快速定位真正的危险点。
```

## 编程练习

下面是一个有内存泄漏的 `OwnedPtr` 包装类型，请为它实现 `Drop`，确保内存被正确释放：

```rust editable
struct OwnedPtr {
    ptr: *mut i32,
}

impl OwnedPtr {
    pub fn new(val: i32) -> Self {
        let b = Box::new(val);
        OwnedPtr { ptr: Box::into_raw(b) }
    }

    pub fn get(&self) -> i32 {
        unsafe { *self.ptr }
    }

    pub fn set(&mut self, val: i32) {
        unsafe { *self.ptr = val; }
    }
}

// TODO: 实现 Drop，用 Box::from_raw 收回内存
impl Drop for OwnedPtr {
    fn drop(&mut self) {
        todo!()
    }
}

fn main() {
    let mut p = OwnedPtr::new(42);
    println!("初始值: {}", p.get());
    p.set(100);
    println!("修改后: {}", p.get());
    println!("OwnedPtr 即将 drop");
}
```

```expected
初始值: 42
修改后: 100
OwnedPtr 即将 drop
```
