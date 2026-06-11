---
title: "什么是所有权"
description: "理解 Rust 所有权的三条核心规则、变量作用域与 String 类型，以及所有权与可变性之间的区别。"
difficulty: intermediate
estimatedTime: 25
keywords: ["所有权", "作用域", "String", "drop", "可变性", "let mut", "遮蔽"]
---

# 所有权规则

Rust 最与众不同的特性就是**所有权**（ownership）系统。它不像 Java/Python 那样靠垃圾回收器（GC）清理内存，也不像 C/C++ 那样靠程序员手动 `malloc`/`free`——而是由编译器在编译时根据一套规则进行检查，不符合规则就报错，绝不让这类 bug 进入运行时。

## 三条黄金规则

在 Rust 里，所有权只有三条规则，记住它们，后面的一切都能从这里推导：

> **规则一**：Rust 中每一个值都有一个**所有者**（owner）变量。
>
> **规则二**：值在任一时刻有且只有一个所有者。
>
> **规则三**：当所有者（变量）离开作用域，这个值将被**自动丢弃**（drop）。

这三条规则是 Rust 内存安全的基石。下面我们逐一展开。

## 变量作用域

"作用域"就是变量有效的那段代码范围。当变量进入作用域，它就"活了"；当它离开作用域，Rust 会自动释放它占用的资源。

```rust runnable
fn main() {
    {
        let s = String::from("hello"); // s 从这里开始有效
        println!("{}", s);
    } // s 在这里离开作用域，Rust 自动调用 drop，内存被释放

    // 这里访问 s 会报错，s 已经不存在了
}
```

对比其他语言：Java 有 GC，你不用管；C 需要手动 `free`，很容易忘。Rust 是"离开作用域就自动释放"——既不需要你操心，也没有运行时开销。

## 为什么需要所有权规则

先看一个问题：如果两个变量同时指向同一块堆内存，当它们都离开作用域，谁来释放内存？如果都释放，就会发生**二次释放**（double free）——这是一个严重的内存安全 bug。

Rust 的答案是：**不允许这种情况发生**。所有权规则从根本上杜绝了这个问题，具体机制见本章概览中"移动、拷贝与克隆"一节。

## String 类型与堆内存

字符串字面量（`"hello"`）存在程序的只读数据区，大小固定，无法修改。`String` 类型则存在堆上，大小可以动态变化：

```rust runnable
fn main() {
    let mut s = String::from("hello");
    s.push_str(", world!"); // 可以追加内容
    println!("{}", s);
}
```

`String` 由三部分组成（全部存在栈上）：

- **ptr**：指向堆上内容的指针
- **len**：当前内容长度（字节数）
- **capacity**：已分配的总容量

真正的字符串内容在堆上，通过 `ptr` 访问。理解这个结构，是理解移动语义的关键（详见本章概览）。

## 所有权与函数

函数调用也遵循同样的规则——传参相当于赋值：

```rust runnable
fn main() {
    let s = String::from("hello");
    takes_ownership(s); // s 的所有权移入函数，s 之后无效

    let x = 5;
    makes_copy(x); // i32 是 Copy 类型，x 仍然有效
    println!("x = {}", x);
}

fn takes_ownership(some_string: String) {
    println!("{}", some_string);
} // some_string 离开作用域，drop 被调用，内存释放

fn makes_copy(some_integer: i32) {
    println!("{}", some_integer);
} // some_integer 离开作用域，但无需特殊处理
```

函数返回值同样可以转移所有权：

```rust runnable
fn main() {
    let s1 = gives_ownership(); // 函数的返回值所有权移给 s1
    println!("{}", s1);
}

fn gives_ownership() -> String {
    let s = String::from("yours");
    s // 返回 s，所有权转移给调用者
}
```

每次都要"传进去再返回"确实有点烦。Rust 提供了更优雅的解决方案——引用（reference），这是下一篇文章的主题。

# 概念辨析

初学者在下面这几对概念上最容易卡住。这一节专门把它们放在一起对比，帮你彻底区分清楚。

## 所有权 vs 可变性：两个独立维度

这是最常见的误区：**拥有一个值，不等于可以修改它**。Rust 里有两个相互独立的维度：

- **所有权**：谁"拥有"这个值（决定谁负责在作用域结束时释放内存）
- **可变性**：这个变量绑定是否允许修改（由 `let mut` 控制）

看这个对比：

```rust runnable expect-error
fn main() {
    let s = String::from("hello"); // 拥有所有权，但不可变
    s.push_str(", world!");        // 错误：s 不是 mut 的
}
```

```rust runnable
fn main() {
    let mut s = String::from("hello"); // 拥有所有权，且可变
    s.push_str(", world!");
    println!("{}", s);
}
```

**结论**：所有权决定"谁来清理"，可变性决定"能不能改"，二者相互独立。加了 `mut` 不影响所有权规则；转移了所有权不影响是否可变（新所有者可以重新声明为 `mut`）。

## let 绑定 vs 变量遮蔽

Rust 里叫**绑定**（binding）而不叫"赋值"，是有原因的：

```rust runnable
fn main() {
    let x = 5;
    let x = 10; // 这是"遮蔽"（shadowing），创建了新的 x，旧的 x 消失
    println!("{}", x); // 10
}
```

```rust runnable
fn main() {
    let mut x = 5;
    x = 10; // 这是真正的"重新赋值"，修改同一个变量
    println!("{}", x); // 10
}
```

两者看起来相似，但机制不同：

| | `let x = 10`（遮蔽） | `x = 10`（赋值） |
|---|---|---|
| 是否创建新变量 | 是，创建新变量 | 否，修改原变量 |
| 能否改变类型 | **能**，类型可以不同 | 不能，类型必须一致 |

遮蔽在实践中很有用——比如把 `String` 解析成 `usize` 后用同一个名字继续使用，不需要起 `x_str`、`x_num` 这样的名字：

```rust runnable
fn main() {
    let spaces = "   ";        // &str 类型
    let spaces = spaces.len(); // usize 类型，遮蔽了上面的 spaces
    println!("{}", spaces);    // 3
}
```

## String vs &str：两种字符串

这是另一个让初学者困惑的地方：

```rust runnable
fn main() {
    let s1: &str = "hello";                    // 字符串字面量，类型是 &str
    let s2: String = String::from("hello");    // 堆上字符串，类型是 String
    println!("{} {}", s1, s2);
}
```

| | `&str` | `String` |
|---|---|---|
| 存储位置 | 程序只读数据区（编译时确定） | 堆上（运行时分配） |
| 大小 | 固定（编译时已知） | 可动态增长 |
| 可变性 | 不可变 | 可变（需要 `let mut`） |
| 是否拥有数据 | 否，是对数据的引用 | 是，负责释放堆内存 |

`&str` 是对某段字符串数据的**引用**，自身不拥有数据；`String` 拥有堆上的数据，负责在 drop 时释放。

# 练习题

## 所有权规则测验

```quiz single
Q: 下面哪一项是 Rust 所有权的规则？
- 每个值可以有多个所有者，但只有一个可以修改它
- 当所有者离开作用域，值必须手动调用 free 释放
+ 值在任一时刻有且只有一个所有者
- 所有值都存储在堆上，由垃圾回收器管理
E: 所有权三条规则之一：值在任一时刻有且只有一个所有者。Rust 不用 GC，也不靠手动释放，而是在所有者离开作用域时自动调用 drop。
```

## 所有权与可变性测验

```quiz single
Q: 关于所有权和可变性，下列说法正确的是？
- 所有者默认可以修改自己拥有的值
- 只有 mut 变量才能转移所有权
+ 所有权和可变性是两个独立的概念，互不影响
- 移动所有权后，新所有者的可变性与原变量相同
E: 所有权决定"谁负责释放内存"，可变性（mut）决定"是否允许修改"，这两个维度完全独立。不可变变量（let）可以把所有权转移给 let mut 变量，反之亦然。
```

## 概念辨析测验

```quiz single
Q: let x = 5; let x = "hello";（变量遮蔽）和 let mut x = 5; x = "hello"; 相比，主要区别是？
+ 遮蔽可以改变变量类型，重新赋值不能改变类型
- 两者完全等价，只是写法不同
- 遮蔽会导致原来的 5 无法访问，重新赋值不会
- 重新赋值更高效，因为不需要创建新变量
E: let x = "hello" 创建了一个新的 x，类型可以是任意类型（这里从 i32 变成了 &str）；而 x = "hello"（重新赋值）要求新值与原变量类型一致，且 x 必须声明为 mut。遮蔽实际上创建了新变量，旧变量被"遮住"了。
```

```quiz single
Q: 关于 String 和 &str，下列说法正确的是？
- String 存在栈上，&str 存在堆上
- String 和 &str 都拥有字符串数据的所有权
+ String 拥有堆上数据的所有权，&str 是对字符串数据的引用
- &str 可以追加字符串内容，String 不行
E: String 是堆分配的，拥有数据并负责在 drop 时释放；&str 是对已有字符串数据的引用（不拥有数据），不负责释放。字符串字面量 "hello" 的类型是 &str，存在程序的只读数据区。
```

## 编程练习

下面的代码有所有权错误，请修复它，使程序能够正确输出 `s1 = hello, s2 = hello`。

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

---

下面的函数接受一个 `String` 并打印，但调用后原变量就无法使用了。请修改 `main` 函数（**不修改 `print_string` 函数**），让 `s` 在调用后仍然有效并打印出来。

```rust editable
fn print_string(s: String) {
    println!("打印：{}", s);
}

fn main() {
    let s = String::from("hello");
    print_string(s);
    println!("s 仍然有效：{}", s); // 目前这行会报错
}
```

```expected
打印：hello
s 仍然有效：hello
```
