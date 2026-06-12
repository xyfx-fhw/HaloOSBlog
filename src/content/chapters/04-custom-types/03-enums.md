---
title: "枚举"
description: "理解 Rust 枚举的定义、成员、关联数据和方法，掌握用枚举模型一组离散的状态或选择。"
difficulty: intermediate
estimatedTime: 40
keywords: ["枚举", "enum", "成员", "变体", "关联数据"]
---

# 什么是枚举

**枚举**（enum）允许你定义一个类型，其值**只能是预先列举的几个成员之一**。

日常比喻：一个消息可能是"收到新邮件"、"收到推送通知"或"收到短信"，但同一时刻只能是其中一种。这正是枚举的用途。

## 为什么需要枚举

比如你要表示网络请求的状态：

```rust runnable
// 不好的做法：用多个布尔字段，容易陷入矛盾状态
struct RequestStatus {
    is_pending: bool,
    is_success: bool,
    is_error: bool,
}

fn main() {
    // 这个状态是什么？同时是 success 和 error？这没有意义！
    let status = RequestStatus {
        is_pending: true,
        is_success: true,
        is_error: false,
    };
}
```

用枚举：

```rust runnable
enum RequestStatus {
    Pending,
    Success,
    Error,
}

fn main() {
    // 清晰明了：只能是这三个状态之一
    let status = RequestStatus::Pending;
}
```

枚举通过编译器的强制，确保**不会陷入无效的状态组合**。

# 定义和使用枚举

基本语法：

```rust runnable
enum Direction {
    North,
    South,
    East,
    West,
}

fn main() {
    let my_direction = Direction::North;
    
    // 可以有多个成员
    let go_east = Direction::East;
    let go_back = Direction::South;
}
```

**关键点：**
- 成员名用 **`EnumName::MemberName`** 访问
- 成员名按惯例用大驼峰
- 同一枚举的所有成员都是同一类型

# 枚举成员与关联数据

枚举的真正力量在于：**每个成员可以关联不同类型的数据**。

## 简单关联数据

比如，一条消息可能是"发送字符串"或"发送数字"：

```rust runnable
enum Message {
    Text(String),
    Number(i32),
}

fn main() {
    let msg1 = Message::Text(String::from("Hello"));
    let msg2 = Message::Number(42);
}
```

每个成员可以关联不同数量和类型的数据：

```rust runnable
enum Message {
    Quit,                          // 无数据
    Move { x: i32, y: i32 },       // 结构体风格的数据
    Write(String),                 // 单个值
    ChangeColor(i32, i32, i32),    // 多个值
}

fn main() {
    let msg1 = Message::Quit;
    let msg2 = Message::Move { x: 10, y: 20 };
    let msg3 = Message::Write(String::from("hello"));
    let msg4 = Message::ChangeColor(255, 0, 0);
}
```

这相当于用不同的结构体，但统一在一个类型下。

## 为什么这比结构体更好

假设没有枚举，你可能这样做：

```rust runnable
struct MoveMessage {
    x: i32,
    y: i32,
}

struct WriteMessage {
    text: String,
}

// 现在要处理这些消息，写的函数很难处理...
```

用枚举就简单了，所有消息都是一种类型。

# 为枚举定义方法

像结构体一样，枚举也可以有方法：

```rust runnable
enum GameResult {
    Win,
    Lose,
    Draw,
}

impl GameResult {
    fn message(&self) -> String {
        match self {
            GameResult::Win => String::from("你赢了！"),
            GameResult::Lose => String::from("你输了"),
            GameResult::Draw => String::from("平局"),
        }
    }
}

fn main() {
    let result = GameResult::Win;
    println!("{}", result.message());
}
```

（这里用到了 `match`，后续会详细讲）

# 实际例子：IP 地址

这是官方文档的经典例子：

```rust runnable
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}

fn main() {
    let home = IpAddr::V4(127, 0, 0, 1);
    let loopback = IpAddr::V6(String::from("::1"));
    
    println!("IPv4: {:?}", home);
    println!("IPv6: {:?}", loopback);
}
```

如果用结构体，就得这样：

```rust runnable
struct Ipv4Addr {
    octets: (u8, u8, u8, u8),
}

struct Ipv6Addr {
    segments: String,
}

struct IpAddr {
    kind: String,
    address: Box<dyn std::any::Any>,
}
// 这样既复杂又容易出错
```

枚举清晰地表达：IP 地址要么是 IPv4（4 个 u8），要么是 IPv6（一个 String）。

# 常见枚举模式

## 状态机

用枚举模型系统状态：

```rust runnable
#[derive(Debug)]
enum PlayerState {
    Idle,
    Walking,
    Running,
    Jumping { height: u32 },
}

impl PlayerState {
    fn can_jump(&self) -> bool {
        matches!(self, PlayerState::Idle | PlayerState::Walking)
    }
}

fn main() {
    let state = PlayerState::Idle;
    println!("当前状态能跳吗？{}", state.can_jump());
}
```

## 错误表示

用枚举表示各种错误情况（先了解，后续错误处理章节会深入）：

```rust runnable
enum FileError {
    NotFound,
    PermissionDenied,
    UnknownError(String),
}

fn main() {
    let error = FileError::NotFound;
}
```

# 练习题

```rust
enum TrafficLight {
    Red,
    Yellow,
    Green,
}
```

```quiz single
Q: 关于上面的枚举定义，下列说法正确的是？
- TrafficLight 是一个值，Red、Yellow、Green 是类型
+ Red、Yellow、Green 都是 TrafficLight 类型的值
- 这个枚举定义中，Red、Yellow、Green 是三个不同的类型
- TrafficLight 只能存储一个成员
E: 枚举定义了一个类型（TrafficLight），其成员（Red、Yellow、Green）都是该类型的值。
```

```rust
enum Color {
    Red(u8, u8, u8),
    Hex(String),
}

fn main() {
    let color1 = Color::Red(255, 0, 0);
    let color2 = Color::Hex(String::from("#FF0000"));
}
```

```quiz multi
Q: 下列关于上面枚举的说法，正确的是？（多选）
+ Red 成员关联三个 u8 值
+ Hex 成员关联一个 String 值
+ color1 和 color2 都是 Color 类型
- Red 和 Hex 是不同的类型
E: 枚举成员可以关联不同类型和数量的数据，但都属于同一个枚举类型。
```

```quiz single
Q: 枚举相比多个布尔字段的优势是什么？
- 占用更少的内存
+ 编译器确保只会进入有效的状态组合，防止逻辑错误
- 让代码执行得更快
- 只是语法糖，没有实质区别
E: 用多个布尔字段时，可能陷入矛盾状态（如同时标记为 success 和 error）。枚举通过类型系统强制一个值只能是一个成员，保证了状态的有效性。
```

## 编程练习

### 练习 1：定义包含关联数据的枚举

定义一个 `FileOperation` 枚举，包含以下成员：
- `Create(String)` — 创建文件（参数是文件名）
- `Delete(String)` — 删除文件
- `Read(String)` — 读取文件
- `Write { filename: String, content: String }` — 写入文件

创建几个实例并打印（需要派生 Debug）：

```rust editable
#[derive(Debug)]
enum FileOperation {
    // TODO: 定义四个成员
}

fn main() {
    let op1 = FileOperation::Create(String::from("test.txt"));
    let op2 = FileOperation::Write {
        filename: String::from("test.txt"),
        content: String::from("Hello, world!"),
    };
    let op3 = FileOperation::Read(String::from("test.txt"));
    
    println!("{:?}", op1);
    println!("{:?}", op2);
    println!("{:?}", op3);
}
```

```expected
Create("test.txt")
Write { filename: "test.txt", content: "Hello, world!" }
Read("test.txt")
```

### 练习 2：为枚举实现方法

为 `HttpStatus` 枚举实现一个 `code()` 方法，返回对应的 HTTP 状态码：

```rust editable
#[derive(Debug)]
enum HttpStatus {
    Ok,
    BadRequest,
    NotFound,
    ServerError,
}

impl HttpStatus {
    fn code(&self) -> u16 {
        // TODO: 实现方法，返回状态码
        // Ok => 200, BadRequest => 400, NotFound => 404, ServerError => 500
    }
    
    fn message(&self) -> &str {
        // TODO: 实现方法，返回状态消息
        match self {
            HttpStatus::Ok => "OK",
            HttpStatus::BadRequest => "Bad Request",
            HttpStatus::NotFound => "Not Found",
            HttpStatus::ServerError => "Internal Server Error",
        }
    }
}

fn main() {
    let status = HttpStatus::Ok;
    println!("状态码：{}", status.code());
    println!("消息：{}", status.message());
    
    let error = HttpStatus::NotFound;
    println!("错误码：{}", error.code());
    println!("错误信息：{}", error.message());
}
```

```expected
状态码：200
消息：OK
错误码：404
错误信息：Not Found
```
