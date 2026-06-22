---
title: "多种错误来源与遍历 Result"
description: "学会用 Box<dyn Error> 处理多种错误来源，以及遍历集合时处理 Result 的三种实用策略。"
difficulty: beginner
estimatedTime: 20
keywords: ["Box<dyn Error>", "多种错误", "filter_map", "collect", "partition", "遍历Result"]
---

# 多种错误来源

## 遇到了什么问题

前几篇都用 `io::Error` 或 `ParseIntError` 这样的**单一错误类型**。但现实中一个函数经常遇到**多种错误来源**。比如——读取文件并解析里面的数字：

```rust runnable expect-error
use std::fs;
use std::num::ParseIntError;

fn double_from_file(path: &str) -> Result<i32, ???> {
    let content = fs::read_to_string(path)?;  // 可能是 io::Error
    let n: i32 = content.trim().parse()?;     // 可能是 ParseIntError
    Ok(n * 2)
}
```

返回类型 `Result<i32, ???>` 里该填什么？`io::Error` 和 `ParseIntError` 是两个不同的类型，`?` 无法同时返回两种。

## Box\<dyn Error\>：快速解决多种错误

`Box<dyn Error>` 是一个能容纳**任意错误类型**的容器。只要某个类型实现了 `Error` trait，就能被放进来。

> **理解 `Box<dyn Error>`**：`dyn Error` 是"实现了 Error trait 的某种类型"的意思，`Box` 是把它放在堆上（编译时不知道具体大小）。现阶段只需要知道它是个"通用错误容器"，详细原理在 trait 章节会讲。

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

`?` 会自动把 `io::Error` 和 `ParseIntError` 都转换成 `Box<dyn Error>`，不需要手动处理。

**优点**：代码极简，几乎不需要额外写任何东西。

**缺点**：调用者拿到的是一个"盒子"，无法直接判断里面是哪种错误、做精确处理（比如区分"文件不存在"和"格式不对"）。

> `Box<dyn Error>` 适合：应用程序的 `main` 函数、脚本、快速原型。**不适合**：需要让调用者精确匹配错误类型的库。

## 需要精确错误类型时怎么办

对外暴露 API 的库，往往需要让调用者能精确 `match` 不同的错误情况，这时候就要**定义自己的错误枚举**，并为它实现 `Display`、`Error`、`From` 等 trait。

这部分涉及 trait 的实现语法，放在 trait 章节会讲得更清楚——详见[《实战：自定义错误类型》](/RustCourse/chapters/10-generics-traits/07-custom-errors)，那里有完整的四步骤实现和原理解析。

# 遍历 Result

## 迭代器中的错误处理

> 下面的代码用到了闭包（`|s| ...`）和迭代器（`.map()`、`.collect()` 等），这些语法会在后续章节详细讲解。这里先看整体用法，理解"遇到错误时有哪些处理策略"即可，细节后续自然会清楚。

当你对一个集合做 `map` 操作时，每个元素的转换可能失败。Rust 提供了三种实用策略：

```rust runnable
fn main() {
    let strings = vec!["1", "两", "3", "4"];

    // 策略一：filter_map — 忽略失败项，只保留成功的
    let numbers: Vec<i32> = strings.iter()
        .filter_map(|s| s.parse::<i32>().ok())
        .collect();
    println!("忽略失败：{:?}", numbers);  // [1, 3, 4]

    // 策略二：collect 到 Result — 遇到第一个失败就整体返回 Err
    let result: Result<Vec<i32>, _> = strings.iter()
        .map(|s| s.parse::<i32>())
        .collect();
    println!("遇错即停：{:?}", result);  // Err(...)

    // 策略三：partition — 把成功和失败分开收集
    let (ok_vals, err_vals): (Vec<_>, Vec<_>) = strings.iter()
        .map(|s| s.parse::<i32>())
        .partition(Result::is_ok);
    let numbers: Vec<i32> = ok_vals.into_iter().map(Result::unwrap).collect();
    let errors: Vec<_>    = err_vals.into_iter().map(Result::unwrap_err).collect();
    println!("分开收集：ok={:?}, err={:?}", numbers, errors);
}
```

三种策略各有用途：

| 策略 | 适用场景 |
|------|---------|
| `filter_map(.ok())` | 不关心失败项，只要成功的结果 |
| `collect::<Result<Vec<_>,_>>()` | 要么全部成功，要么整体失败（数据导入等批量操作） |
| `partition(Result::is_ok)` | 既要成功结果，也要收集所有错误信息 |

# 练习题

## 多种错误来源测验

```quiz single
Q: Box<dyn Error> 和自定义错误枚举相比，主要缺点是什么？
- 代码更复杂，需要实现很多 trait
+ 调用者拿到后无法精确区分是哪种错误，不能做分类处理
- 不支持 ? 运算符
- 性能比自定义错误类型差很多
E: Box<dyn Error> 是不透明的容器，调用者只能打印错误信息，无法 match 具体是 io::Error 还是 ParseIntError。自定义错误枚举则允许调用者精确匹配每种情况。
```

```quiz single
Q: Box<dyn Error> 最适合哪种场景？
- 对外发布的库的 API
- 需要精确匹配错误类型的场景
+ 应用程序 main 函数、脚本或快速原型
- 需要错误类型在运行时可比较的场景
E: Box<dyn Error> 代码简单，适合不需要精确处理错误类型的场景——比如 main 函数打印错误后退出、一次性脚本、原型开发。库的对外 API 则通常需要自定义错误枚举让调用者能精确处理。
```

```quiz single
Q: 遍历一个字符串列表并解析为数字，希望"遇到任何一个解析失败就整体失败"，应该用哪种策略？
- filter_map(|s| s.parse().ok())
+ .map(|s| s.parse()).collect::<Result<Vec<_>, _>>()
- partition(Result::is_ok)
- .map(|s| s.parse().unwrap())
E: collect::<Result<Vec<_>, _>>() 利用了 Result 实现了 FromIterator 的特性：遇到第一个 Err 就停止，返回整个 Err。filter_map 会忽略失败项，partition 会把成功和失败分开但都保留，unwrap 遇到失败会 panic。
```

## 编程练习

### 练习一：修复错误传播

下面这个函数无法编译，因为函数体内可能出现两种不同的错误类型，但返回类型只写了 `io::Error`。把返回类型改成能容纳任意错误的类型，使其编译通过。

```rust editable
use std::fs;
use std::io;

fn read_number(path: &str) -> Result<i32, io::Error> {
    let content = fs::read_to_string(path)?;
    let n: i32 = content.trim().parse()?;
    Ok(n)
}

fn main() {
    match read_number("number.txt") {
        Ok(n)  => println!("数字是 {}", n),
        Err(e) => println!("出错了：{}", e),
    }
}
```

```expected
出错了：No such file or directory (os error 2)
```

### 练习二：用迭代器处理错误

把能转换成整数的字符串保留下来，不能转换的跳过。请用 `filter_map` 补全代码。

```rust editable
fn main() {
    let inputs = vec!["1", "two", "3", "四", "5"];

    // 使用 filter_map 过滤掉无法解析的，只保留成功解析的整数
    let numbers: Vec<i32> = inputs.iter()
        .filter_map(|s| s.parse::<i32>().???)
        .collect();

    println!("{:?}", numbers);
}
```

```expected
[1, 3, 5]
```
