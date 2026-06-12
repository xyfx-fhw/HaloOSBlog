---
title: "内存与数据流动"
description: "理解栈与堆的区别，以及移动、拷贝与克隆三种数据交互方式的本质。"
difficulty: beginner
estimatedTime: 25
keywords: ["栈", "堆", "移动", "Copy", "Clone", "内存模型"]
---

# 内存基础：栈与堆

Rust 中的所有权系统根本上是在管理数据在内存中的位置和生命周期。要理解所有权，必须先知道栈（Stack）和堆（Heap）的区别。

## 栈（Stack）

栈用于存放函数调用的栈帧和那些**大小在编译期已知的小数据**（例如整数、布尔、固定大小的数组、指针元信息等）。栈的分配与释放遵循 LIFO（后进先出），速度很快且不需要运行时的分配器，但栈空间有限，无法直接保存运行时大小可变的数据。

<img src="/RustCourse/diagrams/stack.svg" alt="Stack diagram" style="max-width:100%;margin:1rem 0;" />

## 堆（Heap）

堆用于动态分配**大小不确定或较大的数据**（例如 `String`、`Vec<T>`、Box 指向的值等）。堆上的内存通过分配器（allocator）管理，分配/释放成本较高，且需要通过所有权或智能指针在程序中跟踪谁负责释放这块内存。

<img src="/RustCourse/diagrams/heap.svg" alt="Heap diagram" style="max-width:100%;margin:1rem 0;" />

## 栈与堆的配合：以 String 为例

栈存放**大小编译期已知**的数据，堆存放**大小运行时可变**的数据——但实际应用中，如果需要使用到堆，往往两者都要用到。让我们用 `String` 类型来看看它们如何配合：

```rust
fn main() {
    let s = String::from("hello");
    // s 是什么存在栈上？整个字符串内容在哪？
}
```

### String 的内存结构

`String` 在栈上只存**三个字**：

- **ptr**：指向堆上数据的指针
- **len**：当前字符串的字节数（这里是 5）
- **capacity**：堆上已分配内存能容纳的最大字节数（通常 ≥ len）

真正的字符数据 `"HelloWorld"` 存在**堆上**，通过 `ptr` 指针来访问。

<img src="/RustCourse/diagrams/string.svg" alt="String memory layout" style="max-width:100%;margin:1rem 0;" />

### from() 和 push_str() 做了什么

这两个操作涉及不同的内存变化：

```rust runnable
fn main() {
    let mut s = String::from("hello");
    println!("len: {}, capacity: {}", s.len(), s.capacity());

    s.push_str(", world!");
    println!("len: {}, capacity: {}", s.len(), s.capacity());
}
```

- **`String::from("hello")`**：
  - 从只读数据区读取字面量 `"hello"`
  - 在堆上分配新空间
  - 复制内容到堆上
  - 在栈上创建 String 结构体指向这块堆内存

- **`push_str(", world!")`**：
  - 检查当前容量是否足够
  - 若容量不足，重新在堆上分配更大的空间，移动旧数据过去
  - 追加新内容
  - 更新 len（容量 capacity 可能也会改变）

<img src="/RustCourse/diagrams/string_opration.svg" alt="String operations" style="max-width:100%;margin:1rem 0;" />

# 数据流动的三种方式

理解了栈与堆的区别，现在来看 Rust 里数据在变量之间"流动"时会发生什么。这是初学者最常卡住的地方——同样是 `let b = a` 这行代码，对整数和对 `String` 的行为截然不同。

## 移动（Move）

<img src="/RustCourse/diagrams/move.svg" alt="Heap diagram" style="max-width:100%;margin:1rem 0;" />

当你把一个 `String` 赋值给另一个变量时，发生了什么？

```rust runnable
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // s1 的所有权移动给 s2，s1 从这里开始无效
    println!("{}", s2);
}
```

Rust 把 `s1` 栈上的三元组（ptr, len, capacity）**拷贝**给了 `s2`，然后**让 `s1` 失效**——这个操作叫做**移动**（move）。注意：堆上的数据没有被复制，只是所有权换手了。

这样就解决了**二次释放**（double free）问题：现在只有 `s2` 是有效的，只有它离开作用域时才会释放内存。

下面这段代码无法编译——点"运行"看看错误信息长什么样：

```rust runnable expect-error
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;           // 所有权已转移给 s2
    println!("{}", s1);    // 错误：s1 已失效（moved）
}
```

## 拷贝（Copy）：栈类型的隐式复制

<img src="/RustCourse/diagrams/copy.svg" alt="Heap diagram" style="max-width:100%;margin:1rem 0;" />

整数、布尔、浮点、字符等类型存在栈上，大小固定，复制成本极低。Rust 对这类类型自动进行**按值复制**（copy），不会让原变量失效：

```rust runnable
fn main() {
    let x = 5;
    let y = x; // x 被复制，不是移动
    println!("x = {}, y = {}", x, y); // 两个都有效
}
```

实现了 `Copy` 特征的类型在赋值后原变量仍然有效。常见的 Copy 类型：

- 所有整数类型：`i32`、`u64` 等
- 浮点类型：`f32`、`f64`
- 布尔类型：`bool`
- 字符类型：`char`
- 元组，当所有字段都是 Copy 类型时，如 `(i32, bool)`

`String`、`Vec` 等堆分配类型**不是** Copy 类型，赋值时会发生移动。

## 克隆（Clone）：真正的深拷贝

<img src="/RustCourse/diagrams/clone.svg" alt="Heap diagram" style="max-width:100%;margin:1rem 0;" />

如果确实需要两份独立的数据，用 `.clone()`：

```rust runnable
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone(); // 堆上数据被完整复制
    println!("s1 = {}, s2 = {}", s1, s2); // 两个都有效
}
```

`.clone()` 是明显的"重操作"提示——堆内存被完整复制，会有性能开销。Rust 故意让这个操作显式，让你知道"这里有成本"。

## 三种方式对比

| 操作 | 发生条件 | 原变量是否失效 | 是否复制堆数据 |
|------|---------|--------------|------|
| **移动（Move）** | 堆分配类型赋值/传参 | ❌ 失效 | 否（只复制栈上元数据） |
| **复制（Copy）** | 栈类型（实现 Copy 特征） | ✅ 仍有效 | 不涉及堆数据 |
| **克隆（Clone）** | 显式调用 `.clone()` | ✅ 仍有效 | ✅ 是（深拷贝） |

```rust runnable
fn main() {
    // Copy 类型：赋值后双方都有效
    let a = 42_i32;
    let b = a;
    println!("a={}, b={}", a, b);

    // 移动类型：赋值后原变量失效
    let s1 = String::from("hello");
    let s2 = s1;
    println!("{}", s2); // s1 已失效，只能用 s2

    // 显式克隆：保留原变量，堆数据被完整复制
    let s3 = String::from("world");
    let s4 = s3.clone();
    println!("s3={}, s4={}", s3, s4);
}
```

## 快速判断

**判断一个类型是 Move 还是 Copy 的快捷方法**：
- 如果它需要在堆上分配内存（`String`、`Vec`、`Box` 等），通常是 Move
- 如果它只存在栈上（整数、浮点、布尔、char、小元组），通常是 Copy

> 使用`=`通常都是 Move 或者 Cpoy，如果要使用 Clone，通常都是调用.clone()的形式

## 移动 vs 浅拷贝

在其他语言里，"浅拷贝"只复制指针和元数据，不复制堆数据。Rust 的"移动"在底层做了同样的事，但额外做了一步：**让原变量无效**。

为什么叫"移动"而不是"浅拷贝"？因为移动强调的是**所有权的转移**——数据从一个所有者"流动"到了另一个所有者，而浅拷贝只描述了物理上复制了什么。Rust 的移动语义保证了内存安全：永远不会出现两个有效变量同时指向同一块堆数据。

# 练习题

## 移动与复制测验

```rust
fn main() {
    let x = 10;
    let y = x;
    println!("{}", x);
}
```

```quiz single
Q: 上面的代码能编译通过吗？为什么？
- 不能，因为 x 的所有权已经移动给 y，x 无效了
+ 能，因为 i32 实现了 Copy 特征，赋值时 x 被复制而非移动
- 能，但这是 bug，x 和 y 共享同一块内存
- 不能，因为没有使用 let mut
E: i32 是 Copy 类型，存在栈上，赋值时直接复制值。原变量 x 依然有效。只有堆分配类型（如 String）才会发生移动，导致原变量失效。
```

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    println!("{}", s1);
}
```

```quiz single
Q: 上面的代码会发生什么？
+ 编译错误：s1 的所有权已移动给 s2，s1 不再有效
- 运行时 panic：两个变量指向同一内存
- 正常运行，输出 "hello"
- 编译错误：需要加 let mut 才能赋值给 s2
E: String 不是 Copy 类型，let s2 = s1 发生移动，s1 失效。之后访问 s1 会产生 "use of moved value" 编译错误。Rust 在编译期就阻止了这类内存安全问题。
```

## Copy 类型测验

```quiz multi
Q: 下列哪些类型是 Copy 类型？（多选）
+ i32
+ bool
- String
+ f64
+ char
- Vec<i32>
E: 存储在栈上、大小固定的基础类型都是 Copy 类型：整数（i32、u64 等）、浮点（f32、f64）、布尔（bool）、字符（char）。String 和 Vec 需要在堆上分配内存，是移动语义类型，不是 Copy。
```
