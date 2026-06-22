---
title: "何时 panic，何时 Result"
description: "掌握 Rust 错误处理的决策框架：哪些场景应该 panic，哪些应该返回 Result，以及用类型系统编码不变量的思路。"
difficulty: beginner
estimatedTime: 20
keywords: ["panic", "Result", "错误处理策略", "不变量", "类型系统", "unwrap"]
---

# 何时 panic，何时 Result

## 核心原则

学完 `panic!` 和 `Result`，你可能会问：**这两种方式什么时候用哪个？**

答案的核心是：**错误是调用者能处理的吗？**

- 如果调用者**可以**做出合理响应（文件不存在、网络超时、输入格式不对）→ 返回 `Result`，把选择权给调用者
- 如果调用者**无法**做出合理响应，继续下去只会更糟（违反了代码的不变量、不可能发生的状态出现了）→ 用 `panic!`

## 适合用 Result 的场景

### 任何"预期可能失败"的操作

文件读写、网络请求、用户输入解析——这些在正常运行中随时可能失败，不代表代码有 bug：

```rust runnable
use std::num::ParseIntError;

fn parse_age(s: &str) -> Result<u32, ParseIntError> {
    let n: u32 = s.trim().parse()?;
    Ok(n)
}

fn main() {
    match parse_age("25") {
        Ok(age) => println!("年龄：{}", age),
        Err(e)  => println!("格式不对：{}", e),
    }

    match parse_age("abc") {
        Ok(age) => println!("年龄：{}", age),
        Err(e)  => println!("格式不对：{}", e),
    }
}
```

"abc" 解析失败不是 bug，是用户输入的正常变化。用 `Result` 让调用者来决定怎么处理——是重试、是使用默认值、还是显示错误提示。

## 适合 panic! 的场景

### 1. 原型和示例代码

写原型时，错误处理会让代码变得冗长，分散对核心逻辑的注意力。用 `unwrap` 先让代码跑起来，后续再完善：

```rust runnable
// 原型代码：先跑起来，错误处理后续完善
fn main() {
    let content = std::fs::read_to_string("config.txt").unwrap();
    println!("{}", content);
}
```

`unwrap` 留下了一个明显的"待完善"标记，比悄悄吞掉错误或写假的错误处理要诚实。

### 2. 测试代码

测试中某个操作失败了，测试就应该失败。用 `unwrap/expect` 让测试在遇到错误时立刻报告：

```rust
#[test]
fn test_parse() {
    let n: i32 = "42".parse().expect("这个字符串应该能解析");
    assert_eq!(n, 42);
}
```

### 3. 你比编译器知道得更多

有时候你通过代码逻辑可以确定某个 `Result` 一定是 `Ok`，但编译器类型系统无法验证这一点：

```rust runnable
use std::net::IpAddr;

fn main() {
    // "127.0.0.1" 是硬编码的合法 IP，parse 不可能失败
    let home: IpAddr = "127.0.0.1".parse().unwrap();
    println!("{}", home);
}
```

这里 `unwrap` 是合理的——IP 字符串是代码里写死的，不是运行时的用户输入。即使这样，建议加上注释说明原因，让代码审查者知道这不是疏漏。

### 4. 代码遇到了不变量被破坏的情况

当代码检测到"这种情况不应该存在，一定是 bug"时，panic 比悄悄继续运行更好：

```rust runnable
fn get_element(v: &[i32], index: usize) -> i32 {
    if index >= v.len() {
        panic!("index {} 超出范围，向量长度是 {}", index, v.len());
    }
    v[index]
}

fn main() {
    let v = vec![1, 2, 3];
    println!("{}", get_element(&v, 1));  // 正常
    // println!("{}", get_element(&v, 5));  // 会 panic
}
```

## 用类型系统编码不变量

有一个更优雅的思路：与其在函数内部反复检查参数合法性，不如**用类型来保证只有合法的值才能被创建**。

举个例子：假设你的程序中大量函数都需要一个"1 到 100 之间的数字"。如果直接用 `i32`，每个函数都要检查范围。

更好的做法：创建一个 `Guess` 类型，把检查放在构造时：

```rust runnable
pub struct Guess {
    value: i32,  // private，外部无法直接设置
}

impl Guess {
    pub fn new(value: i32) -> Guess {
        if value < 1 || value > 100 {
            // 违反了 Guess 的契约 → 调用者的 bug → panic
            panic!("猜测值必须在 1 到 100 之间，得到了 {}", value);
        }
        Guess { value }
    }

    pub fn value(&self) -> i32 {
        self.value
    }
}

fn check_guess(guess: Guess) {
    // 这里不需要再检查范围了
    // 因为能创建出 Guess，就说明值一定在 1-100 之间
    println!("你猜了 {}，在有效范围内", guess.value());
}

fn main() {
    let g = Guess::new(42);
    check_guess(g);

    // Guess::new(200);  // 这行会 panic——调用者的 bug
}
```

**关键点**：
- `value` 字段是私有的，外部代码**必须**通过 `new` 创建 `Guess`
- `new` 中的检查确保了：只要一个 `Guess` 存在，它的值就一定合法
- 所有接受 `Guess` 参数的函数不再需要重复检查范围

这就是"用类型编码不变量"——把检查从"每次使用时"移到"创建时"，一次检查，处处保证。

## 总结：决策框架

| 情况 | 推荐做法 |
|------|---------|
| 用户输入、文件读写、网络请求等预期可能失败的操作 | 返回 `Result` |
| 写原型/示例，不想被错误处理分散注意力 | `unwrap/expect` 先跑起来 |
| 测试中的断言 | `unwrap/expect` |
| 硬编码值，你确定不会失败 | `unwrap`（加注释说明原因） |
| 参数违反了契约（调用者的 bug） | `panic!` |
| 代码遇到了不可能的状态 | `panic!` |
| 提供给其他开发者使用的库 | 几乎总是返回 `Result` |

> **库的特殊情况**：如果你在写一个供他人使用的库，对外暴露的函数几乎应该总是返回 `Result`，让库的用户自己决定如何处理错误。在库的内部实现中，遇到 bug 可以 panic。

# 练习题

## 决策测验

```quiz single
Q: 你在写一个解析配置文件的库函数，配置文件格式可能不合法。应该怎么处理？
- 调用 panic! 让程序立刻崩溃，因为配置不合法是严重问题
+ 返回 Result::Err，让调用者决定是使用默认配置、报错退出还是提示用户
- 用 unwrap 处理，因为配置文件通常是合法的
- 不处理，让程序继续运行
E: 配置文件格式不合法是"预期可能发生"的情况，不是调用者的 bug。库函数应该返回 Err，让调用方决定应对策略——使用默认值、记录日志、还是退出程序。panic 会剥夺调用者的选择权。
```

```quiz single
Q: 以下哪个场景最适合直接使用 unwrap()？
- 解析网络请求中用户提交的 JSON 数据
- 读取生产环境的重要配置文件
+ 测试函数中断言某个已知正确的操作结果
- 库函数中解析外部传入的字符串参数
E: 测试代码中，如果一个操作失败了，测试本来就应该失败（panic），所以 unwrap 是合适的。其他三种情况都是可能失败的正常操作，应该用 Result 并给调用者机会处理错误。
```

```quiz multi
Q: 下列哪些说法符合 Rust 错误处理的推荐实践？（多选）
+ 可恢复的错误（文件不存在、解析失败等）应该用 Result 传播
+ 如果你写的是库，对外接口应该几乎总是返回 Result
- 生产代码中 unwrap 是合理的，因为程序员知道代码逻辑
+ 在确认某值一定合法时，可以用 unwrap 并加注释说明理由
- panic! 和返回 Err 对调用者来说效果一样，可以随意选择
E: 核心原则是：可恢复的错误用 Result，不可恢复的 bug 用 panic。库代码要尽量返回 Result 保持灵活性。unwrap 在有明确逻辑保证时才合理，生产代码中的 unwrap 通常是潜在风险点。panic 和 Err 对调用者效果完全不同——panic 无法被调用者处理。
```

## 编程练习

下面的函数签名已经改为返回 `Result<u32, String>`，但函数体里还在用 `panic!`。请将两处 `panic!` 改为返回 `Err(...)`，并把最后的返回值改为 `Ok(...)`，使代码能正常运行。

```rust editable
fn parse_age(s: &str) -> Result<u32, String> {
    let n: i32 = match s.trim().parse() {
        Ok(n)  => n,
        Err(e) => panic!("解析失败：{}", e),
    };
    if n < 0 || n > 150 {
        panic!("年龄 {} 不在有效范围内", n);
    }
    n as u32
}

fn main() {
    println!("{:?}", parse_age("25"));
    // 下面这行目前会 panic，改好后应该打印错误信息
    // println!("{:?}", parse_age("abc"));
}
```

```expected
Ok(25)
Err("解析失败：invalid digit found in string")
```
