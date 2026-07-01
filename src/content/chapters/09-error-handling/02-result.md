---
title: "Result<T, E>"
description: "掌握 Rust 可恢复错误处理的核心：Result 枚举、match 处理、unwrap/expect 快捷方法，以及如何向调用者传播错误。"
difficulty: beginner
estimatedTime: 30
keywords: ["Result", "Ok", "Err", "unwrap", "expect", "错误处理", "match", "错误传播"]
---

# Result<T, E>

## 为什么需要 Result

上一篇讲了 `panic!`，用于"不应该发生"的错误。但现实中大多数错误都是**可以预料的、可以处理的**：

- 尝试打开一个文件 → 文件可能不存在
- 尝试解析一个字符串为数字 → 字符串可能不是合法的数字
- 发起网络请求 → 服务器可能临时不可用

这些情况不是 bug，是正常的程序运行中随时可能发生的事情。对这类错误调用 `panic!` 并让程序崩溃，显然不合适。

Rust 的解决方案是 **`Result<T, E>` 枚举**：让可能失败的函数在返回值里**明确表达"成功"或"失败"**，让调用者决定如何处理。

## Result 是什么

你之前学过 `Option<T>`——它表达"值可能不存在"：

```rust
enum Option<T> {
    Some(T),  // 有值
    None,     // 没有值
}
```

`Result<T, E>` 是类似的概念，但表达的是"操作可能失败"：

```rust
enum Result<T, E> {
    Ok(T),   // 成功，携带结果值
    Err(E),  // 失败，携带错误信息
}
```

`T` 是成功时的值的类型，`E` 是失败时的错误类型。比如 `File::open` 的返回类型是 `Result<File, io::Error>`——成功返回文件句柄，失败返回 IO 错误。

> **如何知道一个函数返回什么类型？** 看文档，或者直接问编译器。把返回值赋给一个错误类型的变量，编译器会在报错信息里告诉你正确的类型。

## 用 match 处理 Result

`Result` 和 `Option` 一样，需要用 `match` 明确处理两种情况。下面是打开文件的例子：

```rust runnable
use std::fs::File;

fn main() {
    let result = File::open("hello.txt");

    match result {
        Ok(file) => {
            println!("文件打开成功！句柄：{:?}", file);
        }
        Err(error) => {
            println!("打开文件失败，原因：{}", error);
            // 这里可以做恢复处理，比如创建文件、使用默认值、提示用户等
        }
    }
}
```

这里 `File::open("hello.txt")` 返回 `Result<File, io::Error>`。`match` 分别处理了 `Ok` 和 `Err` 两种情况——失败时打印错误信息并继续，而不是让程序崩溃。

### 匹配不同类型的错误

有时候同一个操作可能因为不同原因失败，我们想对不同原因做不同处理。`io::Error` 有一个 `kind()` 方法可以获取错误类型：

```rust runnable
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let f = File::open("hello.txt");

    let file = match f {
        Ok(file) => file,
        Err(error) => match error.kind() {
            // 文件不存在 → 创建它
            ErrorKind::NotFound => match File::create("hello.txt") {
                Ok(new_file) => {
                    println!("文件不存在，已创建新文件");
                    new_file
                }
                Err(e) => panic!("创建文件失败：{:?}", e),
            },
            // 其他错误 → 直接 panic
            other => panic!("打开文件时遇到其他错误：{:?}", other),
        },
    };

    println!("得到了文件句柄：{:?}", file);
}
```

这里有三层 `match` 嵌套。虽然完整，但看起来有点繁重。

## unwrap 和 expect：快捷但有代价

`Result` 有两个便捷方法，让你不用每次都写 `match`：

**`unwrap()`**：如果是 `Ok`，返回值；如果是 `Err`，直接 panic。

```rust runnable
use std::fs::File;

fn main() {
    // 如果文件不存在，这里会 panic
    let f = File::open("hello.txt").unwrap();
    println!("文件句柄：{:?}", f);
}
```

**`expect("消息")`**：和 `unwrap` 一样，但 panic 时显示你提供的消息，更容易调试：

```rust runnable
use std::fs::File;

fn main() {
    let f = File::open("hello.txt")
        .expect("无法打开 hello.txt，请检查文件是否存在");
    println!("文件句柄：{:?}", f);
}
```

**什么时候用 unwrap/expect？**

- **适合用**：写原型、写示例、写测试代码时。此时你更关心逻辑本身，不想被错误处理分散注意力。
- **不适合用**：生产代码中，尤其是有可能失败的操作。一旦失败就 panic，用户体验很差。

> **记住**：`unwrap` 和 `expect` 本质上是"我相信这里不会失败，如果失败就让程序崩溃"的声明。在代码审查中，看到 `unwrap` 就意味着这里需要审查：这个假设是否成立？

## 向调用者传播错误

到目前为止，我们要么用 `match` 处理错误，要么调 `panic!` 崩溃。但有第三种选择：**把错误向上传播给调用者**。

当前函数没有足够的上下文来决定怎么处理错误时，这很合理——调用者可能比被调用者更清楚应该怎么处理。

下面是一个从文件读取用户名的函数，把错误传播给调用者：

```rust runnable
use std::io;
use std::io::Read;
use std::fs::File;

fn read_username() -> Result<String, io::Error> {
    let f = File::open("username.txt");

    let mut file = match f {
        Ok(file) => file,
        Err(e) => return Err(e),  // 打开失败 → 立即返回 Err
    };

    let mut name = String::new();

    match file.read_to_string(&mut name) {
        Ok(_) => Ok(name),    // 读取成功 → 返回 Ok(内容)
        Err(e) => Err(e),     // 读取失败 → 返回 Err
    }
}

fn main() {
    match read_username() {
        Ok(name) => println!("用户名：{}", name),
        Err(e) => println!("读取失败：{}", e),
    }
}
```

注意函数返回值类型 `Result<String, io::Error>`——函数**承诺**调用者：要么给你一个 `String`，要么给你一个 `io::Error`，你来决定怎么处理。

这段代码有点冗长：每个可能失败的操作都要写一遍 `match` 加 `return Err`。当一个函数里有多个可能失败的操作时，就会有很多这样的样板代码。

Rust 为此提供了一个更简洁的语法：`?` 运算符。下一篇文章会详细讲它。

# 练习题

## Result 基础测验

```rust
use std::num::ParseIntError;

fn parse_age(s: &str) -> Result<u32, ParseIntError> {
    let n: i32 = s.parse()?;
    if n < 0 {
        panic!("年龄不能为负数");
    }
    Ok(n as u32)
}
```

```quiz single
Q: 上面代码中，Result<u32, ParseIntError> 的含义是？
- 函数总是返回 u32，ParseIntError 是备选类型
- 这是语法错误，Result 只能有一个类型参数
+ 函数成功时返回 u32，失败时返回 ParseIntError 类型的错误
- 函数可能返回 u32 类型的错误
E: Result<T, E> 是 Rust 的错误处理枚举：Ok(T) 携带成功值，Err(E) 携带错误值。这里 T=u32 是成功时返回的类型，E=ParseIntError 是失败时的错误类型。
```

```quiz single
Q: unwrap() 和 expect("消息") 的区别是？
- expect 只能用在 Option 上，unwrap 可以用在 Result 上
- unwrap 会忽略错误，expect 会重新抛出错误
+ 两者都在 Err 时 panic，但 expect 在 panic 时显示你指定的自定义消息
- unwrap 更安全，expect 更危险
E: 两者行为相同：Ok 时返回值，Err 时 panic。区别只在于 panic 信息：unwrap 使用默认格式，expect 使用你提供的字符串，通常更有帮助。在代码里更推荐用 expect，方便定位是哪个地方触发了 panic。
```

```rust
fn get_value() -> i32 {
    let result: Result<i32, String> = Ok(42);
    result
}
```

```quiz single
Q: 上面的代码能编译通过吗？
+ 不能，函数签名要求返回 i32，但实际返回了 Result<i32, String>
- 能，因为 Result 会自动转换为 i32
- 能，因为 Ok(42) 里面包含了 i32
- 不能，因为 result 不是 mut 的
E: 类型必须严格匹配。函数声明返回 i32，但实际返回了 Result<i32, String>，这是类型不匹配的错误。要返回 i32，需要用 result.unwrap() 或 match result { Ok(v) => v, ... }。
```

```quiz multi
Q: 关于错误传播，下列说法正确的是？（多选）
+ 函数可以选择把错误向上传递，让调用者决定如何处理
- 错误传播只能用于 panic! 产生的错误
+ 传播错误时，函数的返回类型必须是 Result（或 Option）
+ 相比每次都 panic，传播错误让代码更灵活，调用者可以按自己的需求处理
E: 错误传播是 Rust 错误处理的核心模式之一。函数把 Err 值原样返回给调用者，让调用者根据上下文决定怎么处理——是恢复、是记录日志、还是继续传播。这要求函数返回 Result 类型。
```

```quiz single
Q: 什么情况下用 unwrap() 是合理的？
- 任何时候都合理，Rust 会自动处理 panic
- 只有在不关心错误信息时
- 从来都不合理，应该总是用 match 处理
+ 在你通过代码逻辑确定某个 Result 一定是 Ok 的情况下，或者在原型/测试代码中
E: unwrap() 在两种情况下合理：(1) 你比编译器知道得更多，通过逻辑可以确定这里不会失败（比如解析一个写死的已知合法字符串）；(2) 写原型或测试时，错误处理不是当前关注点，可以先用 unwrap 留作后续完善的标记。
```

## 编程练习

下面这个函数直接用 `unwrap` 处理所有错误。请用 `match` 改写，使其：
- 解析成功时打印结果
- 解析失败时打印"输入不是合法数字：<原因>"，**不要让程序崩溃**

```rust editable
fn main() {
    let inputs = vec!["42", "hello", "100", "world"];

    for s in inputs {
        let n: i32 = s.parse().unwrap();  // 遇到 "hello" 会崩溃
        println!("{} 解析为 {}", s, n);
    }
}
```

```expected
42 解析为 42
100 解析为 100
```
