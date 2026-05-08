---
title: "所有权系统"
description: ""
difficulty: beginner
estimatedTime: 10
keywords: []
---

# 本章概览

# 栈和堆

下面两张图在开始讲解所有权之前，帮助理解内存的两种常见分配区域：栈（Stack）与堆（Heap）。

## 栈（Stack）概要

栈用于存放函数调用的栈帧和那些大小在编译期已知的小数据（例如整数、布尔、固定大小的数组、指针元信息等）。栈的分配与释放遵循 LIFO（后进先出），速度很快且不需要运行时的分配器，但栈空间有限，无法直接保存运行时大小可变的数据。

<img src="/RustCourse/diagrams/stack.svg" alt="Stack diagram" style="max-width:100%;margin:1rem 0;" />

## 堆（Heap）概要

堆用于动态分配大小不确定或较大的数据（例如 `String`、`Vec<T>`、Box 指向的值等）。堆上的内存通过分配器（allocator）管理，分配/释放成本较高，且需要通过所有权或智能指针在程序中跟踪谁负责释放这块内存。

<img src="/RustCourse/diagrams/heap.svg" alt="Heap diagram" style="max-width:100%;margin:1rem 0;" />

---

在 Rust 中，这两者如何配合：变量的绑定（名字）本身通常保存在栈上；但如果该绑定指向一个在运行时分配的值（例如 `String` 的字符缓冲区），真实数据会存放在堆上。例如：

```rust
fn main() {
	let x = 42;                 // x 的值直接存放在栈上
	let s = String::from("hi"); // s 在栈上存储三部分（指针、长度、容量），实际字符数据在堆上
}
```

这就是所有权问题出现的背景：当你把一个绑定的值**移动**或**传递**给别的变量/函数时，Rust 会在编译期检查谁拥有堆上数据的释放权，从而在无需运行时 GC 的情况下保证内存安全。下面我们正式进入所有权、借用与生命周期的细节讲解。
