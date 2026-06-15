---
title: "方法与关联函数"
description: "学习如何在结构体上定义方法和关联函数，理解 impl 块、self 参数和自动引用解引用机制。"
difficulty: beginner
estimatedTime: 35
keywords: ["方法", "impl", "self", "关联函数", "接收者"]
---

# 从函数到方法

前面我们学过函数，也学过结构体。现在的问题是：如何让某个函数与某个结构体**紧密关联**？

比如，计算矩形面积的逻辑本质上是**矩形的行为**，而不是一个独立的工具函数。用函数实现需要这样：

```rust runnable
struct Rectangle {
    width: u32,
    height: u32,
}

fn area(rect: &Rectangle) -> u32 {
    rect.width * rect.height
}

fn main() {
    let rect = Rectangle { width: 30, height: 50 };
    println!("面积：{} 平方像素", area(&rect));
}
```

问题是：读代码的人需要去别处找 `area` 函数，且不清楚它属于哪个类型。如果 Rust 能把函数"附属"到结构体上就好了。

**方法** 就是解决这个问题的。方法是与某个类型相关联的函数，可以用 `.` 运算符调用：

```rust runnable
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

fn main() {
    let rect = Rectangle { width: 30, height: 50 };
    println!("面积：{} 平方像素", rect.area());
}
```

现在清晰多了：`area()` 是 `Rectangle` 的方法，调用时直接用 `rect.area()`。

# 定义方法

方法定义在 **`impl` 块**（implementation block）中。语法：

```rust runnable
struct Circle {
    radius: f64,
}

impl Circle {
    fn area(&self) -> f64 {
        3.14159 * self.radius * self.radius
    }

    fn is_large(&self) -> bool {
        self.area() > 100.0
    }
}

fn main() {
    let circle = Circle { radius: 5.0 };
    println!("圆的面积：{:.2}", circle.area());
    println!("是否很大？{}", circle.is_large());
}
```

**关键点：**
- `impl 类型名 { ... }` 定义该类型的实现块
- 方法的**第一个参数总是 `self`**，它代表调用方法的实例
- 方法在 `impl` 块中，与类型在同一个逻辑命名空间

## self 的三种形式

方法可以以三种方式接收 `self`，取决于方法是否需要修改实例：

### 1. `&self` — 不可变借用（最常用）

方法只需读取字段值：

```rust runnable
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn width(&self) -> bool {
        self.width > 0
    }
}

fn main() {
    let rect = Rectangle { width: 30, height: 50 };
    println!("面积：{}", rect.area());
    println!("宽度是否为正？{}", rect.width());
}
```

### 2. `&mut self` — 可变借用

方法需要修改字段值：

```rust runnable
struct Counter {
    count: i32,
}

impl Counter {
    fn increment(&mut self) {
        self.count += 1;
    }

    fn value(&self) -> i32 {
        self.count
    }
}

fn main() {
    let mut c = Counter { count: 0 };
    c.increment();
    c.increment();
    println!("计数器值：{}", c.value());
}
```

### 3. `self` — 获取所有权（不常见）

方法消费掉实例（获取完全所有权），调用后实例无法再用。这用于需要将实例转换成其他形式的情况：

```rust runnable
struct Document {
    content: String,
}

impl Document {
    fn into_uppercase(self) -> String {
        self.content.to_uppercase()
    }
}

fn main() {
    let doc = Document { content: String::from("hello") };
    let upper = doc.into_uppercase();
    println!("{}", upper);
    // println!("{}", doc.content);  // 错误！doc 已被转移
}
```

> **命名惯例**：获取所有权的方法经常用 `into_` 前缀，表示"消费转换"。比如 `into_uppercase()` 表示"消费这个实例，返回大写版本"。

## 多个参数的方法

方法可以有除 `self` 外的其他参数：

```rust runnable
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}

fn main() {
    let rect1 = Rectangle { width: 30, height: 50 };
    let rect2 = Rectangle { width: 10, height: 40 };
    let rect3 = Rectangle { width: 60, height: 45 };

    println!("rect1 能容纳 rect2？{}", rect1.can_hold(&rect2));
    println!("rect1 能容纳 rect3？{}", rect1.can_hold(&rect3));
}
```

# 关联函数

有时你需要一个与某个类型相关但**不作用于实例**的函数，比如构造函数。这叫**关联函数**（associated function）。定义方式是在 `impl` 块中不使用 `self` 参数：

```rust runnable
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 关联函数，用于创建正方形
    fn square(size: u32) -> Rectangle {
        Rectangle {
            width: size,
            height: size,
        }
    }

    // 普通方法
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

fn main() {
    // 用关联函数创建实例，用 :: 而不是 .
    let square = Rectangle::square(50);
    println!("正方形面积：{}", square.area());
}
```

**关键点：**
- 关联函数用 `::` 调用（命名空间操作符），如 `Rectangle::square(50)`
- `String::from()` 就是一个关联函数
- 关联函数经常用作**构造函数**（从某些数据创建实例）

# 多个 impl 块

你可以为同一个类型定义多个 `impl` 块。这在组织代码时很有用（虽然通常不必要）：

```rust runnable
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

impl Rectangle {
    fn perimeter(&self) -> u32 {
        2 * (self.width + self.height)
    }
}

fn main() {
    let rect = Rectangle { width: 30, height: 50 };
    println!("面积：{}, 周长：{}", rect.area(), rect.perimeter());
}
```

多个 `impl` 块在泛型和 trait（后续章节）中特别有用，可以为不同的类型参数或 trait 提供不同的实现。

# 自动引用和解引用

Rust 有一个方便的特性：调用方法时，**自动添加 `&`、`&mut` 或 `*` 以匹配方法签名**。

比如，方法签名是 `&self`，但你调用时用的可能是：

```rust runnable
struct Point {
    x: i32,
    y: i32,
}

impl Point {
    fn distance_from_origin(&self) -> f64 {
        ((self.x.pow(2) + self.y.pow(2)) as f64).sqrt()
    }
}

fn main() {
    let p = Point { x: 3, y: 4 };

    // 这四种调用方式都等价：
    p.distance_from_origin();      // 自动转为 (&p).distance_from_origin()
    (&p).distance_from_origin();   // 显式写出

    let p_ref = &p;
    p_ref.distance_from_origin();  // 也可以
}
```

这个特性使 Rust 的方法调用语法很优雅，无需手动管理引用。所以 `->`（C/C++ 的结构体指针成员访问符）在 Rust 里完全不需要——`.` 就够了，编译器会自动帮你处理。

# 练习题

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}
```

```quiz single
Q: 上面方法定义中，为什么使用 `&self` 而不是 `self`？
- 为了减少内存占用
+ 因为计算面积只需读取字段，不需要获取所有权
- 为了让代码更简洁
- Rust 要求所有方法都必须用 &self
E: area() 方法只需读取 width 和 height 字段，不需要修改也不需要消费实例，所以用 &self（不可变借用）最合适。如果用 self，调用后实例就失效了，这不合理。
```

```quiz multi
Q: 下列关于关联函数的说法，正确的是？（多选）
+ 关联函数在 impl 块中定义，但没有 self 参数
+ 关联函数用 Type::function_name() 调用
- 关联函数必须返回该类型的实例
+ String::from() 是一个关联函数示例
E: 关联函数可以有任意返回类型，不必是该类型本身。它们用来提供不属于某个实例的相关功能，如构造函数、工厂方法等。
```

```quiz single
Q: 下面哪个方法应该使用 `&mut self`？
- 计算矩形面积
+ 修改学生的成绩
- 获取电话号码
- 判断是否及格
E: &mut self 用于需要修改实例字段的方法。修改成绩涉及修改字段值，需要可变借用。其他操作只需读取，用 &self。
```

## 编程练习

### 练习 1：为结构体添加方法

定义一个 `Account` 结构体，包含 `balance`（f64）字段。为它实现三个方法：

```rust editable
struct Account {
    balance: f64,
}

impl Account {
    fn deposit(&mut self, amount: f64) {
        // TODO: 实现
    }

    fn withdraw(&mut self, amount: f64) -> bool {
        // TODO: 实现，余额不足返回 false，否则返回 true
    }

    fn get_balance(&self) -> f64 {
        // TODO: 实现
    }
}

fn main() {
    let mut account = Account { balance: 100.0 };

    println!("初始余额：{}", account.get_balance());

    account.deposit(50.0);
    println!("存入 50 后：{}", account.get_balance());

    if account.withdraw(30.0) {
        println!("取出 30 成功，余额：{}", account.get_balance());
    }

    if !account.withdraw(200.0) {
        println!("取出 200 失败（余额不足）");
    }
}
```

```expected
初始余额：100
存入 50 后：150
取出 30 成功，余额：120
取出 200 失败（余额不足）
```

### 练习 2：实现关联函数作为构造函数

定义一个 `Color` 结构体，包含 `r`、`g`、`b` 三个 `u8` 字段，写出对应关联函数和方法并实现三个功能：

```rust editable
#[derive(Debug)]
struct Color {
    r: u8,
    g: u8,
    b: u8,
}

// TODO: 返回白色 (255, 255, 255)
// TODO: 返回黑色 (0, 0, 0)
// TODO: 计算亮度（(r+g+b)/3）

fn main() {
    let white = Color::white();
    let black = Color::black();

    println!("白色亮度：{:.2}", white.brightness() as f64);
    println!("黑色亮度：{:.2}", black.brightness() as f64);
}
```

```expected
白色亮度：255.00
黑色亮度：0.00
```
