---
title: "常量与静态变量"
description: "理解 const 和 static 的区别，掌握如何定义全局和编译期常量，以及何时使用各种形式。"
difficulty: beginner
estimatedTime: 20
keywords: ["const", "static", "常量", "编译期"]
---

# 什么是常量

**常量** 是那些在程序运行期间**不能改变**的值。与变量不同，常量必须始终是不可变的，且不能用 `mut` 修饰。

Rust 提供两种常量机制：
- `const` — 编译期常量（推荐用于大多数情况）
- `static` — 静态变量（特殊场景使用）

# const：编译期常量

## 基本用法

```rust runnable
const PI: f64 = 3.14159;
const MAX_POINTS: u32 = 100_000;
const MAX_SIZE: usize = 1024 * 1024;  // 可以是常量表达式

fn main() {
    println!("π ≈ {}", PI);
    println!("最大分数：{}", MAX_POINTS);
    println!("最大尺寸：{} 字节", MAX_SIZE);
}
```

## const 的特点

1. **必须指定类型**（不能依赖类型推断）
2. **在编译期计算**，值被硬编码到二进制文件中
3. **可以在任何作用域定义**，包括全局作用域
4. **按惯例用全大写**（SCREAMING_SNAKE_CASE）
5. **可以进行简单的常量表达式计算**

```rust runnable
const SECONDS_PER_DAY: u32 = 24 * 60 * 60;
const THRESHOLD: i32 = 10;

fn main() {
    println!("每天秒数：{}", SECONDS_PER_DAY);
}
```

## const 的限制

不能用复杂的运行时操作定义 const，比如函数调用（除了一些特殊的 const 函数）：

```rust runnable expect-error
const VALUE: String = String::from("hello");  // 编译错误！
```

这是因为 `String::from()` 需要在运行时执行。

# static：静态变量

## 基本用法

```rust runnable
static COUNTER: i32 = 0;
static APP_NAME: &str = "MyApp";

fn main() {
    println!("应用名：{}", APP_NAME);
    println!("计数器初值：{}", COUNTER);
}
```

## static vs const

| 特性 | const | static |
|------|-------|--------|
| 存储位置 | 代码中（内联） | 内存中（固定地址） |
| 类型推断 | 不支持，必须指定 | 不支持，必须指定 |
| 访问速度 | 直接值 | 通过地址 |
| 生命周期 | 编译期 | 程序生命周期 |
| 可变性 | 总是不可变 | 可以是 `static mut`（需 unsafe） |

**经验法则：** 优先用 `const`，只有在需要固定内存地址或可变全局变量时才用 `static`。

## 可变静态变量

可以定义可变的 `static`，但访问或修改它都需要 `unsafe` 代码块（这是后续章节的内容）：

```rust runnable
static mut COUNTER: i32 = 0;

fn main() {
    unsafe {
        COUNTER += 1;
        println!("计数器：{}", COUNTER);
    }
}
```

一般不推荐使用可变 static，因为容易引起并发问题。

# 实际例子

## 数学常数

```rust runnable
const PI: f64 = 3.14159265359;
const E: f64 = 2.71828182846;
const GOLDEN_RATIO: f64 = 1.61803398875;

fn main() {
    let radius = 5.0;
    let area = PI * radius * radius;
    println!("半径 {} 的圆面积：{:.2}", radius, area);
}
```

## 配置常数

```rust runnable
const DATABASE_URL: &str = "postgres://localhost/mydb";
const MAX_CONNECTIONS: usize = 100;
const TIMEOUT_SECONDS: u64 = 30;
const DEBUG_MODE: bool = true;

fn main() {
    println!("数据库：{}", DATABASE_URL);
    println!("最大连接数：{}", MAX_CONNECTIONS);
    if DEBUG_MODE {
        println!("调试模式已启用");
    }
}
```

## 性能敏感的应用

```rust runnable
const BUFFER_SIZE: usize = 8192;
const CACHE_LINES: usize = 64;

struct Buffer {
    data: [u8; BUFFER_SIZE],
}

fn main() {
    let buffer = Buffer { data: [0; BUFFER_SIZE] };
    println!("缓冲区大小：{} 字节", std::mem::size_of_val(&buffer.data));
}
```

# 何时用 const vs let

```rust runnable
fn main() {
    // const 用于编译期已知的常值
    const MAX_USERS: u32 = 1000;
    
    // let 用于运行时确定的值
    let user_count = 42;
    
    // let mut 用于需要修改的变量
    let mut active_users = 0;
    active_users = 35;
}
```

# 常数表达式

`const` 可以使用常数表达式（编译期可计算的表达式）：

```rust runnable
const HOURS_PER_DAY: u32 = 24;
const MINUTES_PER_HOUR: u32 = 60;
const SECONDS_PER_MINUTE: u32 = 60;

const SECONDS_PER_DAY: u32 = 
    HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

fn main() {
    println!("每天秒数：{}", SECONDS_PER_DAY);
}
```

# 练习题

```rust
const PI: f64 = 3.14;
const RADIUS: i32 = 5;

fn main() {
    let area = PI * (RADIUS * RADIUS) as f64;
}
```

```quiz single
Q: 这段代码关于 const 的说法，正确的是？
- const 可以被程序修改
+ const 必须指定类型，值在编译期计算
- const 和 let 声明的变量没有区别
- const 只能在函数内声明
E: const 必须明确指定类型，且值必须是编译期可知的常数或常数表达式。
```

```rust
static COUNT: i32 = 0;
static NAME: String = String::from("App");
```

```quiz single
Q: 这段代码能编译吗？
- 能
+ 不能，因为 String::from() 不能在编译期执行
- 能，但运行时会 panic
- 能，需要用 unsafe
E: static 也要求值在编译期可知。String::from() 是运行时函数，不能用于 static 初始化。应该用 &str 字面量。
```

```quiz multi
Q: 下列关于 const 的说法，正确的是？（多选）
+ const 必须指定类型
+ const 值在编译期计算
+ const 可以在全局作用域定义
- const 可以用 mut 修饰
E: const 总是不可变的，不能用 mut 修饰。static 才有 mut 变体（需 unsafe）。
```

## 编程练习

### 练习 1：定义应用配置常数

为一个应用定义所有的配置常数：

```rust editable
// TODO: 定义以下常数
// - API_HOST: &str = "https://api.example.com"
// - API_TIMEOUT: u64 = 30（秒）
// - MAX_RETRIES: u32 = 3
// - CACHE_ENABLED: bool = true
// - DEBUG: bool = false

fn main() {
    println!("应用配置：");
    println!("  API 主机：{}", API_HOST);
    println!("  超时时间：{} 秒", API_TIMEOUT);
    println!("  最大重试：{}", MAX_RETRIES);
    println!("  缓存：{}", if CACHE_ENABLED { "启用" } else { "禁用" });
    println!("  调试：{}", if DEBUG { "开启" } else { "关闭" });
}
```

```expected
应用配置：
  API 主机：https://api.example.com
  超时时间：30 秒
  最大重试：3
  缓存：启用
  调试：关闭
```

### 练习 2：使用常数表达式

定义与时间相关的常数，并计算衍生常数：

```rust editable
const SECONDS_PER_MINUTE: u32 = 60;
const MINUTES_PER_HOUR: u32 = 60;
const HOURS_PER_DAY: u32 = 24;

// TODO: 定义衍生常数
// - SECONDS_PER_HOUR
// - SECONDS_PER_DAY
// - MINUTES_PER_DAY

fn main() {
    println!("时间单位换算：");
    println!("  每分钟秒数：{}", SECONDS_PER_MINUTE);
    println!("  每小时秒数：{}", SECONDS_PER_HOUR);
    println!("  每天秒数：{}", SECONDS_PER_DAY);
    println!("  每天分钟数：{}", MINUTES_PER_DAY);
}
```

```expected
时间单位换算：
  每分钟秒数：60
  每小时秒数：3600
  每天秒数：86400
  每天分钟数：1440
```

### 练习 3：常数约束

在函数中使用常数来约束数据结构大小：

```rust editable
const MAX_QUEUE_SIZE: usize = 100;
const MAX_NAME_LENGTH: usize = 50;

struct Queue {
    items: Vec<String>,
}

impl Queue {
    fn new() -> Self {
        Queue { items: Vec::new() }
    }
    
    fn enqueue(&mut self, item: String) -> bool {
        // TODO: 如果队列大小小于 MAX_QUEUE_SIZE，添加项目
        // 如果项目长度大于 MAX_NAME_LENGTH，截断
    }
    
    fn size(&self) -> usize {
        self.items.len()
    }
}

fn main() {
    let mut queue = Queue::new();
    
    queue.enqueue(String::from("Alice"));
    queue.enqueue(String::from("Bob"));
    
    println!("队列大小：{}", queue.size());
}
```

```expected
队列大小：2
```

---

**现在你已经掌握了 Rust 自定义数据类型的全部内容！**

从结构体到枚举，从方法到 match 表达式，从 Option 到常数，你已经拥有了构建真实 Rust 程序所需的基础知识。
