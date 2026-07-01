---
title: "? 运算符"
description: "掌握 Rust 错误传播的利器：? 运算符如何消除样板代码、From 自动转换的原理，以及 ? 在 Option 和 main 函数中的使用。"
difficulty: beginner
estimatedTime: 20
keywords: ["? 运算符", "错误传播", "From", "Option", "Result", "错误处理"]
---

# ? 运算符

## 问题：传播错误太繁琐

上一篇末尾，我们写了一个从文件读取用户名的函数：

```rust
fn read_username() -> Result<String, io::Error> {
    let f = File::open("username.txt");

    let mut file = match f {
        Ok(file) => file,
        Err(e) => return Err(e),  // 打开失败 → 立即返回 Err
    };

    let mut name = String::new();

    match file.read_to_string(&mut name) {
        Ok(_) => Ok(name),
        Err(e) => Err(e),
    }
}
```

函数里每个可能失败的操作都要写一遍 `match ... return Err(e)`。当一个函数里有三四个这样的操作时，代码会充斥着重复的样板。

`?` 运算符就是为了解决这个问题而生的。

## ? 的作用

在一个返回 `Result` 的表达式后面加 `?`，效果等价于：

- 如果是 `Ok(value)` → 解出 `value`，继续执行
- 如果是 `Err(e)` → **立即从当前函数返回 `Err(e)`**

用 `?` 改写上面的函数：

```rust runnable
use std::io;
use std::io::Read;
use std::fs::File;

fn read_username() -> Result<String, io::Error> {
    let mut file = File::open("username.txt")?;  // 失败就立刻返回 Err
    let mut name = String::new();
    file.read_to_string(&mut name)?;             // 失败就立刻返回 Err
    Ok(name)
}

fn main() {
    match read_username() {
        Ok(name) => println!("用户名：{}", name),
        Err(e)   => println!("读取失败：{}", e),
    }
}
```

对比前一个版本，代码量减少了一半，逻辑却更清晰——每行代码在说"做这件事，失败就停下来"。

还可以进一步用**链式调用**写得更短：

```rust runnable
use std::io;
use std::io::Read;
use std::fs::File;

fn read_username() -> Result<String, io::Error> {
    let mut name = String::new();
    File::open("username.txt")?.read_to_string(&mut name)?;
    Ok(name)
}

fn main() {
    match read_username() {
        Ok(name) => println!("用户名：{}", name),
        Err(e)   => println!("读取失败：{}", e),
    }
}
```

## ? 背后的自动类型转换

`?` 和手写 `match ... return Err(e)` 有一点细微差别：**`?` 会在返回错误之前自动做类型转换**。

具体来说，`?` 内部会调用标准库的 `From` trait（`From::from(e)`），把当前错误转换成函数声明的返回错误类型。只要两种错误类型之间实现了 `From` 转换关系，`?` 就会自动完成，不需要手动处理。

> **`From` trait 暂时了解即可**：`From` 是 Rust 的标准类型转换 trait，后面讲 trait 时会详细介绍。这里只需要知道：`?` 不仅仅是提早返回，它还帮你做了错误类型的自动转换。

## ? 也能用于 Option

`?` 不只能用于 `Result`，也可以用于 `Option<T>`：

- `Some(value)` → 解出 `value`，继续执行
- `None` → 立即从当前函数返回 `None`

```rust runnable
fn first_char(s: &str) -> Option<char> {
    let first = s.chars().next()?;  // 如果字符串为空，立刻返回 None
    Some(first)
}

fn main() {
    println!("{:?}", first_char("hello"));  // Some('h')
    println!("{:?}", first_char(""));       // None
}
```

> **注意**：`?` 用于 `Option` 时，函数返回类型必须是 `Option`；`?` 用于 `Result` 时，函数返回类型必须是 `Result`。两者不能混用。

## ? 的使用限制：函数返回类型

`?` 只能在返回 `Result` 或 `Option` 的函数中使用。如果在 `main` 函数里直接用 `?`（`main` 默认返回 `()`），会编译报错：

```rust runnable expect-error
use std::fs::File;

fn main() {
    let f = File::open("hello.txt")?;  // 错误：main 返回 ()，不是 Result
}
```

编译器会说：`?` 只能在返回 `Result` 或 `Option` 的函数里使用。

**解决方法**：让 `main` 返回 `Result`。

```rust runnable
use std::error::Error;
use std::fs::File;

fn main() -> Result<(), Box<dyn Error>> {
    let f = File::open("hello.txt")?;
    println!("文件打开成功：{:?}", f);
    Ok(())
}
```

`Box<dyn Error>` 是一个能装下**任意错误类型**的容器（详细原理在 trait 章节讲解），让 `main` 函数可以方便地使用 `?` 来处理各种错误。

> **程序退出码**：当 `main` 返回 `Ok(())` 时，程序退出码是 0（成功）；返回 `Err` 时，Rust 会打印错误信息并以非零退出码退出。

### 在文档测试中使用 ?

上一章讲文档注释时提到，文档代码块默认没有 `main()` 函数，也没有返回类型，不能直接用 `?`。

**为什么不能用？** `?` 需要当前函数返回 `Result` 或 `Option`，而文档测试的代码块隐式地跑在一个返回 `()` 的匿名函数里，就像这样：

```rust
// 文档测试实际上被包成这样：
fn doctest_wrapper() {
    let n: i32 = "42".parse()?;  // ❌ 编译错误：() 不支持 ?
    assert_eq!(n, 42);
}
```

**解决办法**：用 `#` 隐藏行，手动包裹一个返回 `Result` 的函数，让 `?` 有合法的上下文：

````markdown
/// # Examples
///
/// ```rust
/// # use std::error::Error;
/// # fn run() -> Result<(), Box<dyn Error>> {  // ← 隐藏：提供返回 Result 的函数
/// let n: i32 = "42".parse()?;  // ← 读者能看到这行
/// assert_eq!(n, 42);           // ← 读者能看到这行
/// # Ok(())                     // ← 隐藏：函数需要返回 Ok
/// # }                          // ← 隐藏：关闭函数
/// # run().unwrap();             // ← 隐藏：实际调用这个函数
/// ```
````

**读者看到的文档**只有两行核心代码：

```rust
let n: i32 = "42".parse()?;
assert_eq!(n, 42);
```

**`cargo test` 实际运行的代码**包含了全部（隐藏行也在）：

```rust
use std::error::Error;
fn run() -> Result<(), Box<dyn Error>> {
    let n: i32 = "42".parse()?;
    assert_eq!(n, 42);
    Ok(())
}
run().unwrap();
```

这样文档简洁，测试也能正常运行。

# 练习题

## ? 运算符测验

```rust
use std::num::ParseIntError;

fn double_number(s: &str) -> Result<i32, ParseIntError> {
    let n = s.parse::<i32>()?;
    Ok(n * 2)
}
```

```quiz single
Q: 上面代码中，如果 s = "abc"，调用 double_number("abc") 会发生什么？
- 返回 Ok("abc" * 2)
- 返回 Ok(0)
- 程序 panic
+ 返回 Err(ParseIntError)，因为 "abc" 无法解析为 i32，? 触发提早返回
E: "abc" 无法被解析为 i32，parse() 返回 Err(ParseIntError)。遇到 Err 时，? 立即从函数返回这个 Err，不会继续执行 Ok(n * 2)。
```

```quiz single
Q: ? 运算符和手写 `match { Ok(v) => v, Err(e) => return Err(e) }` 的核心区别是？
- ? 会忽略错误类型，match 会保留
- 两者完全等价，没有区别
+ ? 在返回 Err 之前会自动做错误类型转换，而手写 match 不会
- ? 只能用在 Result 上，match 可以用在任何类型
E: ? 在提早返回 Err 时，会自动把错误转换成函数声明的返回错误类型（前提是两种类型之间存在转换关系）。手写 match 只是原样返回 Err，不做转换。这个自动转换让不同来源的错误可以统一成一种类型。
```

```quiz single
Q: 下面哪段代码是正确的？（? 运算符的使用）
- `fn foo() -> i32 { let r: Result<i32,_> = Ok(1); r? }`
- `fn foo() -> Option<i32> { let r: Result<i32,_> = Ok(1); r? }`
- `fn foo() { let r: Result<i32,_> = Ok(1); r?; }`
+ `fn foo() -> Result<i32, String> { let r: Result<i32,String> = Ok(1); Ok(r?) }`
E: ? 只能在返回类型匹配的函数中使用。第一个返回 i32 不是 Result，第三个把 Result 用在 Option 函数里，第四个 main 返回 ()——都不对。只有第二个返回类型和 ? 的使用匹配。r 是 Ok(1)，执行 r? 后成功解包，提取出内部的值 1。然后通过 Ok(r?) 变成了 Ok(1)。函数的最后一行为表达式 Ok(1)，其类型是 Result<i32, String>，刚好与函数签名的返回值类型 Result<i32, String> 完美匹配。如果 r 碰巧是 Err，? 会提前返回该 Err，其类型也是 Result<i32, String>，同样符合函数签名。
```

```quiz multi
Q: 下列关于 ? 运算符的说法，哪些是正确的？（多选）
+ 可以用于 Result 类型
- 可以在任何函数里使用，不需要关心函数返回类型
+ 遇到 Err/None 时立即从当前函数返回，不再执行后续代码
+ 可以用于 Option 类型
- 可以同时在 Option 和 Result 混用（比如在返回 Result 的函数里，对 Option 用 ?）
E: ? 只能在返回 Result 的函数里用于 Result，在返回 Option 的函数里用于 Option。不能混用（在返回 Result 的函数里对 Option 用 ?），因为类型不兼容。要转换，需要手动调用 .ok_or()（Option → Result）或 .ok()（Result → Option）。
```
