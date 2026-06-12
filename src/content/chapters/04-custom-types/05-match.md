---
title: "模式匹配与 match 表达式"
description: "掌握 Rust 强大的模式匹配机制，学习 match 表达式如何安全地解构枚举和 Option，以及编译器如何确保穷尽性。"
difficulty: intermediate
estimatedTime: 40
keywords: ["match", "模式", "穷尽性", "绑定", "通配符"]
---

# match 表达式的威力

`match` 是 Rust 中最强大的控制流构造，它结合了 C 的 `switch` 和模式匹配的强大功能。

基本思想：
1. 比较一个值与一系列模式
2. 执行与第一个匹配的模式对应的代码
3. **编译器强制检查所有可能的情况**

# 基本 match 语法

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

# 匹配 Option\<T\>

`Option\<T\>` 是最常见的 `match` 用法：

```rust runnable
fn add_one(x: Option<i32>) -> Option<i32> {
    match x {
        None => None,
        Some(i) => Some(i + 1),
    }
}

fn main() {
    let five = Some(5);
    let six = add_one(five);
    let none = add_one(None);
    
    println!("{:?}", six);   // Some(6)
    println!("{:?}", none);  // None
}
```

这样的模式在 Rust 代码中无处不在。

# 穷尽性检查

`match` 必须覆盖所有可能的情况。试图遗漏某个分支会导致编译错误：

```rust runnable expect-error
fn add_one(x: Option<i32>) -> Option<i32> {
    match x {
        Some(i) => Some(i + 1),
        // 忘记处理 None！
    }
}
```

编译器会明确告诉你缺少哪个模式。这防止了难以追踪的逻辑 bug。

## 通配符 `_` 和 `_` 模式

如果有很多情况但你只关心其中几个，用通配符：

```rust runnable
fn describe_number(n: u8) {
    match n {
        0 => println!("零"),
        1 => println!("一"),
        2 => println!("二"),
        _ => println!("其他数字"),  // 匹配所有其他情况
    }
}

fn main() {
    describe_number(0);
    describe_number(5);
}
```

如果不需要通配符绑定的值，用单独的 `_`：

```rust runnable
let x = Some(());

match x {
    Some(_) => println!("有某个值"),
    None => println!("没有值"),
}
```

# 提取部分值

有时候，枚举成员包含多个字段，但你只关心其中某些：

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
        Person::Student { name, grade } => {
            println!("{} 是学生，成绩 {}", name, grade);
        }
        Person::Teacher { name, subject } => {
            println!("{} 教 {}", name, subject);
        }
    }
}
```

## 忽略某个字段

```rust runnable
#[derive(Debug)]
enum Point {
    Point2D(i32, i32),
    Point3D(i32, i32, i32),
}

fn main() {
    let p = Point::Point3D(1, 2, 3);
    
    match p {
        Point::Point2D(x, y) => println!("2D: ({}, {})", x, y),
        Point::Point3D(x, y, z) => println!("3D: ({}, {}, {})", x, y, z),
    }
}
```

或者用 `_` 忽略某个字段：

```rust runnable
#[derive(Debug)]
enum Result {
    Ok(i32),
    Err(String),
}

fn main() {
    let result = Result::Ok(42);
    
    match result {
        Result::Ok(_) => println!("成功"),      // 不关心 Ok 的值
        Result::Err(msg) => println!("错误：{}", msg),
    }
}
```

# 实战例子：处理多层嵌套的 Option

```rust runnable
fn main() {
    let data: Option<Option<i32>> = Some(Some(42));
    
    match data {
        Some(Some(value)) => println!("双层 Option 的值是 {}", value),
        Some(None) => println!("外层有值，但内层是 None"),
        None => println!("外层就是 None"),
    }
}
```

这展示了 `match` 如何优雅地处理嵌套的复杂结构。

# 练习题

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
- 能，因为我们处理了最常见的情况
+ 不能，必须处理所有枚举成员
- 能，但运行时会 panic
- 不能，语法错误
E: match 是穷尽的，必须处理所有可能的情况。这里缺少 Animal::Bird 的分支，编译器会报错。
```

```rust
let value = Some(5);

match value {
    Some(x) => println!("值是 {}", x),
    None => println!("没有值"),
}
```

```quiz single
Q: 在 Some 分支中，x 的值和类型分别是什么？
- x 是整个 Option，类型 Option<i32>
+ x 是 5，类型 i32
- x 是 Some，类型是 Some
- 编译错误
E: Some(x) 模式会**解构** Option<i32>，提取内部的 i32 值。所以 x 是 5，类型是 i32。
```

```rust
match value {
    0 => println!("零"),
    1 | 2 => println!("一或二"),
    _ => println!("其他"),
}
```

```quiz single
Q: 这个 match 中，`|` 符号表示什么？
- 或者（逻辑 OR）
+ 多个模式中任意一个匹配都执行该分支
- 管道操作符
- 取模运算
E: `|` 在 match 模式中表示"或"，`1 | 2` 意思是"匹配 1 或 2"。
```

## 编程练习

### 练习 1：使用 match 处理 Option

实现一个函数 `greet_user()`，接收 `Option\<String\>`。如果有名字，输出欢迎；如果没有，输出默认问候：

```rust editable
fn greet_user(name: Option<String>) {
    // TODO: 实现函数
    // 使用 match 处理 Some 和 None
}

fn main() {
    greet_user(Some(String::from("Alice")));
    greet_user(None);
}
```

```expected
欢迎，Alice！
你好，陌生人！
```

### 练习 2：复杂的枚举匹配

定义一个 `Request` 枚举，包含三个成员：
- `Get(String)` — GET 请求（参数是 URL）
- `Post { url: String, data: String }` — POST 请求
- `Delete(String)` — DELETE 请求

实现一个函数 `handle_request()` 返回不同的消息：

```rust editable
enum Request {
    // TODO: 定义三个成员
}

fn handle_request(req: Request) -> String {
    // TODO: 使用 match 处理三种请求，返回相应消息
}

fn main() {
    let req1 = Request::Get(String::from("/api/users"));
    let req2 = Request::Post {
        url: String::from("/api/users"),
        data: String::from("{\"name\":\"Alice\"}"),
    };
    let req3 = Request::Delete(String::from("/api/users/1"));
    
    println!("{}", handle_request(req1));
    println!("{}", handle_request(req2));
    println!("{}", handle_request(req3));
}
```

```expected
获取 URL：/api/users
在 /api/users 上发送数据：{"name":"Alice"}
删除 /api/users/1
```

### 练习 3：多层 Option 匹配

实现一个函数 `process_optional_result()`，接收 `Option\<Option\<i32\>\>`，返回最终值或默认值：

```rust editable
fn process_optional_result(value: Option<Option<i32>>) -> i32 {
    // TODO: 使用 match 处理所有情况
    // Some(Some(x)) => x
    // Some(None) => -1
    // None => 0
}

fn main() {
    println!("{}", process_optional_result(Some(Some(42))));
    println!("{}", process_optional_result(Some(None)));
    println!("{}", process_optional_result(None));
}
```

```expected
42
-1
0
```
