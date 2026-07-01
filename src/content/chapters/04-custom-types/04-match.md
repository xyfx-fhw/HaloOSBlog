---
title: "模式匹配与 match 表达式"
description: "掌握 Rust 强大的模式匹配机制，学习 match 表达式如何安全地解构枚举和 Option，以及编译器如何确保穷尽性。"
difficulty: beginner
estimatedTime: 40
keywords: ["match", "模式", "穷尽性", "绑定", "通配符"]
---

# match 表达式的威力

`match` 是 Rust 中最强大的控制流构造，它结合了 C 的 `switch` 和模式匹配的强大功能。（上一节你可能已经看到了如何使用，本篇文章我们将深入一些细节）

基本思想：
1. 比较一个值与一系列模式
2. 执行与第一个匹配的模式对应的代码
3. **编译器强制检查所有可能的情况**

## 基本 match 语法

```rust runnable
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: Coin) -> u32 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}

fn main() {
    println!("Penny 价值 {} 美分", value_in_cents(Coin::Penny));
    println!("Quarter 价值 {} 美分", value_in_cents(Coin::Quarter));
}
```

**结构：**
- `match 表达式 { ... }` — 要匹配的值放在 `match` 后
- 每个分支：`模式 => 代码`
- 分支间用逗号分隔
- 多行代码用大括号：`模式 => { ... }`

# 绑定匹配值中的数据

枚举成员常包含数据，`match` 可以解构这些数据：

```rust runnable
enum UsState {
    Alabama,
    Alaska,
    Arizona,
}

enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState),
}

fn describe_coin(coin: Coin) -> String {
    match coin {
        Coin::Penny => String::from("闪闪发光的便士"),
        Coin::Nickel => String::from("镍币"),
        Coin::Dime => String::from("十美分硬币"),
        Coin::Quarter(state) => {
            format!("来自 {:?} 的 25 美分硬币", state)
        }
    }
}

fn main() {
    let coin = Coin::Quarter(UsState::Alaska);
    println!("{}", describe_coin(coin));
}
```

当匹配 `Quarter(state)` 时，`state` 被**绑定**到内部的 `UsState` 值。

# 穷尽性与模式匹配

`match` 的核心是两个特性：**穷尽性检查**（所有情况都必须处理）和**灵活的模式**（提取或忽略你关心的部分）。

## 穷尽性检查：必须处理所有情况

`match` 必须覆盖所有可能的情况，否则编译失败：

```rust runnable expect-error
enum TrafficLight {
    Red,
    Yellow,
    Green,
}

fn check_light(light: TrafficLight) {
    match light {
        TrafficLight::Red => println!("停止"),
        TrafficLight::Yellow => println!("准备"),
        // 编译错误：缺少 Green 分支
    }
}
```

编译器会明确告诉你哪个情况被遗漏。这防止了难以追踪的逻辑 bug。

## 用 catch-all 模式满足穷尽性

当有很多情况但你只关心其中几个时，用 `_` 或变量名作为 catch-all 模式来处理其他所有情况：

### 方案一：用 `_` 丢弃其他值

```rust runnable
fn describe_number(n: u8) {
    match n {
        0 => println!("零"),
        1 => println!("一"),
        2 => println!("二"),
        _ => println!("其他数字"),  // 满足穷尽性，但不使用值
    }
}

fn main() {
    describe_number(0);
    describe_number(5);
}
```

### 方案二：用变量名捕获其他值

```rust runnable
fn main() {
    let dice_roll = 9;

    match dice_roll {
        3 => println!("加帽子"),
        7 => println!("移除帽子"),
        other => println!("移动玩家 {} 步", other),  // other 捕获了值 9
    }
}
```

**对比：**
- `_` — 匹配任何值但丢弃（不能使用）
- `other`（或任何变量名） — 匹配任何值并将其绑定到变量（可以在分支中使用）

## 提取部分值：灵活提取关心的字段

match 时，你可以选择性地提取字段，而不必全部提取。

### 用 `_` 忽略元组中的字段

```rust runnable
#[derive(Debug)]
enum Point {
    Point2D(i32, i32),
    Point3D(i32, i32, i32),
}

fn main() {
    let p = Point::Point3D(1, 2, 3);

    match p {
        Point::Point3D(x, _, _) => println!("只关心 x：{}", x),
        Point::Point2D(x, y) => println!("2D 点：({}, {})", x, y),
    }
}
```

### 用 `..` 忽略结构体中的字段

```rust runnable
#[derive(Debug)]
enum Person {
    Student { name: String, grade: u32 },
    Teacher { name: String, subject: String },
}

fn main() {
    let person = Person::Student {
        name: String::from("Alice"),
        grade: 10,
    };

    match person {
        Person::Student { name, .. } => {
            // 只提取 name，其他用 .. 忽略
            println!("{} 是学生", name);
        }
        Person::Teacher { subject, .. } => {
            println!("教科目：{}", subject);
        }
    }
}
```

### 提取字段的简写语法

在 match 模式中，`{key}` 是 `{key: key}` 的简写——字段名同时也是绑定的变量名。如果想用不同的变量名，才需要用完整形式 `{key: var_name}`：

```rust runnable
#[derive(Debug)]
enum Config {
    Set { host: String, port: u32 },
}

fn main() {
    let cfg = Config::Set {
        host: String::from("localhost"),
        port: 8080,
    };

    match cfg {
        // 简写形式：{host, port} 相当于 {host: host, port: port}
        Config::Set { host, port } => {
            println!("连接到 {}:{}", host, port);
        }
    }

    // 如果要用不同的变量名，用完整形式
    match cfg {
        Config::Set { host: h, port: p } => {
            println!("连接到 {}:{}", h, p);
        }
    }
}
```

**小结：** 穷尽性检查要求覆盖所有情况，而灵活的模式（`_`、`..`、变量名）让你按需提取或忽略数据。

## 多个模式匹配同一分支

有时候，不同的模式需要执行同样的代码。可以用 `|` 将多个模式组合在一起：

```rust runnable
enum HttpStatus {
    Ok,
    Created,
    BadRequest,
    NotFound,
    ServerError,
}

fn is_error(status: HttpStatus) -> bool {
    match status {
        HttpStatus::Ok | HttpStatus::Created => false,        // 成功状态
        HttpStatus::BadRequest | HttpStatus::NotFound | HttpStatus::ServerError => true,  // 错误状态
    }
}

fn main() {
    println!("{}", is_error(HttpStatus::Ok));           // false
    println!("{}", is_error(HttpStatus::BadRequest));   // true
}
```

使用 `|` 可以避免代码重复——不用为每个模式单独写一个分支。

# 匹配规则注意点

如果你熟悉 C 的 `switch` 语句，需要注意 Rust 的 `match` 有不同的行为：

## 1. 无需 `break`，自动跳出

**C 的 switch：**

```c
switch (value) {
    case 1:
        printf("一");
        break;  // 必须写 break，否则会"fall through"
    case 2:
        printf("二");
        break;
}
```

**Rust 的 match：**

```rust runnable
let value = 1;

match value {
    1 => println!("一"),  // 无需 break，匹配后自动跳出
    2 => println!("二"),
    _ => {}
}
```

Rust 在匹配一个分支后**自动跳出**，不会继续执行下一个分支，所以不需要 `break`。这也意味着 Rust **禁止 fall through 行为**——你无法写出像 C 那样忘记 `break` 就继续执行下一个分支的代码。如果需要多个分支执行相同的代码，使用 `|` 组合模式即可（见前面"多个模式匹配同一分支"部分）。

## 2. 多个分支不能匹配同样的值

**在 Rust 中编译错误：**

```rust runnable expect-error
let value = 1;

match value {
    1 => println!("一"),
    1 => println!("再来一遍"),  // 错误！1 已经被前面的分支匹配
    _ => {}
}
```

编译器会拒绝**重复的模式**。如果你需要不同的代码执行，必须放在同一个分支中。即使用 `|` 组合模式，也不能让某个值在多个分支中被匹配到：

```rust runnable expect-error
let value = 2;

match value {
    1 | 2 => println!("一或二"),
    2 | 3 => println!("二或三"),  // 错误！2 已经在前一个分支被匹配过
    _ => {}
}
```

> **预告**：本章介绍的是 `match` 的基础用法。Rust 的模式匹配系统非常强大，还有更多进阶特性（如范围模式、守卫条件、引用解构等）将在后续补充章节中讲解。

# 练习题

## 选择题

```rust
enum Animal {
    Dog,
    Cat,
    Bird,
}

let animal = Animal::Cat;

match animal {
    Animal::Dog => println!("汪"),
    Animal::Cat => println!("喵"),
}
```

```quiz single
Q: 这段代码能编译吗？
- 能，但运行时会 panic
+ 不能，必须处理所有枚举成员
- 不能，语法错误
- 能，因为我们处理了最常见的情况
E: match 是穷尽的，必须处理所有可能的情况。这里缺少 Animal::Bird 的分支，编译器会报错。
```

```rust
enum Status {
    Pending,
    Running,
    Done,
}

let status = Status::Running;

match status {
    Status::Pending => println!("等待中"),
    Status::Running => println!("运行中"),
    Status::Done => println!("完成"),
}
```

```quiz single
Q: 在 Running 分支中，status 的值是什么？
+ Status::Running
- "运行中" 字符串
- 编译错误
- 整个 Status 枚举
E: Running 分支被执行时，status 已经是 Status::Running，你可以在分支中使用它。
```

```rust
enum Message {
    Text(String),
    Number(i32),
}

let msg = Message::Number(42);

match msg {
    Message::Text(s) => println!("文本：{}", s),
    Message::Number(n) => println!("数字：{}", n),
}
```

```quiz single
Q: 在 Number 分支中，n 的值和类型分别是什么？
+ n 是 42，类型 i32
- n 是整个 Message，类型 Message
- n 是 Message::Number，类型 Message
- 编译错误
E: Number(n) 模式会**解构** Message::Number，提取内部的 i32 值。所以 n 是 42，类型是 i32。
```

```rust
enum Level {
    Low,
    Medium,
    High,
    Critical,
}

let level = Level::High;

match level {
    Level::Low | Level::Medium => println!("正常"),
    Level::High | Level::Critical => println!("警告"),
}
```

```quiz single
Q: 这段代码能编译吗？为什么？
- 不能，语法错误
- 不能，缺少 default 分支
+ 能，`|` 表示多个模式匹配同一分支
- 不能，Level::High 被匹配了两次
E: `|` 符号在 match 中表示"或"，允许多个模式执行同一分支代码。这里穷尽了 Level 的所有情况，所以能编译。
```

## 编程练习

### 练习 1：完善 match 分支

下面的代码缺少一个分支，请修复它：

```rust editable
enum Color {
    Red,
    Green,
    Blue,
}

fn describe_color(color: Color) -> String {
    match color {
        Color::Red => String::from("红色"),
        Color::Green => String::from("绿色"),
        // TODO: 添加 Blue 分支
    }
}

fn main() {
    println!("{}", describe_color(Color::Red));
    println!("{}", describe_color(Color::Blue));
}
```

```expected
红色
蓝色
```

### 练习 2：使用 match 解构枚举

定义一个 `Message` 枚举，包含三个成员：
- `Text(String)` — 文本消息
- `Number(i32)` — 数字消息
- `Empty` — 空消息

实现一个函数 `process_message()` 处理不同的消息：

```rust editable
enum Message {
    // TODO: 定义三个成员
}

fn process_message(msg: Message) -> String {
    // TODO: 使用 match 处理三种消息，返回相应描述：文本消息｜数字消息｜空消息
}

fn main() {
    let msg1 = Message::Text(String::from("Hello"));
    let msg2 = Message::Number(42);
    let msg3 = Message::Empty;

    println!("{}", process_message(msg1));
    println!("{}", process_message(msg2));
    println!("{}", process_message(msg3));
}
```

```expected
文本消息
数字消息
空消息
```

### 练习 3：处理不同形式的关联数据

定义一个 `Command` 枚举，包含两个成员（展示元组风格和结构体风格的混合）：
- `Execute(String)` — 执行命令（元组风格，关联一个字符串）
- `Config { key: String, value: String }` — 配置（结构体风格，关联两个字段）

实现一个函数 `handle_command()` 使用 match 处理这两种情况，返回对应的描述字符串：
- 对于 `Execute`：返回 `"执行命令：{命令名}"`
- 对于 `Config`：返回 `"配置 {key} = {value}"`

```rust editable
enum Command {
    // TODO: 定义两个成员
}

fn handle_command(cmd: Command) -> String {
    // TODO: 使用 match 处理命令并返回处理结果
}

fn main() {
    let cmd1 = Command::Execute(String::from("start"));
    let cmd2 = Command::Config {
        key: String::from("timeout"),
        value: String::from("30"),
    };

    println!("{}", handle_command(cmd1));
    println!("{}", handle_command(cmd2));
}
```

```expected
执行命令：start
配置 timeout = 30
```
