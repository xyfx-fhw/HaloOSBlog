---
title: "转换 trait 与字符串转换"
description: "深入理解 From、Into、TryFrom、TryInto trait，学会实现自定义转换，掌握字符串与其他类型的互转方法。"
difficulty: intermediate
estimatedTime: 40
keywords: ["转换", "trait", "From", "Into", "TryFrom", "TryInto", "字符串转换"]
---

# 转换 trait（理论）

## 为什么需要转换 trait

之前学过的 `as` 关键字是**显式类型铸造**，适用于原始类型间的转换。但对于**自定义类型的转换**，我们需要更灵活、更安全的方式。

转换 trait 提供了：
- **显式意图**：清楚地表达"这是一个转换"
- **灵活性**：支持任意类型之间的转换
- **错误处理**：某些转换可能失败，使用 `Result` 处理
- **自动化**：实现一个 trait，自动获得相关功能

## From 和 Into trait

### From trait：构造自我

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
    let num: i32 = 100u16.into();  // 等等，这里用的是 into？
    
    println!("s1: {}, num: {}", s1, num);
}
```

### Into trait：转换为他人

`Into<T>` trait 表示"我可以转换成 T"：

```rust
trait Into<T> {
    fn into(self) -> T;
}
```

**关键点**：如果你为类型 A 实现了 `From<B>`，编译器会**自动**为 B 实现 `Into<A>`。它们互为倒数。

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
    // 直接用 from
    let num1 = Number::from(30);
    println!("方式 1 - from: {:?}", num1);
    
    // 自动获得 into（不用手动实现）
    let num2: Number = 40.into();
    println!("方式 2 - into: {:?}", num2);
}
```

### 何时用 From，何时用 Into

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

fn make_point<T: Into<Point>>(x: T) -> Point {
    // 接受任何能转为 Point 的类型
    x.into()
}

fn main() {
    let p1 = Point::from((1, 2));
    let p2: Point = (3, 4).into();
    let p3 = make_point((5, 6));
    
    println!("p1: {:?}, p2: {:?}, p3: {:?}", p1, p2, p3);
}
```

## TryFrom 和 TryInto trait

### 可能失败的转换

某些转换不一定成功。例如，将 `i32` 转为 `u8` 可能溢出。对于这样的情况，使用 `Try*` trait：

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
    
    // 方式 3：失败情况
    let result: Result<PositiveNumber, _> = (-5i32).try_into();
    if let Err(e) = result {
        println!("预期的错误：{}", e);
    }
}
```

---

# 字符串转换（实战）

## ToString 和字符串转换

### Display trait → ToString

任何实现 `fmt::Display` 的类型都自动获得 `to_string()` 方法：

```rust runnable
use std::fmt;

#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

fn main() {
    let p = Point { x: 3, y: 4 };
    
    // 直接调用 to_string()（来自 Display）
    let s = p.to_string();
    println!("Point 转为字符串：{}", s);
}
```

> **最佳实践**：如果想将类型转为字符串，实现 `fmt::Display`，而不是直接实现 `ToString`。

### 直接实现 ToString（不推荐）

如果类型不需要 `Debug` 打印，可以直接实现 `ToString`：

```rust runnable
use std::string::ToString;

struct Circle {
    radius: i32,
}

impl ToString for Circle {
    fn to_string(&self) -> String {
        format!("Circle with radius {}", self.radius)
    }
}

fn main() {
    let c = Circle { radius: 5 };
    println!("{}", c.to_string());
}
```

## FromStr trait：解析字符串

### 将字符串解析为类型

任何实现 `FromStr` 的类型都可以用 `parse()` 方法从字符串转换：

```rust runnable
fn main() {
    // 标准库中，i32、f64 等都实现了 FromStr
    
    // 方式 1：显式标注类型
    let num: i32 = "42".parse().expect("解析失败");
    println!("解析结果：{}", num);
    
    // 方式 2：使用 turbofish
    let num2 = "3.14".parse::<f64>().expect("解析失败");
    println!("浮点数：{}", num2);
    
    // 方式 3：错误处理
    match "hello".parse::<i32>() {
        Ok(n) => println!("成功：{}", n),
        Err(e) => println!("失败：{}", e),
    }
}
```

### 为自定义类型实现 FromStr

```rust runnable
use std::str::FromStr;
use std::num::ParseIntError;

#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

impl FromStr for Point {
    type Err = ParseIntError;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let coords: Vec<&str> = s.split(',').collect();
        if coords.len() != 2 {
            return Err("格式错误：期望 'x,y'".parse::<i32>().unwrap_err());
        }
        
        let x = coords[0].parse::<i32>()?;
        let y = coords[1].parse::<i32>()?;
        
        Ok(Point { x, y })
    }
}

fn main() {
    match "3,4".parse::<Point>() {
        Ok(p) => println!("解析成功：{:?}", p),
        Err(_) => println!("解析失败"),
    }
    
    // 错误情况
    if let Err(_) = "invalid".parse::<Point>() {
        println!("无效格式");
    }
}
```

## 字符串与数字的互转

### 常见的字符串转换

```rust runnable
fn main() {
    // 字符串 -> 数字
    let int: i32 = "123".parse().unwrap();
    let float: f64 = "3.14".parse().unwrap();
    println!("int: {}, float: {}", int, float);
    
    // 数字 -> 字符串
    let num = 42;
    let s1 = num.to_string();
    let s2 = format!("数字是 {}", num);
    println!("s1: {}, s2: {}", s1, s2);
    
    // 布尔值 -> 字符串
    let b = true;
    println!("布尔值字符串：{}", b.to_string());
}
```

### 处理转换错误

```rust runnable
fn main() {
    // 使用 parse 时总是可能失败
    let inputs = vec!["42", "hello", "3.14", "999"];
    
    for input in inputs {
        match input.parse::<i32>() {
            Ok(n) => println!("'{}' -> {}", input, n),
            Err(_) => println!("'{}' 无法解析为 i32", input),
        }
    }
}
```

---

# 练习题

## From 和 Into 测验

```quiz single
Q: 下列关于 From 和 Into 的说法，正确的是？
- 两个 trait 完全独立，没有关系
+ 实现 From<T> 会自动获得 Into
- 必须同时实现 From 和 Into
- Into 是主要 trait，From 是衍生品
E: 如果为类型 A 实现了 From<B>，编译器会自动为 B 实现 Into<A>。只需实现 From，不用手动实现 Into。
```

```quiz single
Q: 下列代码会编译通过吗？
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
+ 会，into() 会自动从 From 实现推导
- 不会，需要显式实现 Into trait
- 不会，(u8, u8, u8) 无法转为 Color
- 需要显式标注类型
E: From 自动提供 Into。所以 (255, 0, 0).into() 能找到 From<(u8, u8, u8)> for Color 的实现。
```

## TryFrom 和 TryInto 测验

```quiz single
Q: TryFrom 和 From 的主要区别是什么？
- TryFrom 更快
+ TryFrom 返回 Result，用于可能失败的转换
- TryFrom 只用于内置类型
- 没有本质区别
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

## 字符串转换测验

```quiz single
Q: 要把字符串 "42" 转为 i32，下列哪种写法是错误的？
+ `let n = "42" as i32;`
- `let n: i32 = "42".parse().unwrap();`
- `let n = "42".parse::<i32>().unwrap();`
- 以上都是正确的
E: `as` 只用于原始类型转换，不用于字符串。字符串需要用 `parse()` 方法结合 FromStr trait。
```

```quiz single
Q: 下列代码的输出是什么？
```rust
fn main() {
    let num = 42i32;
    let s = num.to_string();
    println!("{}", s);
}
```
- 不能编译
- 输出类似 "Number(42)"
+ 输出 "42"
- 输出 "i32"
E: i32 实现了 Display trait，所以 to_string() 会输出数字的字符串表示 "42"。
```

## 编程练习

### 练习 1：实现 From 和 Into

为自定义类型实现 From trait，并使用 Into：

```rust editable
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

// TODO: 为 Rectangle 实现 From<(u32, u32)>
// from 方法应该接受一个元组 (width, height)


fn main() {
    // 使用 From
    let rect1 = Rectangle::from((10, 20));
    println!("rect1: {:?}", rect1);
    
    // 使用 Into（自动从 From 推导）
    let rect2: Rectangle = (15, 25).into();
    println!("rect2: {:?}", rect2);
}
```

```expected
rect1: Rectangle { width: 10, height: 20 }
rect2: Rectangle { width: 15, height: 25 }
```

### 练习 2：实现 TryFrom

为自定义类型实现 TryFrom，用于可能失败的转换：

```rust editable
use std::convert::TryFrom;

#[derive(Debug, PartialEq)]
struct Age(u8);

// TODO: 为 Age 实现 TryFrom<i32>
// 如果值不在 0-150 范围内，返回错误信息 "年龄超出范围"
// 如果成功，创建 Age 结构体


fn main() {
    // 成功情况
    match Age::try_from(25) {
        Ok(age) => println!("成功：{:?}", age),
        Err(e) => println!("错误：{}", e),
    }
    
    // 失败情况
    match Age::try_from(200) {
        Ok(age) => println!("成功：{:?}", age),
        Err(e) => println!("错误：{}", e),
    }
    
    // 使用 try_into
    let result: Result<Age, _> = 30i32.try_into();
    println!("try_into 结果：{:?}", result);
}
```

```expected
成功：Age(25)
错误：年龄超出范围
try_into 结果：Ok(Age(30))
```

### 练习 3：字符串解析

完成字符串解析的练习：

```rust editable
fn main() {
    // TODO: 将字符串 "123" 解析为 i32
    let num1 = "123".parse::<i32>().unwrap();
    println!("num1: {}", num1);
    
    // TODO: 将浮点数 3.14 转为字符串
    let float_val = 3.14f64;
    
    
    // TODO: 尝试解析 "invalid"，并处理错误
    match "invalid".parse::<i32>() {
        Ok(n) => println!("解析成功：{}", n),
        Err(_) => println!("解析失败"),
    }
    
    println!("浮点数字符串：{}", );
}
```

```expected
num1: 123
浮点数字符串：3.14
解析失败
```
