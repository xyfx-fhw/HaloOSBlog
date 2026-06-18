---
title: "自定义错误类型"
description: "掌握 Rust 库级错误处理：如何定义自己的错误类型，Box<dyn Error> 快速方案，以及用 From 实现 ? 的跨类型转换。"
difficulty: intermediate
estimatedTime: 30
keywords: ["自定义错误", "Error trait", "Box<dyn Error>", "From", "错误类型", "多种错误"]
---

# 自定义错误类型

## 遇到了什么问题

前面几篇文章中，我们都用 `io::Error` 或 `ParseIntError` 这样的**具体错误类型**。这在函数只有一种可能的错误来源时很好用。

但现实中一个函数经常遇到**多种错误来源**。比如这个函数——读取一个文件，解析里面的数字，然后乘以二：

```rust runnable expect-error
use std::fs;
use std::num::ParseIntError;

fn double_from_file(path: &str) -> Result<i32, ???> {
    let content = fs::read_to_string(path)?;  // 可能是 io::Error
    let n: i32 = content.trim().parse()?;     // 可能是 ParseIntError
    Ok(n * 2)
}
```

返回类型 `Result<i32, ???>` 里的错误类型应该填什么？`io::Error` 和 `ParseIntError` 是两个不同的类型，`?` 无法同时返回两种类型的错误。

Rust 对这个问题提供了两种解决方案：**快速方案**（`Box<dyn Error>`）和**规范方案**（自定义错误类型）。

## 方案一：Box<dyn Error>——快速上手

`Box<dyn Error>` 是一个能容纳**任意错误类型**的容器。只要某个类型实现了 `Error` trait，就能被放进这个容器。

> **理解 `Box<dyn Error>`**：`dyn Error` 是"实现了 Error trait 的某种类型"的意思，`Box` 是把它放在堆上（因为我们编译时不知道它具体有多大）。你暂时不需要理解 trait 对象的所有细节，只需要知道：`Box<dyn Error>` 可以装下任何错误。

```rust runnable
use std::error::Error;
use std::fs;

fn double_from_file(path: &str) -> Result<i32, Box<dyn Error>> {
    let content = fs::read_to_string(path)?;  // io::Error 自动装入 Box
    let n: i32 = content.trim().parse()?;     // ParseIntError 自动装入 Box
    Ok(n * 2)
}

fn main() {
    match double_from_file("number.txt") {
        Ok(n)  => println!("结果：{}", n),
        Err(e) => println!("错误：{}", e),
    }
}
```

`?` 会自动把 `io::Error` 和 `ParseIntError` 转换成 `Box<dyn Error>`，因为标准库为所有 `Error` 类型实现了到 `Box<dyn Error>` 的转换。

**优点**：代码简单，几乎不需要额外写任何东西。
**缺点**：调用者拿到的是一个"盒子"，无法直接判断里面是哪种错误、做精确处理。

> `Box<dyn Error>` 适合：应用程序的 `main` 函数、一次性脚本、快速原型。不适合：对外公开 API 的库，因为调用者需要知道具体的错误类型。

## 方案二：自定义错误类型——库的标准做法

如果你在写一个库，需要让调用者能精确匹配不同的错误情况，就需要定义自己的错误类型。

### 第一步：定义错误枚举

把所有可能的错误情况列为枚举变体：

```rust runnable
use std::num::ParseIntError;
use std::fmt;

// 我们的自定义错误类型
#[derive(Debug)]
enum AppError {
    IoError(std::io::Error),      // 文件读写失败
    ParseError(ParseIntError),    // 数字解析失败
}
```

### 第二步：实现 Display（用户友好的错误信息）

`Display` 是 `{}` 格式化时用的。给用户看的错误信息应该清晰易懂：

```rust
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::IoError(e)    => write!(f, "文件操作失败：{}", e),
            AppError::ParseError(e) => write!(f, "数字格式不正确：{}", e),
        }
    }
}
```

### 第三步：实现 Error trait

`std::error::Error` 是 Rust 错误体系的基础 trait，实现它后这个类型才能被当作标准错误类型使用：

```rust
impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            AppError::IoError(e)    => Some(e),
            AppError::ParseError(e) => Some(e),
        }
    }
}
```

`source()` 返回导致当前错误的"原因"（底层错误），方便错误链的追踪。

### 第四步：实现 From——让 ? 自动转换

现在还有个问题：`?` 遇到 `io::Error` 时，不知道怎么转成 `AppError`。需要实现 `From` 告诉它怎么转：

```rust
impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> AppError {
        AppError::IoError(e)
    }
}

impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> AppError {
        AppError::ParseError(e)
    }
}
```

有了这两个 `From` 实现，`?` 就能自动将 `io::Error` 转换成 `AppError::IoError`，将 `ParseIntError` 转换成 `AppError::ParseError`——这就是上一篇提到的"? 会调用 From::from"的含义。

### 完整代码

把上面四步组合起来：

```rust runnable
use std::num::ParseIntError;
use std::fmt;

#[derive(Debug)]
enum AppError {
    IoError(std::io::Error),
    ParseError(ParseIntError),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::IoError(e)    => write!(f, "文件操作失败：{}", e),
            AppError::ParseError(e) => write!(f, "数字格式不正确：{}", e),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> AppError {
        AppError::IoError(e)
    }
}

impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> AppError {
        AppError::ParseError(e)
    }
}

fn double_from_file(path: &str) -> Result<i32, AppError> {
    let content = std::fs::read_to_string(path)?;  // io::Error 自动 → AppError::IoError
    let n: i32 = content.trim().parse()?;           // ParseIntError 自动 → AppError::ParseError
    Ok(n * 2)
}

fn main() {
    match double_from_file("number.txt") {
        Ok(n) => println!("结果：{}", n),
        Err(AppError::IoError(e))    => println!("文件问题：{}", e),
        Err(AppError::ParseError(e)) => println!("格式问题：{}", e),
    }
}
```

现在调用者可以精确匹配 `IoError` 和 `ParseError`，分别做不同处理。

## 使用类型别名简化代码

当一个模块里大量函数都返回同一种 `Result` 时，可以定义类型别名减少重复：

```rust runnable
use std::num::ParseIntError;
use std::fmt;

#[derive(Debug)]
enum AppError {
    ParseError(ParseIntError),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::ParseError(e) => write!(f, "解析失败：{}", e),
        }
    }
}

impl std::error::Error for AppError {}

impl From<ParseIntError> for AppError {
    fn from(e: ParseIntError) -> AppError {
        AppError::ParseError(e)
    }
}

// 类型别名：本模块的 Result 默认错误是 AppError
type Result<T> = std::result::Result<T, AppError>;

fn parse_number(s: &str) -> Result<i32> {
    Ok(s.trim().parse()?)
}

fn double(s: &str) -> Result<i32> {
    let n = parse_number(s)?;
    Ok(n * 2)
}

fn main() {
    println!("{:?}", double("21"));    // Ok(42)
    println!("{:?}", double("abc"));   // Err(ParseError(...))
}
```

## 遍历 Result：迭代器中的错误处理

当你对一个集合做 `map` 操作，每个元素的转换可能失败时，有三种策略：

```rust runnable
fn main() {
    let strings = vec!["1", "两", "3", "4"];

    // 策略一：用 filter_map 忽略失败项，只保留成功的
    let numbers: Vec<i32> = strings.iter()
        .filter_map(|s| s.parse::<i32>().ok())
        .collect();
    println!("忽略失败：{:?}", numbers);  // [1, 3, 4]

    // 策略二：用 collect::<Result<Vec<_>, _>> 遇到第一个失败就停下来
    let result: Result<Vec<i32>, _> = strings.iter()
        .map(|s| s.parse::<i32>())
        .collect();
    println!("遇错即停：{:?}", result);  // Err("两" 解析失败)

    // 策略三：用 partition 把成功和失败分开
    let (ok_vals, err_vals): (Vec<_>, Vec<_>) = strings.iter()
        .map(|s| s.parse::<i32>())
        .partition(Result::is_ok);
    let numbers: Vec<i32> = ok_vals.into_iter().map(Result::unwrap).collect();
    let errors: Vec<_>    = err_vals.into_iter().map(Result::unwrap_err).collect();
    println!("分开收集：ok={:?}, err={:?}", numbers, errors);
}
```

三种策略各有适用场景：
- **filter_map**：不关心失败项，只要能解析的
- **collect 到 Result**：要么全部成功，要么整体失败（批量处理时常用）
- **partition**：既要成功结果，也要知道哪些失败了

# 练习题

## 自定义错误测验

```quiz single
Q: 自定义错误类型必须实现哪些 trait，才能在 Rust 错误体系中正常工作？
- 只需要实现 Debug
+ 需要实现 Debug 和 Display，以及 std::error::Error
- 只需要实现 std::error::Error
- 只需要实现 From
E: std::error::Error 要求实现 Display（用于 {} 格式化）和 Debug（用于 {:?} 格式化），然后你实现空的 Error trait（或提供 source 方法）。Debug 通常用 #[derive(Debug)] 自动生成，Display 需要手动实现。
```

```quiz single
Q: 为自定义错误类型实现 From<SomeError> 的目的是？
- 让 SomeError 类型可以 Display
- 让自定义错误可以转换为 SomeError
+ 让 ? 运算符在遇到 SomeError 时能自动转换成自定义错误类型
- 让自定义错误类型实现 Debug
E: ? 运算符在传播错误时会调用 From::from() 做类型转换。如果函数返回 Result<T, MyError>，而某个操作产生了 OtherError，只要实现了 From<OtherError> for MyError，? 就会自动调用 from() 完成转换。
```

```quiz single
Q: Box<dyn Error> 和自定义错误类型相比，哪个适合库对外公开的 API？
- Box<dyn Error>，因为更简单
+ 自定义错误类型，因为调用者可以 match 具体的错误变体做精确处理
- 两者完全等价，没有差别
- 取决于错误数量，少于 3 个用自定义，否则用 Box<dyn Error>
E: Box<dyn Error> 是一个不透明的容器，调用者收到后无法区分具体是哪种错误，只能打印错误信息。自定义错误类型（特别是枚举）让调用者可以精确 match 每种情况做不同处理，是库对外 API 的标准做法。
```

```quiz multi
Q: 以下哪些做法适合处理迭代器中每个元素可能失败的情况？（多选）
+ filter_map(|x| x.ok()) 忽略所有失败项
+ .collect::<Result<Vec<_>, _>>() 遇到第一个失败就整体返回 Err
+ .partition(Result::is_ok) 把成功和失败分到两个 Vec
- .unwrap() 每个元素直接解包，遇到失败会 panic
E: 三种策略（filter_map/collect/partition）各有适用场景。unwrap() 会在第一个失败时 panic，通常不用于生产代码中的迭代处理。选哪种取决于业务需求：忽略失败、还是要失败信息、还是全都要。
```

```quiz single
Q: 类型别名 `type Result<T> = std::result::Result<T, AppError>` 的作用是？
- 创建了一个全新的类型，与 std::result::Result 不同
+ 是 std::result::Result<T, AppError> 的简写，减少重复，但本质上是同一个类型
- 让 AppError 可以自动转换为 std::result::Result
- 隐藏了错误类型，调用者无法知道出了什么错
E: 类型别名只是给现有类型起一个短名字，不创建新类型。`type Result<T> = std::result::Result<T, AppError>` 让模块内的函数可以写 `Result<T>` 而不用每次都写 `Result<T, AppError>`，减少重复，但行为完全相同。
```
