---
title: "Box<T>：堆内存分配"
description: "通过 Box<T> 将数据存储在堆上，解决递归类型的大小未知问题，是最简单也是最基础的智能指针。"
difficulty: intermediate
estimatedTime: 25
keywords: ["Box", "堆分配", "递归类型", "cons list", "所有权"]
---

# 智能指针从 `Box<T>` 开始

在 Rust 中，默认情况下所有值都存放在栈上。当值的大小在编译时已知，栈是高效且安全的选择。然而，在以下三种经典场景中，我们必须将数据搬到堆上：

1. **类型大小编译时未知**：比如递归数据结构，它的实际大小取决于运行时的数据量。
2. **大量数据转移所有权**：避免将 MB 级别的数据在栈上来回拷贝，而是只拷贝指针。
3. **Trait 对象**：希望持有"实现了某个 Trait 的任意类型"，而不关心具体类型。

`Box<T>` 是 Rust 标准库提供的最简单的智能指针。它在栈上存储一个指针，而将实际数据分配在堆上。除了分配位置不同，它的行为和普通引用几乎相同。

## 最简单的用法

```rust runnable
fn main() {
    let b = Box::new(5);
    println!("b = {}", b);
    // b 离开作用域时，栈上的指针和堆上的数据都会被释放
}
```

这个例子没有什么实际意义——把单个整数放在堆上没有必要。但它清晰地展示了 `Box<T>` 的基本语法：像使用栈上的值一样使用它，Rust 会在离开作用域时自动清理堆内存。

## 递归类型：`Box<T>` 大显身手

递归类型是 `Box<T>` 最重要的使用场景之一。**递归类型**指的是类型定义中包含自身的类型。

### 问题：无限大小的类型

我们来尝试用 Rust 定义一个来自函数式编程的经典数据结构 —— cons list（一种简单的链表）：

```rust
// 这段代码无法编译！
enum List {
    Cons(i32, List),  // Cons 节点包含一个值和下一个节点，是一个具名元组
    Nil,              // 表示列表终止
}
```

如果你尝试编译上面的代码，编译器会给出如下错误：

```text
error[E0072]: recursive type `List` has infinite size
 --> src/main.rs:1:1
  |
1 | enum List {
  | ^^^^^^^^^ recursive type has infinite size
2 |     Cons(i32, List),
  |               ---- recursive without indirection
  |
  = help: insert indirection (e.g., a `Box`, `Rc`, or `&`) at some point
    to make `List` representable
```

这个错误发生的原因很直观：Rust 在编译时需要知道每个类型需要多少内存。当编译器看到 `List` 时，它会去计算 `Cons(i32, List)` 的大小，而这又需要再次计算 `List` 的大小……这个计算永远无法终止。

### 理解编译器的尺寸计算

对于普通的枚举，Rust 会选择其最大成员的大小。比如：

```rust
enum Message {
    Quit,                       // 不占数据空间
    Move { x: i32, y: i32 },   // 需要两个 i32
    Write(String),              // 需要一个 String
    ChangeColor(i32, i32, i32), // 需要三个 i32
}
```

Rust 会取所有成员中最大的那个，为所有 `Message` 实例分配相同大小的内存。但递归类型让这个计算陷入死循环。

### 解决方案：用指针打破递归

编译器错误信息给了提示：在递归处加入"间接性" (indirection)。意思是不直接存储一个 `List` 值，而是存储一个**指向** `List` 的指针：

```rust runnable
#[derive(Debug)]
enum List {
    Cons(i32, Box<List>),  // 用 Box 包裹，存储的是指针而非值
    Nil,
}

use List::{Cons, Nil};

fn main() {
    let list = Cons(1,
        Box::new(Cons(2,
            Box::new(Cons(3,
                Box::new(Nil))))));

    println!("链表: {:?}", list);
}
```

现在 Rust 可以轻松计算出 `Cons` 成员的大小了：一个 `i32` 加上一个 `Box<List>` 指针（在 64 位系统上固定为 8 字节）。无论链表有多长，每个节点的内存布局都是固定且可知的。

## `Box<T>` 的本质

`Box<T>` 之所以称为"智能"指针，是因为它实现了两个关键 Trait：

- **`Deref` Trait**：使得 `Box<T>` 可以像引用一样被解引用（使用 `*` 运算符），以及享受解引用强制转换的便利。
- **`Drop` Trait**：当 `Box<T>` 离开作用域时，会自动释放堆上的内存，无需手动 `free`。

这两个 Trait 正是下一篇文章要深入学习的核心内容。`Box<T>` 的其他功能除此以外，既没有额外的性能开销，也没有额外的运行时检查——它是 Rust 智能指针家族中最"干净"的成员。

# 练习题

## 测验

```quiz single
Q: 为什么直接定义 `enum List { Cons(i32, List), Nil }` 无法编译？
+ 因为编译器在计算 List 的大小时会陷入无限递归，无法得出结论。
- 因为枚举不能有多个成员。
- 因为 i32 类型不能放在枚举里。
- 因为枚举不支持递归。
E: Rust 需要在编译时确定所有类型的大小，递归类型让这个计算永远无法终止。
```

```quiz single
Q: `Box<T>` 如何解决递归类型的大小问题？
- 它会自动压缩数据使其变小。
+ 它将"存储值本身"转变为"存储一个固定大小的指针"，指针大小在编译时总是已知的。
- 它让类型变成动态大小。
- 它在运行时动态计算大小。
E: 无论指针指向的数据有多大，指针本身的大小（如 8 字节）在编译时永远是固定的。
```

```quiz multi
Q: 以下哪些是使用 `Box<T>` 的合理场景？
+ 需要转移大量数据的所有权而不触发昂贵的数据拷贝时。
+ 需要在编译时大小未知的递归数据结构中。
+ 希望持有一个实现了特定 Trait 的任意类型（Trait 对象）时。
- 需要在多个位置共享同一数据的所有权时。
E: 多所有权需要 Rc<T>，而不是 Box<T>。Box<T> 仍然是单一所有者。
```

```quiz single
Q: `Box<T>` 离开作用域时会发生什么？
+ 自动释放栈上的指针和堆上指向的数据（通过 Drop Trait）。
- 仅释放栈上的指针，堆上的数据保留。
- 发生 Panic。
- 什么都不发生，需要手动释放。
E: Box<T> 实现了 Drop Trait，离开作用域时会自动清理堆内存，不需要手动 free。
```

```rust
fn main() {
    let x = Box::new(5);
    let y = x;
    println!("{}", x); // 使用 x
}
```

```quiz single
Q: 以上代码能否编译？
+ 不能编译，x 的所有权已移动给 y，x 不再有效。
- 不能编译，Box 不能存放整数。
- 能编译，整数实现了 Copy。
- 能编译，Box 会自动克隆。
E: Box<T> 不实现 Copy，赋值操作会移动所有权。x 被移动给 y 后就失效了。
```
