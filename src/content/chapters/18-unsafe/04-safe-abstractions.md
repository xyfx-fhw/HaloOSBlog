---
title: "安全抽象"
description: "学习如何在 unsafe 实现上封装安全的公共接口，理解不变量与封装的关系"
difficulty: advanced
estimatedTime: 20
keywords: ["安全抽象", "unsafe", "不变量", "封装", "safe wrapper"]
---

## 出发点

`Vec`、`String`、`Arc` 内部全都用了 unsafe——但你作为使用者从来不需要写 `unsafe` 就能用它们。这不是魔法，而是一种设计模式：**unsafe 实现，safe 接口**。

目标很简单：把 unsafe 的复杂性关在函数内部，让调用方看到的只是普通的安全函数。

## 为什么不能直接暴露 unsafe？

先看一个反例：

```rust runnable
// 不好的做法：unsafe 泄漏到公共接口，调用者要自己保证一切
pub unsafe fn get_element(ptr: *const i32, idx: usize) -> i32 {
    unsafe { *ptr.add(idx) }
}

// 好的做法：验证放在函数内部，unsafe 不出门
pub fn get_safe(slice: &[i32], idx: usize) -> Option<i32> {
    if idx < slice.len() {
        Some(unsafe { *slice.as_ptr().add(idx) })
    } else {
        None
    }
}

fn main() {
    let arr = [10, 20, 30];
    println!("{:?}", get_safe(&arr, 1)); // Some(20)
    println!("{:?}", get_safe(&arr, 9)); // None
}
```

`get_element` 把"保证 ptr 有效、idx 在界内"的责任完全推给了每一个调用者——每次调用都要写 unsafe，每次都要自己小心。`get_safe` 把验证逻辑放在函数里，unsafe 只出现一次，调用方完全不感知。

## 不变量：unsafe 代码依赖的规矩

那函数内部的 unsafe 为什么安全？因为有**不变量**（invariant）在守护。

不变量是你的代码对自己立下的规矩——一条永远必须成立的条件。上面 `get_safe` 的不变量是：进入 unsafe 块之前，`idx < slice.len()` 一定成立。只要这条成立，`slice.as_ptr().add(idx)` 就不会越界，解引用就是合法的。

用一个生活类比建立直觉：银行账户有一条不变量"余额 ≥ 0"。取款操作在扣钱之前会先检查余额是否足够——这个检查就是在维护不变量。如果跳过检查直接扣钱，账户就进入了"不合法状态"，后续一切计算都可能出错。

unsafe 代码里的不变量是一样的道理，只是"不合法状态"变成了"未定义行为"。

## 封装的作用

理解了不变量，封装的意义就很清楚了：

**封装 = 让外部代码没有机会打破不变量。**

如果字段是 `pub` 的，任何人都能把 `len` 改大、把指针改成 null——不变量随时可能被破坏。把字段设为私有，只通过你控制的方法访问，就能保证每次修改都经过你的检查。

## 一个完整的例子

`split_at_mut` 是标准库里的经典案例——把一个可变 slice 从中间分成两段，各自可变：

```rust runnable
use std::slice;

fn split_at_mut(slice: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = slice.len();
    let ptr = slice.as_mut_ptr();

    // 不变量：mid <= len
    // 只要成立，两段内存就不重叠，同时持有两个可变引用是安全的
    assert!(mid <= len);

    unsafe {
        (
            slice::from_raw_parts_mut(ptr, mid),
            slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}

fn main() {
    let mut v = [1, 2, 3, 4, 5];
    let (left, right) = split_at_mut(&mut v, 3);
    println!("{:?}", left);  // [1, 2, 3]
    println!("{:?}", right); // [4, 5]
}
```

这段代码如果只用安全 Rust 来写，编译器会拒绝——它看到的是"同一个 slice 被借用了两次"，不知道两段不重叠。但我们知道，所以用 `assert!` 强制维护不变量，再用 unsafe 告诉编译器"我检查过了"。

调用方看到的只是一个普通函数，完全不需要接触 unsafe。

## 小结

三件事缺一不可：

1. **识别不变量**：unsafe 代码正确运行依赖哪条必须成立的条件
2. **维护不变量**：在进入 unsafe 之前，用检查（assert、if）或类型系统确保条件成立
3. **封装 unsafe**：把危险操作藏在函数内部，对外只暴露安全接口

这就是标准库里每一个用了 unsafe 的类型和函数都在做的事。
