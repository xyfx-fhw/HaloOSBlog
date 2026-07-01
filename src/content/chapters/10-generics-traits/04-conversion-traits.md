---
title: "转换 Trait"
description: "掌握 Rust 中的转换 trait 系统，学会为自定义类型实现 From/Into/TryFrom/TryInto，理解它们的关系和使用场景。"
difficulty: intermediate
estimatedTime: 45
keywords: ["转换", "trait", "From", "Into", "TryFrom", "TryInto", "类型转换"]
---

# 转换 Trait 系统

## 为什么需要转换 Trait

前面在"类型系统"章节学过，Rust 不提供**隐式类型转换**。但有时我们需要将一个类型**安全地、优雅地**转换为另一个类型。

转换 trait 提供了：
- **显式意图**：清楚地表达"这是一个转换"
- **灵活性**：支持任意类型之间的转换
- **错误处理**：某些转换可能失败，使用 `Result` 处理
- **自动化**：实现一个 trait，自动获得相关功能

## From 和 Into Trait

### From Trait：构造自我

`From<T>` trait 表示"我可以从 T 构造自己"：

```rust
trait From<T> {
    fn from(value: T) -> Self;
}
```

**标准库中已有的 From 实现：**

```rust runnable
fn main() {
    // String::from(&str)
    let s1 = String::from("hello");

    // i32 实现了 From<u16>
    let num: i32 = 100u16.into();

    println!("s1: {}, num: {}", s1, num);
}
```

### 为自定义类型实现 From

```rust runnable
use std::convert::From;

#[derive(Debug)]
struct Number {
    value: i32,
}

impl From<i32> for Number {
    fn from(item: i32) -> Self {
        Number { value: item }
    }
}

fn main() {
    let num1 = Number::from(30);
    println!("方式 1 - from: {:?}", num1);

    // 自动获得 into（不用手动实现）
    let num2: Number = 40.into();
    println!("方式 2 - into: {:?}", num2);
}
```

### Into Trait：转换为他人

`Into<T>` trait 表示"我可以转换成 T"：

```rust
trait Into<T> {
    fn into(self) -> T;
}
```

**关键点**：如果你为类型 A 实现了 `From<B>`，编译器会**自动**为 B 实现 `Into<A>`。它们互为倒数。

### From vs Into：何时用哪个

- **实现转换时**：总是实现 `From`，自动获得 `Into`
- **使用转换时**：
  - 如果有明确的源类型，用 `From`
  - 如果需要类型推导，用 `Into`

```rust runnable
use std::convert::From;

#[derive(Debug)]
struct Point(i32, i32);

impl From<(i32, i32)> for Point {
    fn from((x, y): (i32, i32)) -> Self {
        Point(x, y)
    }
}

// 接受任何能转为 Point 的类型
fn make_point<T: Into<Point>>(x: T) -> Point {
    x.into()
}

fn main() {
    let p1 = Point::from((1, 2));
    let p2: Point = (3, 4).into();
    let p3 = make_point((5, 6));

    println!("p1: {:?}, p2: {:?}, p3: {:?}", p1, p2, p3);
}
```

## TryFrom 和 TryInto Trait

### 可能失败的转换

某些转换不一定成功。例如，验证范围、检查有效性等。对于这样的情况，使用 `Try*` trait：

```rust
trait TryFrom<T> {
    type Error;

    fn try_from(value: T) -> Result<Self, Self::Error>;
}

trait TryInto<T> {
    type Error;

    fn try_into(self) -> Result<T, Self::Error>;
}
```

### 实现 TryFrom

```rust runnable
use std::convert::TryFrom;

#[derive(Debug, PartialEq)]
struct EvenNumber(i32);

impl TryFrom<i32> for EvenNumber {
    type Error = &'static str;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        if value % 2 == 0 {
            Ok(EvenNumber(value))
        } else {
            Err("不是偶数")
        }
    }
}

fn main() {
    match EvenNumber::try_from(4) {
        Ok(num) => println!("成功：{:?}", num),
        Err(e) => println!("失败：{}", e),
    }

    match EvenNumber::try_from(3) {
        Ok(num) => println!("成功：{:?}", num),
        Err(e) => println!("失败：{}", e),
    }
}
```

### TryInto 的自动实现

就像 `Into` 自动实现一样，实现 `TryFrom` 会自动获得 `TryInto`：

```rust runnable
use std::convert::TryFrom;

#[derive(Debug)]
struct PositiveNumber(u32);

impl TryFrom<i32> for PositiveNumber {
    type Error = String;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        if value > 0 {
            Ok(PositiveNumber(value as u32))
        } else {
            Err(format!("期望正数，得到 {}", value))
        }
    }
}

fn main() {
    // 方式 1：使用 try_from
    match PositiveNumber::try_from(5) {
        Ok(n) => println!("try_from: {:?}", n),
        Err(e) => println!("错误：{}", e),
    }

    // 方式 2：使用 try_into（自动提供）
    let result: Result<PositiveNumber, _> = 10i32.try_into();
    match result {
        Ok(n) => println!("try_into: {:?}", n),
        Err(e) => println!("错误：{}", e),
    }
}
```

## 转换 Trait 关系图

```text
From<T> for A  ←→  Into<A> for T
     ↓                    ↓
TryFrom<T> for A  ←→  TryInto<A> for T
```

- 实现 `From<T>` 自动获得 `Into`
- 实现 `TryFrom<T>` 自动获得 `TryInto`
- `From`/`Into` 用于**总是成功**的转换
- `TryFrom`/`TryInto` 用于**可能失败**的转换

# 练习题

## From 和 Into 测验

```rust
struct Color(u8, u8, u8);

impl From<(u8, u8, u8)> for Color {
    fn from((r, g, b): (u8, u8, u8)) -> Self {
        Color(r, g, b)
    }
}

fn main() {
    let c: Color = (255, 0, 0).into();
}
```

```quiz single
Q: 下列代码会编译通过吗？
- 不会，(u8, u8, u8) 无法转为 Color
- 需要显式标注类型
+ 会，into() 会自动从 From 实现推导
- 不会，需要显式实现 Into trait
E: From 自动提供 Into。所以 (255, 0, 0).into() 能找到 From<(u8, u8, u8)> for Color 的实现。
```

```quiz single
Q: 下列关于 From 和 Into 的说法，正确的是？
- 必须同时实现 From 和 Into
- Into 是主要 trait，From 是衍生品
+ 实现 From<T> 会自动获得 Into
- 两个 trait 完全独立，没有关系
E: 如果为类型 A 实现了 From<B>，编译器会自动为 B 实现 Into<A>。只需实现 From，不用手动实现 Into。
```

## TryFrom 和 TryInto 测验

```rust
use std::convert::TryFrom;

#[derive(Debug)]
struct EvenNumber(i32);

impl TryFrom<i32> for EvenNumber {
    type Error = String;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        if value % 2 == 0 {
            Ok(EvenNumber(value))
        } else {
            Err(String::from("不是偶数"))
        }
    }
}
```

```quiz single
Q: TryFrom 和 From 的主要区别是什么？
- 没有本质区别
+ TryFrom 返回 Result，用于可能失败的转换
- TryFrom 更快
- TryFrom 只用于内置类型
E: From 用于总是成功的转换，TryFrom 返回 Result<T, E> 用于可能失败的转换。
```

```quiz multi
Q: 下列关于 TryFrom 的说法，正确的是？（多选）
+ 需要定义关联类型 Error
+ 实现 TryFrom<T> 会自动获得 TryInto
+ 可以用 try_into() 方法使用 TryInto
- TryFrom 总是返回 Ok
E: TryFrom 必须定义 Error 关联类型。自动获得 TryInto，使用 try_into() 调用。返回值是 Result，可能是 Ok 或 Err。
```

## 编程练习

为 `Point` 实现 `From<(i32, i32)>`，然后分别用 `From::from()` 和 `.into()` 两种方式创建 `Point`：

```rust editable
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

// TODO: 为 Point 实现 From<(i32, i32)>


fn main() {
    // 用 From 显式转换
    let p1 = Point::from((1, 2));
    println!("p1: {:?}", p1);

    // 用 Into 隐式转换（由 From 自动推导，需标注目标类型）
    let p2: Point = (3, 4).into();
    println!("p2: {:?}", p2);
}
```

```expected
p1: Point { x: 1, y: 2 }
p2: Point { x: 3, y: 4 }
```
