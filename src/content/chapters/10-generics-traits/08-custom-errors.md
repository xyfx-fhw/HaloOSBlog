---
title: "实战：自定义错误类型"
description: "综合运用 Display、Error、From trait，实现一个符合 Rust 惯例的自定义错误类型，让 ? 运算符可以跨错误类型自动转换。"
difficulty: intermediate
estimatedTime: 25
keywords: ["自定义错误", "Error trait", "Display", "From", "错误处理", "? 运算符"]
---

# 实战：自定义错误类型

## 回顾：错误处理留下的问题

在错误处理章节，我们用 `Box<dyn Error>` 解决了"函数内多种错误来源"的问题：

```rust
fn double_from_file(path: &str) -> Result<i32, Box<dyn Error>> {
    let content = std::fs::read_to_string(path)?;
    let n: i32 = content.trim().parse()?;
    Ok(n * 2)
}
```

这很方便，但缺点是调用者无法精确匹配错误类型——拿到的只是一个不透明的"盒子"。

现在你已经学了 trait，可以补上这个缺口：**定义自己的错误枚举，让调用者能精确 match 每种错误情况**。

## 需要实现哪些 Trait

一个符合 Rust 惯例的自定义错误类型需要实现三个 trait：

| Trait | 作用 |
|-------|------|
| `Debug`（通常 derive）| 支持 `{:?}` 格式化，调试用 |
| `fmt::Display` | 支持 `{}` 格式化，面向用户的错误信息 |
| `std::error::Error` | 进入 Rust 错误体系，支持装入 `Box<dyn Error>` |

另外，要让 `?` 运算符自动做类型转换，还需要：

| Trait | 作用 |
|-------|------|
| `From<底层错误类型>` | 告诉 `?` 如何把底层错误转成我们的错误类型 |

## 四步实现自定义错误类型

### 第一步：定义错误枚举

把函数内所有可能的错误情况列为枚举变体，每个变体携带底层错误：

```rust
use std::num::ParseIntError;
use std::fmt;

#[derive(Debug)]  // 自动实现 Debug
enum AppError {
    IoError(std::io::Error),    // 文件读写失败
    ParseError(ParseIntError),  // 数字解析失败
}
```

### 第二步：实现 Display

`Display` 是 `{}` 用的格式化 trait。错误信息应该清晰、面向用户：

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

> **为什么 Display 要转发给内部错误？** 底层的 `io::Error` 和 `ParseIntError` 本身有很好的错误描述，直接转发给用户即可。复杂场景下你也可以写完全自定义的描述。

### 第三步：实现 Error trait

`std::error::Error` 是 Rust 错误体系的入口 trait。通常只需要一个空实现，也可以提供 `source()` 方法返回底层原因：

```rust
impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            AppError::IoError(e)    => Some(e),  // 底层原因是 io::Error
            AppError::ParseError(e) => Some(e),  // 底层原因是 ParseIntError
        }
    }
}
```

`source()` 让工具（如日志库）可以追踪完整的错误链。不需要链追踪时，留空实现 `impl std::error::Error for AppError {}` 也完全可以。

### 第四步：实现 From——让 ? 自动转换

这一步是关键。有了前面学的 `From` trait，`?` 才能在遇到 `io::Error` 时自动转换成 `AppError`：

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

现在你理解了为什么错误处理章节说"`?` 会调用 `From::from`"：当函数里 `fs::read_to_string(path)?` 遇到 `io::Error`，`?` 会调用 `From<io::Error> for AppError` 里的 `from` 方法，把它转成 `AppError::IoError`，然后作为 `Err` 提前返回。

## 完整示例

把四步组合起来，看调用者如何精确处理不同错误：

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
    // 调用者可以精确 match 每种错误
    match double_from_file("number.txt") {
        Ok(n)                         => println!("结果：{}", n),
        Err(AppError::IoError(e))     => println!("文件问题，可以重试：{}", e),
        Err(AppError::ParseError(e))  => println!("文件内容格式错误：{}", e),
    }
}
```

对比 `Box<dyn Error>` 方案，现在调用者可以分别对"文件不存在"和"格式错误"做不同处理，而不是统一打印一条模糊的错误信息。

## Result 类型别名（可选优化）

当模块里大量函数都返回 `Result<T, AppError>` 时，可以用类型别名减少重复：

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

fn parse_number(s: &str) -> Result<i32> {    // 等价于 Result<i32, AppError>
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

# 练习题

## 自定义错误测验

```quiz single
Q: 实现自定义错误类型时，Display 和 Debug 的分工是什么？
- 两者完全相同，只是名字不同
+ Debug（{:?}）用于开发调试，Display（{}）用于面向用户的错误信息
- Debug 自动生成，Display 只能手动实现
- Display 是必须的，Debug 是可选的
E: Debug 通常用 #[derive(Debug)] 自动生成，输出的格式偏技术性（带字段名），方便开发者调试。Display 需要手动实现，输出的是给用户或日志看的友好描述。两者都需要实现。
```

```quiz single
Q: 为什么需要为自定义错误类型实现 From<底层错误>？
- 为了让自定义错误支持 {} 打印
- 为了让自定义错误能被 match
+ 让 ? 运算符在遇到底层错误时能自动转换成自定义错误类型
- 为了让自定义错误能被 clone
E: ? 运算符在返回 Err 之前会调用 From::from() 做类型转换。如果函数返回 Result<T, AppError>，遇到 io::Error 时，? 会自动调用 From<io::Error> for AppError 里的 from 方法，把它转成 AppError::IoError 再返回。
```

```quiz single
Q: Error trait 的 source() 方法有什么作用？
- 获取错误的字符串描述
+ 返回导致当前错误的底层原因，支持错误链追踪
- 检查错误是否可以被恢复
- 把错误转换为另一种类型
E: source() 返回 Option<&dyn Error>，指向引发当前错误的底层错误。日志库或调试工具可以递归调用 source() 展示完整的错误链。不需要链追踪时可以留空实现（返回 None）。
```

```quiz multi
Q: 下列关于自定义错误类型和 Box<dyn Error> 的说法，哪些正确？（多选）
+ Box<dyn Error> 代码简单，适合 main 函数和脚本，但调用者无法精确匹配错误类型
+ 自定义错误枚举让调用者可以 match 具体的错误变体
+ 两者都可以配合 ? 运算符使用
- 自定义错误类型无法被放入 Box<dyn Error>
E: 实现了 Error trait 的自定义类型同样可以放入 Box<dyn Error>（标准库有对应的 From 实现）。两者都支持 ?。选哪个取决于场景：快速开发/应用代码用 Box<dyn Error>，对外库 API 用自定义枚举。
```

## 编程练习

下面定义了一个 `DbError` 枚举，但缺少 `Display`、`Error` 和 `From` 的实现。请补全，使代码能正常编译运行。

```rust editable
use std::num::ParseIntError;
use std::fmt;

#[derive(Debug)]
enum DbError {
    ParseError(ParseIntError),
    NotFound(String),
}

// TODO: 实现 fmt::Display for DbError
// ParseError 显示 "解析失败：<原因>"，NotFound 显示 "未找到：<描述>"

// TODO: 实现 std::error::Error for DbError（空实现即可）

// TODO: 实现 From<ParseIntError> for DbError

fn lookup(key: &str, value: &str) -> Result<i32, DbError> {
    if key.is_empty() {
        return Err(DbError::NotFound("key 不能为空".to_string()));
    }
    let n: i32 = value.parse()?;  // ParseIntError 应该自动转成 DbError::ParseError
    Ok(n)
}

fn main() {
    match lookup("id", "42") {
        Ok(n)                       => println!("找到：{}", n),
        Err(DbError::ParseError(e)) => println!("解析失败：{}", e),
        Err(DbError::NotFound(msg)) => println!("未找到：{}", msg),
    }

    match lookup("", "42") {
        Ok(n)                       => println!("找到：{}", n),
        Err(DbError::ParseError(e)) => println!("解析失败：{}", e),
        Err(DbError::NotFound(msg)) => println!("未找到：{}", msg),
    }

    match lookup("id", "abc") {
        Ok(n)                       => println!("找到：{}", n),
        Err(DbError::ParseError(e)) => println!("解析失败：{}", e),
        Err(DbError::NotFound(msg)) => println!("未找到：{}", msg),
    }
}
```

```expected
找到：42
未找到：key 不能为空
解析失败：invalid digit found in string
```
