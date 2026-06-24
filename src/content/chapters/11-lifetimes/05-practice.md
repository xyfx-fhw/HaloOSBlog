---
title: "综合练习"
description: "通过一组难度递进的编程练习，综合运用函数生命周期、结构体生命周期和省略规则"
difficulty: intermediate
estimatedTime: 30
keywords: ["lifetime", "生命周期练习", "综合练习", "编程练习"]
---

# 综合练习

本节通过一组难度递进的练习，综合检验你对生命周期的掌握。每道题都配有提示，遇到困难时可以先看提示再动手。

## 练习 1：修复悬垂引用

下面的函数试图返回在函数内部创建的字符串的引用，这会导致悬垂引用。请将函数改写成正确的版本——不返回引用，而是返回有所有权的值。

```rust editable
// 修复这个函数：让它能正确工作
fn get_greeting(name: &str) -> &str {
    let greeting = format!("你好，{}！", name);
    &greeting // 错误：greeting 在函数结束时被销毁
}

fn main() {
    let name = "Alice";
    let msg = get_greeting(name);
    println!("{}", msg);
}
```

```expected
你好，Alice！
```

## 练习 2：添加生命周期标注

`split_at_comma` 函数把一个字符串在第一个逗号处分成两半，返回前半部分。添加正确的生命周期标注（或利用省略规则），使其能够编译：

```rust editable
// 提示：返回值是 s 的一部分，应该和 s 的生命周期关联
fn split_at_comma(s: &str) -> &str {
    match s.find(',') {
        Some(pos) => &s[..pos],
        None => s,
    }
}

fn main() {
    let data = String::from("Alice,Bob,Charlie");
    let first = split_at_comma(&data);
    println!("第一个：{}", first);

    // 注意：这里 data 还在作用域，所以 first 有效
    println!("原始数据：{}", data);
}
```

```expected
第一个：Alice
原始数据：Alice,Bob,Charlie
```

## 练习 3：选择较短的字符串

写一个函数 `shorter`，返回两个字符串 slice 中**较短**的那个（如果一样长，返回第一个）。注意正确标注生命周期：

```rust editable
// TODO: 实现这个函数，添加正确的生命周期标注
fn shorter(a: &str, b: &str) -> &str {
    todo!()
}

fn main() {
    let s1 = String::from("hello");
    let s2 = String::from("hi");
    println!("较短的是：{}", shorter(&s1, &s2));

    let s3 = String::from("rust");
    let s4 = String::from("programming");
    println!("较短的是：{}", shorter(&s3, &s4));
}
```

```expected
较短的是：hi
较短的是：rust
```

## 练习 4：含引用的结构体

`Parser` 结构体需要持有对输入字符串的引用，以便逐步解析。请添加生命周期标注并实现 `next_token` 方法，返回下一个以空格分隔的 token（每次调用后推进内部位置）：

```rust editable
// TODO: 给 Parser 添加生命周期标注
struct Parser {
    input: &str,
    pos: usize,
}

impl Parser {
    fn new(input: &str) -> Self {
        Parser { input, pos: 0 }
    }

    // TODO: 返回下一个 token（从 pos 开始的下一段不含空格的内容）
    // 如果已经到末尾，返回 None
    fn next_token(&mut self) -> Option<&str> {
        todo!()
    }
}

fn main() {
    let text = String::from("hello world rust");
    let mut parser = Parser::new(&text);

    while let Some(token) = parser.next_token() {
        println!("token: {}", token);
    }
}
```

```expected
token: hello
token: world
token: rust
```

## 练习 5：生命周期与泛型结合

`Cache` 结构体用来缓存一个计算结果的引用。它持有一个对 `T` 类型数据的引用。请完成实现：

```rust editable
use std::fmt::Display;

// TODO: 添加生命周期标注
struct Cache {
    value: &i32,
    label: &str,
}

impl Cache {
    fn new(value: &i32, label: &str) -> Self {
        Cache { value, label }
    }
}

// TODO: 为 Cache 实现 Display trait
// 格式："{label}: {value}"

fn main() {
    let result = 42;
    let name = String::from("答案");
    let cache = Cache::new(&result, &name);
    println!("{}", cache);
}
```

```expected
答案: 42
```

## 练习 6：识别省略规则

下面有四个函数签名，其中有的可以省略生命周期，有的不能。判断哪些能通过编译（无需修改），哪些需要手动添加生命周期标注才能编译，并在注释中解释原因：

```rust editable
// 判断下面哪些函数能直接编译，哪些需要添加生命周期标注
// 在每个函数前添加注释说明原因，然后修复不能编译的函数

// 函数 A
fn get_x(point: &(i32, i32)) -> &i32 {
    &point.0
}

// 函数 B（这个需要修改）
fn combine(a: &str, b: &str) -> &str {
    if a.len() > b.len() { a } else { b }
}

// 函数 C
fn identity(x: &str) -> &str {
    x
}

// 函数 D（这个需要修改）
fn first_of_two(a: &str, _b: &str) -> &str {
    a
}

fn main() {
    // 测试 A
    let p = (3, 4);
    println!("x = {}", get_x(&p));

    // 测试 C
    println!("{}", identity("hello"));
}
```

```expected
x = 3
hello
```
