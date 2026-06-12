---
title: "什么是所有权"
description: "理解 Rust 所有权的三条核心规则、变量作用域与 String 类型，以及所有权与可变性之间的区别。"
difficulty: intermediate
estimatedTime: 25
keywords: ["所有权", "作用域", "String", "drop", "可变性", "let mut", "遮蔽"]
---

# 核心思想

## 什么是所有权系统

**所有权系统**是 Rust 用来管理内存的核心机制。它的基本思想很简单：**每个值都有一个所有者负责它的生命周期**。

这听起来抽象，但解决的是一个现实问题：

在其他编程语言中：
- **Java/Python**：用垃圾回收器（GC）自动清理，但有运行时开销，暂停不可控
- **C/C++**：程序员手动管理内存（`malloc`/`free`），容易出现内存泄漏、悬垂指针、二次释放等 bug

Rust 的答案是：**在编译时通过静态分析，让编译器确保只有一个所有者负责释放每个值，从而零运行时开销地保证内存安全**。

## 三条黄金规则

所有权系统的核心思想只有三条规则。理解它们，一切都能推导出来：

**规则一**：__Rust 中每一个值都有一个「所有者（owner）」变量。__

**规则二**：__值在任一时刻有且只有一个所有者。__

**规则三**：__当所有者离开作用域，这个值将被「自动丢弃（drop）」__

这三条规则一起工作，确保：
- ✓ 没有内存泄漏（规则三：自动清理）
- ✓ 没有二次释放（规则二：只有一个所有者）
- ✓ 没有悬垂指针（规则三：所有者消失时数据也消失）
- ✓ 零运行时开销（规则一：编译期静态检查）

# 规则详解

## 规则一与二：所有者与单一性

### 问题背景：二次释放

先看一个问题。在 C 中，如果你不小心这样做：

```c
// C 语言中的问题
char* s1 = malloc(100);
char* s2 = s1;      // 两个指针指向同一块内存

free(s1);           // 释放一次
free(s2);           // 释放第二次 → 二次释放 bug！内存崩溃
```

或者在没有 GC 的环境中：

```
s1 指向堆上的数据 → s1 被释放了
s2 仍然指向那块内存 → s2 成了悬垂指针
访问 s2 → 使用已释放的内存 → 未定义行为
```

这是内存安全的大敌：**同一块内存被释放多次，或者被释放后还被访问**。

### Rust 的解决方案

Rust 通过规则一和规则二直接禁止这种情况：

> **不允许两个变量同时有效地指向同一块堆数据**

如果一个变量要把数据的控制权交给另一个变量，那就**转移所有权**——原变量失效，新变量成为唯一的所有者。这样：
- ✓ 永远只有一个所有者，只释放一次
- ✓ 原变量失效后无法访问，不存在悬垂指针
- ✓ 编译器在编译期就检查这一点，运行时零开销

看具体例子：

每个值都需要一个"主人"来负责它，而且只能有一个主人。当主人改变时，所有权就转移了：

```rust runnable
fn main() {
    let s1 = String::from("hello");  // s1 拥有这个 String

    let s2 = s1;                      // 所有权转移给 s2
                                      // 现在 s2 是主人，s1 失效了

    println!("{}", s2);               // ✓ 可以，s2 拥有数据
    // println!("{}", s1);            // ✗ 错误，s1 已失效
}
```

**这里发生了什么**：
- `s1` 原本拥有 String 数据的所有权
- `let s2 = s1` 执行时，所有权转移给 `s2`
- `s1` 从这一刻起**失效**了（Rust 编译器禁止访问，因此也不能再通过它去做释放了）
- 只有 `s2` 可以访问数据，作用域结束时 `s2` 负责释放

**为什么 `s1` 会失效**？因为 `String` 存在堆上，有释放的成本。Rust 不允许两个变量同时指向同一块堆数据，否则就回到了"谁来释放"的问题上。

**栈类型是个例外**。整数这样的小数据存在栈上，复制成本极低，Rust 自动为它们复制而不是移动（可以再回忆下上一篇文章讲的三种数据流动方式）：

```rust runnable
fn main() {
    let x = 5;
    let y = x;              // 自动复制

    println!("x={}, y={}", x, y);  // ✓ 两个都有效
}
```

## 规则三：作用域与自动释放

当一个变量离开作用域，它的值自动被释放（drop）。这就是 Rust 不需要手动 `free` 的原因（因此避免了手动释放的安全风险）：

```rust runnable
fn main() {
    {
        let s = String::from("hello");  // s 从这里开始有效
        println!("{}", s);
    }  // s 离开作用域，Rust 自动调用 drop，堆内存被释放

    // s 已不存在，访问会报错
}
```

对比其他语言：
- Java：GC 在某个时间点清理（时机不确定）
- C：需要手动 `free`（容易忘记）
- Rust：作用域结束立即释放（确定且无开销）

# 所有权转移

## 什么是所有权转移？

前面讲了三条所有权规则，但有个关键概念还没深入：**当一个值从一个所有者转到另一个所有者时会发生什么**？

这就是**所有权转移**（move）——一个值的所有权从一个变量转移到另一个变量。这是 Rust 实现规则二（"值在任一时刻有且只有一个所有者"）的核心机制。

## 为什么要理解所有权转移？

回顾前面讲过的：
- **规则二** 说：一个值永远只能有一个所有者
- 这意味着：**当多个变量都想"拥有"同一个值时，Rust 不允许**
- Rust 的解决方案：**让原所有者失效，新变量成为唯一的所有者**

所有权转移就是这个"转移"过程。理解它，才能理解 Rust 如何在编译期保证内存安全。

---

**核心原则**：只要一个值被"消费"了（被移动到新的所有者），所有权就转移。原所有者从此失效。这发生在以下场景：

## 场景一：赋值

```rust runnable
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;  // s1 的所有权转移给 s2

    println!("{}", s2);  // ✓ 可以
    // println!("{}", s1);  // ✗ 错误：s1 已失效
}
```

## 场景二：函数传参

```rust runnable
fn main() {
    let s = String::from("hello");
    takes_ownership(s);  // s 的所有权转移到函数内
    // println!("{}", s);  // ✗ 错误：s 已失效
}

fn takes_ownership(s: String) {
    println!("{}", s);
}  // s 离开作用域，堆内存释放
```

## 场景三：函数返回

```rust runnable
fn main() {
    let s1 = gives_ownership();  // 函数返回的 String 所有权转给 s1
    println!("{}", s1);
}

fn gives_ownership() -> String {
    let s = String::from("yours");
    s  // 返回 s，所有权转移给调用者
}
```

## 其他场景

模式匹配、match 表达式、for 循环、闭包捕获等也都会转移所有权：

```rust runnable
fn main() {
    // 模式匹配
    let s = String::from("hello");
    let (a, b) = ("x", s);  // s 的所有权转移到模式中

    // match 表达式
    match b {
        _ => println!("{}", b),  // b 被消费
    }
    // println!("{}", b);  // ✗ 错误：b 已失效

    // for 循环
    let vec = vec![1, 2, 3];
    for item in vec {  // vec 的所有权被转移到迭代器
        println!("{}", item);
    }
    // println!("{:?}", vec);  // ✗ 错误：vec 已失效
}
```

## 注意：Copy 类型不转移所有权

**并非所有类型都会转移所有权！** 对于栈类型（整数、布尔等），Rust 会自动复制而不是转移：

```rust runnable
fn main() {
    // 赋值时复制
    let x = 5;
    let y = x;  // 自动复制，不转移所有权
    println!("x={}, y={}", x, y);  // ✓ 两个都有效

    // 函数传参时复制
    let a = 42;
    print_number(a);  // 自动复制，a 仍有效
    println!("a={}", a);  // ✓ 有效

    // 函数返回时复制
    let b = get_number();  // 自动复制
    println!("b={}", b);
}

fn print_number(x: i32) {
    println!("{}", x);
}

fn get_number() -> i32 {
    42  // 自动复制给调用者
}
```

**为什么**？因为这些类型实现了 `Copy` 特征——它们存在栈上，复制成本极低，所以 Rust 默认复制而不转移。也就是说之前讲解过的三种数据流动形式中只有 Move 才会进行所有权转移。

---

## 对比：String vs i32

看一个更清晰的对比：

```rust runnable
fn main() {
    // String：堆类型，转移所有权
    let s1 = String::from("hello");
    let s2 = s1;
    // println!("{}", s1);  // ✗ s1 已失效

    // i32：栈类型，自动复制
    let n1 = 42;
    let n2 = n1;
    println!("n1={}, n2={}", n1, n2);  // ✓ 都有效
}
```

| | String（堆） | i32（栈） |
|---|---|---|
| `let b = a` | 转移所有权，a 失效 | 复制值，a 仍有效 |
| `func(a)` | 转移所有权，a 失效 | 复制值，a 仍有效 |
| `return a` | 转移所有权给调用者 | 复制值给调用者 |

这样虽然工作，但对于堆类型频繁地"传进去再返回"很烦。Rust 提供了更优雅的方案——**引用**（下一篇的主题）。

# 所有权的误区

初学者容易混淆的几个概念，这里集中澄清。

## 所有权 ≠ 可变性

**拥有一个值，不等于可以修改它。** 这两个维度完全独立：

- **所有权**：谁负责释放内存
- **可变性**：是否允许修改数据（由 `let mut` 控制）

```rust runnable expect-error
fn main() {
    let s = String::from("hello");
    s.push_str(", world!");  // ✗ 错误：s 不可变
}
```

```rust runnable
fn main() {
    let mut s = String::from("hello");
    s.push_str(", world!");  // ✓ 可以：s 既拥有所有权，又可变
    println!("{}", s);
}
```

**关键点**：
- 不可变所有者 (let) 可以转移所有权给可变所有者 (let mut)，反之亦然
- `mut` 只影响"能否改"，不影响"谁来释放"

## let x = val 与 let x = new_val

Rust 中叫 `let` **绑定**而不叫"赋值"，是因为它可以创建新变量：

```rust runnable
fn main() {
    let x = 5;
    let x = 10;      // 这是"遮蔽"（shadowing）：创建新的 x
    println!("{}", x);  // 10

    let y = 5;
    // y = 10;       // ✗ 错误：普通 let 不能重新赋值
}
```

```rust runnable
fn main() {
    let mut y = 5;
    y = 10;          // ✓ 可以：重新赋值到同一个变量
    println!("{}", y);  // 10
}
```

| | `let x = new_val`（遮蔽） | `x = new_val`（赋值） |
|---|---|---|
| 创建新变量 | ✓ 是 | ✗ 否 |
| 可改类型 | ✓ 可以 | ✗ 不行 |
| 需要声明 mut | ✗ 不需要 | ✓ 需要 |

遮蔽很实用——比如把 `String` 解析成 `usize` 后用同一个名字，不需要起 `s_str`、`s_num` 这样的名字：

```rust runnable
fn main() {
    let input = "42";           // &str 类型
    let input = input.len();    // usize 类型，遮蔽原来的 input
    println!("{}", input);      // 2
}
```

## String vs &str：两种字符串类型

Rust 有两种字符串，所有权模式完全不同：

```rust runnable
fn main() {
    let lit = "hello";          // 字符串字面量，类型是 &str
    let owned = String::from("hello");  // String 类型

    // 都可以打印，但内存模型不同
    println!("{}", lit);
    println!("{}", owned);
}
```

| 特性 | `&str`（字面量） | `String`（所有者） |
|---|---|---|
| **存储位置** | 程序只读数据区 | 堆上 |
| **大小** | 编译时固定 | 运行时可变 |
| **所有权** | 无（引用） | 拥有（负责释放） |
| **可变性** | 不可变 | 可变（需 `mut`） |

**核心区别**：
- `&str` 是对现有数据的**引用**，不拥有数据，不需要释放
- `String` **拥有**堆上的数据，离开作用域时自动释放

这就是为什么 `String` 需要所有权管理，而 `&str` 不需要。

# 练习题

## 所有权规则测验

```rust
fn main() {
    let s1 = String::from("rust");
    let s2 = s1;
    println!("{}", s1);
}
```

```quiz single
Q: 上面的代码会怎样？
+ 编译错误：s1 的所有权已转移给 s2
- 输出 "rust"：s1 和 s2 都有效
- 运行时 panic
- 需要加 `let mut s1` 才能运行
E: String 不是 Copy 类型，`let s2 = s1` 发生移动。s1 失效后无法使用，Rust 在编译期就捕获了这个错误。
```

## 所有权与可变性的独立性

```rust
fn main() {
    let x = 5;      // 不可变，但拥有所有权
    let mut y = x;  // 可变，且获得了 x 的值
    y = 10;
    // 如果 x 也能用，能改吗？
}
```

```quiz single
Q: 关于所有权和可变性，正确的说法是？
- 拥有所有权就必须是 mut 的
+ 所有权和可变性独立，can both vary independently
- 转移所有权后新所有者自动变成 mut
- 只有 mut 变量才能转移所有权
E: 所有权（谁负责释放）和可变性（能否修改）是两个完全独立的维度。一个不可变变量可以转移所有权给可变变量，反之亦然。
```

## Copy vs Move

```rust
fn main() {
    let a = 42;
    let b = a;
    let s1 = String::from("hi");
    let s2 = s1;
}
```

```quiz multi
Q: 下列说法正确的有（多选）：
+ a 和 b 都是有效的（i32 是 Copy 类型）
+ s2 有效，s1 无效（String 发生移动）
- s1 和 s2 都有效
- a 和 b 一样，都是无效的
E: i32 实现了 Copy 特征，自动复制不会让 a 失效。String 没有 Copy 实现，赋值时发生移动，s1 的所有权转给 s2，s1 失效。
```

## 编程练习：修复所有权错误

下面的代码有所有权错误，请修复它，使输出为 `s1 = hello, s2 = hello`。

```rust editable
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    println!("s1 = {}, s2 = {}", s1, s2);
}
```

```expected
s1 = hello, s2 = hello
```

**提示**：想想上一章讲过的"三种数据流动方式"，怎样才能让 s1 和 s2 都有效？

---

下面的函数调用导致 s 无法使用，请修改 main 函数使 s 在调用后仍然有效并打印。

```rust editable
fn print_string(s: String) {
    println!("函数内：{}", s);
}

fn main() {
    let s = String::from("hello");
    print_string(s);
    println!("函数外：{}", s);  // 目前这行会报错
}
```

```expected
函数内：hello
函数外：hello
```

**提示**：不修改 print_string 函数，只修改 main 函数。想想怎样在传参时不转移所有权？
