---
title: "练习：所有权与借用"
description: "巩固所有权规则、移动、借用与生命周期的单选、多选与可编辑代码练习"
difficulty: intermediate
estimatedTime: 20
keywords: ["练习", "所有权", "借用", "移动"]
---

# 所有权规则

## 单选：所有者数量

```quiz single
Q: 在任一时刻，一个值可以有几个所有者？
- 0 个
+ 1 个
- 多个，由编译器自动协调
- 任意个，但需要手动同步
E: Rust 的核心规则之一：一个值在任一时刻只能有一个所有者。这是编译器保证内存安全的前提。
```

## 多选：值何时被 drop

```quiz multi
Q: 下列哪些情形会让值被自动 drop？
+ 所有者离开作用域
+ 所有者被赋值给另一个变量后原变量不再使用（发生移动）
- 程序调用 malloc
- 变量被标记为 const
E: Rust 在所有者离开作用域或所有权转移后会自动 drop；它没有 GC，也没有 `const` 与 drop 的直接关系。
```

## 编程题：修复移动后使用

下面的代码把 `s1` 的所有权移动给了 `s2`，然后又尝试使用 `s1`，会编译失败。请用 `clone()` 修复，使两行 `println!` 都能正常打印。

```rust editable
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    println!("{}", s1);
    println!("{}", s2);
}
```

```expected
hello
hello
```

# 借用与引用

## 单选：可变借用的独占性

```quiz single
Q: 对同一个值，在同一作用域内，下列哪种组合是合法的？
- 两个 `&mut T`
+ 一个 `&mut T`
- 一个 `&mut T` 与一个 `&T`
- 多个 `&mut T` 与一个 `&T`
E: 可变引用是独占的：在同一作用域内，同一值要么有任意多个不可变引用 `&T`，要么只有一个可变引用 `&mut T`，二者不能并存。
```

## 多选：引用的规则

```quiz multi
Q: 下列哪些说法是正确的？
+ 引用必须总是有效（不能悬垂）
+ 在同一作用域中可以有任意多个不可变引用
- 可变引用可以与不可变引用同时存在
+ 可变引用在同一作用域中只能存在一个
E: 借用检查器保证：引用永远有效，且 `&T` 与 `&mut T` 不能共存，`&mut T` 独占。
```

## 编程题：用借用改为"不转移所有权"

下面的 `print_length` 获取了 `String` 的所有权，导致 `main` 里 `s` 之后不能再用。请改为接受借用 `&String`，然后在调用处传入 `&s`，使得末尾的 `println!("{}", s);` 能正常工作。

```rust editable
fn print_length(s: String) {
    println!("长度：{}", s.len());
}

fn main() {
    let s = String::from("hello");
    print_length(s);
    println!("{}", s);
}
```

```expected
长度：5
hello
```

# 综合练习

## 单选：Clone vs Copy

```quiz single
Q: 下列关于 Copy 与 Clone 的说法，哪一项正确？
- 所有类型都实现了 Copy
+ Copy 是按位复制，通常用于基础类型（如 i32、bool）；String 等堆数据只有 Clone
- Clone 是浅拷贝，Copy 是深拷贝
- Copy 需要显式调用 .copy() 方法
E: Copy 是「赋值即隐式按位复制」，限于栈上简单类型；String 这类持有堆数据的类型只能通过显式 `.clone()` 深拷贝。
```

## 编程题：让函数返回所有权

下面的 `take_and_give_back` 接收 `String` 又返回它。请在调用处用 `let s = take_and_give_back(s);` 形式接住返回值，让最后的 `println!` 能打印原字符串。

```rust editable
fn take_and_give_back(s: String) -> String {
    s
}

fn main() {
    let s = String::from("world");
    take_and_give_back(s);
    println!("{}", s);
}
```

```expected
world
```
