---
title: "什么是所有权"
description: "理解 Rust 所有权的三条核心规则、变量作用域与 String 类型，以及所有权与可变性之间的区别。"
difficulty: intermediate
estimatedTime: 25
keywords: ["所有权", "作用域", "String", "drop", "可变性", "let mut", "遮蔽"]
---

# 所有权的核心问题

先从一个根本的问题开始：**如何管理内存？**

在其他语言中：
- **Java/Python**：垃圾回收器（GC）自动清理，但有运行时开销
- **C/C++**：程序员手动 `malloc`/`free`，容易出 bug
- **Rust**：编译器在编译时检查所有权，零运行时开销

Rust 的方案是：**一个值在任何时刻都只有一个所有者负责释放它**。这样就杜绝了最常见的内存安全问题——二次释放（double free）。

# 三条黄金规则

所有权只有三条规则。理解它们，一切都能推导出来：

> **规则一**：Rust 中每一个值都有一个**所有者**（owner）变量。
>
> **规则二**：值在任一时刻有且只有一个所有者。
>
> **规则三**：当所有者离开作用域，这个值将被**自动丢弃**（drop）。

让我们通过例子逐条理解。

# 规则一与二：所有者与单一性

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

为什么 `s1` 会失效？因为 `String` 存在堆上，有释放的成本。Rust 不允许两个变量同时指向同一块堆数据，否则谁来释放就无法确定了。

**栈类型是个例外**。整数这样的小数据存在栈上，复制成本极低，Rust 自动为它们复制而不是移动：

```rust runnable
fn main() {
    let x = 5;
    let y = x;              // 自动复制

    println!("x={}, y={}", x, y);  // ✓ 两个都有效
}
```

# 规则三：作用域与自动释放

当一个变量离开作用域，它的值自动被释放（drop）。这就是 Rust 不需要手动 `free` 的原因：

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

# 所有权与函数

函数调用时，传参和返回都涉及所有权转移。理解这点很关键：

## 传参时的所有权转移

```rust runnable
fn main() {
    let s = String::from("hello");
    takes_ownership(s);      // s 的所有权转移到函数内
                             // s 之后无效
    // println!("{}", s);    // ✗ 错误

    let x = 5;
    makes_copy(x);           // i32 实现了 Copy，自动复制
    println!("x={}", x);     // ✓ x 仍然有效
}

fn takes_ownership(s: String) {
    println!("{}", s);
}  // s 离开作用域，堆内存释放

fn makes_copy(x: i32) {
    println!("{}", x);
}  // x 离开作用域，但栈数据自动清理，无需特殊处理
```

## 返回值的所有权转移

函数也可以通过返回值转移所有权：

```rust runnable
fn main() {
    let s1 = gives_ownership();  // 函数返回的所有权转给 s1
    println!("{}", s1);
}

fn gives_ownership() -> String {
    let s = String::from("yours");
    s  // 返回 s，所有权转移给调用者
}
```

这样虽然工作，但频繁地"传进去再返回"很烦。Rust 提供了更优雅的方案——**引用**（下一篇的主题）。

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
