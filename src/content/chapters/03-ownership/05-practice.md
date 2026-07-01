---
title: "综合练习"
description: "综合检验对所有权、移动、拷贝、借用、引用和切片的理解，包含代码判断题与编程练习。"
difficulty: intermediate
estimatedTime: 45
keywords: ["所有权", "移动", "借用", "引用", "切片", "Copy", "Clone"]
---

# 所有权与移动

## 赋值后的 String

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    println!("{}", s1);
}
```

```quiz single
Q: 上面的代码能编译通过吗？
- 能，s2 只是 s1 的别名，s1 仍然有效
+ 不能，s1 的所有权已移动给 s2，s1 不再有效
- 能，s1 和 s2 现在各有一份 "hello"
- 不能，需要先声明 let mut s1 才能赋值给 s2
E: String 不是 Copy 类型，let s2 = s1 发生移动（move），s1 失效。之后访问 s1 会产生 "use of moved value" 编译错误。如果需要两份独立的数据，应使用 s1.clone()。
```

## 哪些类型是 Copy

```quiz multi
Q: 下列哪些类型是 Copy 类型，赋值后原变量仍然有效？（多选）
+ f64
- Vec<i32>
+ i32
+ (i32, bool)
+ char
- String
+ bool
E: 存储在栈上、大小编译期已知的基础类型都实现了 Copy：整数、浮点、布尔、字符，以及所有字段均为 Copy 的元组。String 和 Vec<i32> 需要在堆上分配内存，是移动语义类型。
```

## clone() 做了什么

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone();
    println!("s1={}, s2={}", s1, s2);
}
```

```quiz single
Q: 调用 .clone() 之后，下列说法正确的是？
- s1 和 s2 指向堆上同一块内存
+ s1 和 s2 各自拥有独立的堆内存，互不影响
- clone() 对 String 来说等同于普通赋值（移动）
- s1 失效，只有 s2 有效
E: .clone() 执行深拷贝：在堆上创建一份新的字符串数据，s2 拥有这份新数据，s1 仍然拥有原来的数据。两者独立，修改其中一个不影响另一个。clone() 是显式操作，提醒你"这里有堆内存复制的成本"。
```

## 函数消耗所有权

```rust
fn consume(s: String) -> usize {
    s.len()
}

fn main() {
    let s = String::from("hello");
    let n = consume(s);
    println!("{} {}", n, s);
}
```

```quiz single
Q: 上面的代码能编译通过吗？
- 能，函数调用不影响原变量的所有权
- 不能，函数的返回类型必须和参数类型一致
- 能，consume 返回了 usize，所以 s 还在
+ 不能，s 的所有权在调用 consume(s) 时被移入函数，之后 s 无效
E: 向函数传参等同于赋值——String 类型会发生移动。s 的所有权转移给了 consume 的参数，函数结束时 s 在函数内被 drop。之后在 println! 中再次使用 s 会报错。如果不想失去所有权，应该传 &s（引用）。
```

## 变量何时被释放

```rust
fn main() {
    let x = 5;
    {
        let y = String::from("hello");
        println!("{} {}", x, y);
    }
    println!("{}", x);
}
```

```quiz single
Q: 变量 y 在何时被 drop（释放内存）？
+ y 所在的内层花括号结束时（第 6 行的 }）
- 变量离开作用域时，但 x 的释放顺序在 y 之前
- println! 使用完 y 之后立刻释放
- 整个 main 函数结束时
E: Rust 在变量离开作用域（最近的那层花括号结束）时自动调用 drop 释放内存。y 在内层块的 } 处被释放，而 x 在 main 函数结束时释放。这是所有权规则第三条的直接体现。
```

# 借用与切片

## NLL 与借用范围

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;
    let r2 = &s;
    println!("{} {}", r1, r2); // r1、r2 最后一次使用在这里

    let r3 = &mut s;
    r3.push_str(" world");
    println!("{}", r3);
}
```

```quiz single
Q: 上面的代码能编译通过吗？
- 不能，同一作用域内不能同时出现不可变引用和可变引用
+ 能，r1 和 r2 在 println! 之后就不再使用，NLL 判断借用已结束，r3 可以创建
- 能，但运行时会 panic
- 不能，r1 和 r2 要到块结束才失效，r3 不能创建
E: Rust 的非词法作用域生命周期（NLL）让引用的有效范围到最后一次使用处为止，而不是到块的结尾。r1 和 r2 在第一个 println! 后不再被使用，它们的借用在那里结束。因此创建 r3 时不存在冲突，代码可以编译。
```

## 不可变与可变引用共存

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &s;
    let r2 = &mut s;
    println!("{} {}", r1, r2);
}
```

```quiz single
Q: 上面的代码能编译通过吗？
+ 不能，r1 的不可变借用仍然活跃时，不能创建可变引用 r2
- 能，但只有在不同线程中使用才会有问题
- 能，r1 是不可变的，r2 是可变的，类型不同所以没冲突
- 不能，但只要把 r1 改成 let mut r1 就可以了
E: 借用规则：不可变引用和可变引用不能同时活跃。r1 在 println! 中还被用到，所以它的借用在 r2 创建时仍然有效。要修复这段代码，可以把 println!("{}", r1) 移到 let r2 之前，让 r1 先用完。
```

## 返回局部变量的引用

```rust
fn make_greeting() -> &String {
    let s = String::from("hello");
    &s
}
```

```quiz single
Q: 上面的函数有什么问题？
- 只需要加 mut 就能修复
- 没有问题，返回引用是合法操作
+ s 在函数结束时被释放，返回 &s 会产生悬垂引用（指向已释放的内存）
- 需要将 &String 改成 &str 就可以了
E: s 是局部变量，函数结束时 s 被 drop，其占用的堆内存被释放。返回 &s 意味着调用者拿到的引用指向不再有效的内存——这就是悬垂引用。Rust 编译器在编译期就阻止这种情况。正确做法是直接返回 String（转移所有权），而不是返回引用。
```

## 切片的类型

```rust
fn main() {
    let s = String::from("hello world");
    let word = &s[6..11];
    println!("{}", word);
}
```

```quiz single
Q: 变量 word 的类型是什么？
- str
+ &str
- &String
- String
E: 对 String 取切片（&s[6..11]）得到的是 &str 类型——字符串切片。&str 存储一个指向数据起始位置的指针和切片的长度，不拥有数据。字符串字面量（如 "hello"）的类型也是 &str，它们是同一种类型。
```

## &str 还是 &String

```quiz single
Q: 下列关于函数参数类型的说法，正确的是？
- 参数用 &String 更好，因为能保证调用者传的是真正的 String 对象
- &String 和 &str 完全等价，可以随意互换
+ 参数用 &str 更通用，既能接受 &String（自动转换），也能接受字符串字面量
- 参数用 &str 会导致性能下降，因为需要额外的类型转换
E: &String 只能接受 String 的引用；而 &str 可以接受字符串字面量（本身就是 &str）和 &String（会自动进行隐式转换）。因此函数只需要读字符串时，参数类型写 &str 更灵活、更通用，这是 Rust 的惯用法。
```

# 编程练习

## 练习 1：修复所有权错误

下面的函数在打印名字后，`main` 中无法再使用 `name`。请修改函数签名（及调用方式），让 `main` 在调用后仍能使用 `name`：

```rust editable
fn greet(name: String) {
    println!("Hello, {}!", name);
}

fn main() {
    let name = String::from("Alice");
    greet(name);
    println!("Nice to meet you, {}!", name); // 目前这行会报错
}
```

```expected
Hello, Alice!
Nice to meet you, Alice!
```

## 练习 2：修复借用冲突

下面的代码在持有不可变引用时尝试修改字符串，导致编译错误。请在**不删除任何 `println!`** 的前提下，仅调整代码顺序使其通过编译：

```rust editable
fn main() {
    let mut sentence = String::from("hello");

    let first = &sentence;
    sentence.push_str(" world"); // 错误：存在不可变引用时不能修改

    println!("first snapshot: {}", first);
    println!("full sentence: {}", sentence);
}
```

```expected
first snapshot: hello
full sentence: hello world
```

## 练习 3：实现字符计数函数

请实现 `count_char` 函数，统计字符串中某个字符出现的次数：

```rust editable
fn count_char(s: &str, target: char) -> usize {
    // TODO：遍历 s 中的每个字符，统计与 target 相等的个数
    0
}

fn main() {
    println!("{}", count_char("hello world", 'l')); // 3
    println!("{}", count_char("rust programming", 'r')); // 3
    println!("{}", count_char("abcabc", 'a'));            // 2
}
```

```expected
3
3
2
```

## 练习 4：修复可变引用错误

下面的函数想通过引用将数值加一，但使用了不可变引用。请修复函数签名和调用处，使程序正确输出：

```rust editable
fn add_one(n: &i32) {
    *n += 1; // 错误：不能通过不可变引用修改值
}

fn main() {
    let mut count = 0;
    add_one(&count);
    add_one(&count);
    add_one(&count);
    println!("count = {}", count);
}
```

```expected
count = 3
```

## 练习 5：实现切片最大值函数

请实现 `max_in_slice` 函数，返回整数切片中的最大值。函数应接受任意长度的切片（完整数组或其中一段）：

```rust editable
fn max_in_slice(numbers: &[i32]) -> i32 {
    // TODO：找出切片中的最大值并返回
    // 提示：可以先假设第一个元素是最大值，然后逐个比较
    0
}

fn main() {
    let arr = [3, 1, 4, 1, 5, 9, 2, 6];
    println!("{}", max_in_slice(&arr));        // 9
    println!("{}", max_in_slice(&arr[..4]));   // 4
    println!("{}", max_in_slice(&arr[4..]));   // 9
}
```

```expected
9
4
9
```
