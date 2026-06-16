---
title: "综合练习"
description: "综合检验对类型推导、转换、别名的理解，通过完整的编程项目掌握类型系统的各个方面。"
difficulty: intermediate
estimatedTime: 60
keywords: ["综合练习", "类型系统", "转换", "推导"]
---

# 代码判断题

## 题目 1：类型推导的跨行推导

```rust
fn main() {
    let mut collection = Vec::new();
    collection.push(42);
    collection.push(100u32);
}
```

```quiz single
Q: 这段代码能编译吗？
- 能，编译器会自动转换
+ 不能，42 推导为 i32，而 100u32 是 u32，类型冲突
- 能，两者都会转为 i32
- 不能，Vec::new() 需要类型标注
E: 第一个 push 确定了元素类型是 i32，第二个 push 的 u32 不匹配，导致编译错误。
```

## 题目 2：类型转换中的数据丧失

```rust
fn main() {
    let f: f32 = 1000.5;
    let i = f as i32;
    println!("{}", i);
}
```

```quiz single
Q: 输出是什么？
- 1000.5
+ 1000
- 1001
- 编译错误
E: 浮点转整数时舍弃小数部分（向 0 取整）。1000.5 转为 1000。
```

## 题目 3：整数溢出的转换

```rust
fn main() {
    let x = 256u16;
    let y = x as u8;
    println!("{}", y);
}
```

```quiz single
Q: 输出是什么？
- 256
+ 0
- 255
- 编译错误
E: 256 = 0x100（2 个字节）。转为 u8 时只保留低 8 位：0x00 = 0。
```

## 题目 4：类型别名的类型安全

```rust
type UserId = u32;
type ProductId = u32;

fn main() {
    let user: UserId = 1;
    let product: ProductId = 2;
    println!("{}", user + product);
}
```

```quiz single
Q: 这段代码能编译吗？
+ 能，别名不提供类型安全
- 不能，UserId 和 ProductId 是不同类型
- 不能，需要显式转换
- 需要实现 From trait
E: 类型别名只是现有类型的新名字，不创建新类型。UserId 和 ProductId 本质上都是 u32，完全兼容。
```

## 题目 5：From trait 和 Into trait

```rust
use std::convert::From;

#[derive(Debug)]
struct Point(i32, i32);

impl From<(i32, i32)> for Point {
    fn from((x, y): (i32, i32)) -> Self {
        Point(x, y)
    }
}

fn main() {
    let p1 = Point::from((1, 2));
    let p2: Point = (3, 4).into();
}
```

```quiz single
Q: 这段代码能编译吗？
+ 能，from 的实现自动提供 into
- 不能，必须显式实现 Into
- 不能，类型标注有问题
- 需要导入 Into trait
E: 实现 From<T> 会自动获得 Into。所以 (3, 4).into() 能正常工作。
```

---

# 编程练习

## 练习 1：类型推导与转换

完成以下函数，展示类型推导和转换的配合使用：

```rust editable
use std::collections::HashMap;

fn main() {
    // TODO: 创建一个 HashMap 来存储学生成绩
    // 键是学生名字（String），值是成绩（i32）
    // 通过 insert 操作让编译器推导出正确的类型
    let mut grades: HashMap<_, _> = HashMap::new();
    grades.insert(String::from("Alice"), 88);
    grades.insert("Bob".to_string(), 92);
    // TODO: 再添加 Charlie 的成绩 85
    
    // TODO: 将成绩转为浮点数后输出平均分
    let total: i32 = grades.values().sum();
    let count = grades.len() as f64;
    let average = total as f64 / count;
    println!("平均分：{:.2}", average);
    
    // TODO: 使用 turbofish 将字符串解析为成绩
    let extra: i32 = "90".parse::<i32>().unwrap();
    println!("额外成绩：{}", extra);
}
```

```expected
平均分：88.33
额外成绩：90
```

## 练习 2：实现 From trait

为自定义类型实现 From，并验证 Into 的自动提供：

```rust editable
use std::convert::From;

#[derive(Debug)]
struct Color {
    red: u8,
    green: u8,
    blue: u8,
}

// TODO: 为 Color 实现 From<(u8, u8, u8)>
// 接受一个 RGB 元组并创建 Color 实例


fn main() {
    // 使用 From
    let c1 = Color::from((255, 0, 0));
    println!("c1: {:?}", c1);
    
    // 使用 Into（自动从 From 推导）
    let c2: Color = (0, 255, 0).into();
    println!("c2: {:?}", c2);
    
    // TODO: 再创建一个蓝色 (0, 0, 255)，使用 Into
    
}
```

```expected
c1: Color { red: 255, green: 0, blue: 0 }
c2: Color { red: 0, green: 255, blue: 0 }
```

## 练习 3：TryFrom 与错误处理

实现一个 TryFrom 来验证数据有效性：

```rust editable
use std::convert::TryFrom;

#[derive(Debug, PartialEq)]
struct Percentage(u8);

// TODO: 为 Percentage 实现 TryFrom<i32>
// 只有 0-100 之间的值才有效
// 错误类型使用 &'static str


fn main() {
    // 成功情况
    match Percentage::try_from(50) {
        Ok(p) => println!("成功：{:?}", p),
        Err(e) => println!("错误：{}", e),
    }
    
    // 失败情况
    match Percentage::try_from(150) {
        Ok(p) => println!("成功：{:?}", p),
        Err(e) => println!("错误：{}", e),
    }
    
    // 使用 try_into
    let result: Result<Percentage, _> = 75i32.try_into();
    println!("try_into 结果：{:?}", result);
}
```

```expected
成功：Percentage(50)
错误：百分比必须在 0-100 之间
try_into 结果：Ok(Percentage(75))
```

## 练习 4：字符串与类型互转

完成字符串的解析和转换操作：

```rust editable
fn main() {
    // TODO: 将字符串数组 ["10", "20", "30"] 解析为整数向量
    let str_nums = vec!["10", "20", "30"];
    
    
    // TODO: 计算整数向量的和
    
    
    // TODO: 将整数和转为字符串
    
    
    // TODO: 安全地解析可能无效的字符串
    let invalid_inputs = vec!["42", "abc", "100"];
    for input in invalid_inputs {
        match input.parse::<i32>() {
            Ok(n) => println!("'{}' -> 整数 {}", input, n),
            Err(_) => println!("'{}' 无法解析", input),
        }
    }
}
```

```expected
解析后的整数：[10, 20, 30]
总和：60
总和字符串：60
'42' -> 整数 42
'abc' 无法解析
'100' -> 整数 100
```

## 练习 5：综合项目：温度转换器

实现一个支持 From/Into 和 TryFrom 的温度转换系统：

```rust editable
use std::convert::{From, TryFrom};

#[derive(Debug, Clone, Copy, PartialEq)]
struct Celsius(f64);

#[derive(Debug, Clone, Copy, PartialEq)]
struct Fahrenheit(f64);

// TODO: 为 Fahrenheit 实现 From<Celsius>
// 转换公式：F = C × 9/5 + 32


// TODO: 为 Celsius 实现 TryFrom<Fahrenheit>
// 只接受 F >= -459.67（绝对零度）的值
// 错误类型：&'static str


fn main() {
    // 使用 From 转换
    let celsius = Celsius(0.0);
    let fahrenheit: Fahrenheit = celsius.into();
    println!("0°C = {:?}", fahrenheit);
    
    // 使用 TryFrom 转换
    match Celsius::try_from(Fahrenheit(32.0)) {
        Ok(c) => println!("32°F = {:?}", c),
        Err(e) => println!("错误：{}", e),
    }
    
    // 错误情况
    match Celsius::try_from(Fahrenheit(-500.0)) {
        Ok(c) => println!("-500°F = {:?}", c),
        Err(e) => println!("错误：{}", e),
    }
}
```

```expected
0°C = Fahrenheit(32.0)
32°F = Celsius(0.0)
错误：温度过低，低于绝对零度
```
