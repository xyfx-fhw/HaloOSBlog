---
title: "常量与静态变量"
description: "理解 const 和 static 的区别，掌握如何定义全局和编译期常量，以及何时使用各种形式。"
difficulty: beginner
estimatedTime: 15
keywords: ["const", "static", "常量", "编译期"]
---

# const：常量

**常量** 是那些在程序运行期间**不能改变**的值。与变量不同，常量必须始终是不可变的，且不能用 `mut` 修饰。

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

## 常数表达式

`const` 可以使用常数表达式（编译期可计算的表达式，不会消耗运行性能）：

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

## const 的限制

不能用复杂的运行时操作定义 const，比如函数调用（除了一些特殊的 const 函数）：

```rust runnable expect-error
const VALUE: String = String::from("hello");  // 编译错误！
```

这是因为 `String::from()` 需要在运行时执行。

# static：静态变量

**静态变量**是一种**全局变量**，在程序整个生命周期中只存在一个实例，存储在**固定的内存地址**上。与 const 不同，static 在内存中有真实的地址，可以被取引用。

> **重要**：static 和 const 一样，**都必须明确指定类型**，不能依赖类型推断。

```rust runnable
static VERSION: &str = "1.0.0";

fn main() {
    // static 有固定地址
    println!("版本：{}", VERSION);
    println!("版本地址：{:p}", &VERSION);  // 可以取地址
}
```

## static 的限制

static 的初始值也必须在**编译期可知**，这一点和 const 相同。不能使用运行时函数来初始化 static：

```rust runnable expect-error
static NAME: String = String::from("App");  // 编译错误！
```

因为 `String::from()` 需要在运行时执行。如果需要字符串，应该用 `&str` 字面量：

```rust runnable
static NAME: &str = "App";  // 正确

fn main() {
    println!("{}", NAME);
}
```

Rust 也支持在函数内声明 static，这与 C 语言相似。函数内的 static 变量生命周期贯穿整个程序，但**作用域被限制在函数内部**，是一种很好的封装手段。

```rust runnable
fn get_db_timeout() -> u32 {
    // 函数内的 static — 只初始化一次
    static DEFAULT_TIMEOUT: u32 = 30;
    DEFAULT_TIMEOUT
}

fn main() {
    println!("超时：{} 秒", get_db_timeout());
    println!("超时：{} 秒", get_db_timeout());  // 不会重新初始化
}
```

**关键特性：**
- 每次调用函数时，static 不会重新初始化（只在首次调用时初始化）
- 外部无法直接访问这个 static（作用域限制）
- 这样既能保持全局状态，又能避免污染全局命名空间

## 可变 static

如果你需要一个可变的全局状态，可以用 `static mut`，但**访问或修改都需要 `unsafe` 块**。

### 为什么需要 unsafe

静态变量存在于全局数据区。如果在多个线程中同时访问可变 static，会引发**数据竞争**（Data Race）。Rust 通过 `unsafe` 块要求你显式承认这个风险。

### 例子

```rust runnable
static mut COUNTER: i32 = 0;

fn increment() {
    unsafe {
        COUNTER += 1;
        println!("计数器：{}", COUNTER);
    }
}

fn main() {
    increment();
    increment();
}
```

> **建议：** 一般不推荐使用可变 static，因为容易引起并发问题。如果你需要全局可变状态，考虑其他方案（如 Mutex、线程本地存储等，后续会讲）。

# const vs static：全局变量的选择

## 全局变量只能是 const 或 static

在全局作用域（函数外），你**不能用 `let`**，只能用 `const` 或 `static`。（函数内的话都可以使用）

```rust runnable expect-error
// 错误！不能在全局作用域用 let
let name = "Alice";

fn main() {}
```

**为什么？** 全局变量的生命周期贯穿整个程序，编译器要求它要么是编译期已知的常数（const），要么是有特殊运行时特性的（static）。普通的 let 变量无法满足这一要求。

## const vs static 的本质区别

虽然 const 和 static 都可以在全局作用域使用，但它们的**原理和用途完全不同**。

### 三种变量的对比

```rust runnable
// 1. 局部 let 变量
fn example_local() {
    let name = "Alice";  // 每次调用都重新创建
}

// 2. 全局 const
const API_HOST: &str = "api.example.com";  // 编译期被内联到每个使用处

// 3. 全局 static
static DATABASE_URL: &str = "postgres://...";  // 在内存的固定地址，程序启动创建

fn main() {
    // const：编译后的二进制里有多个 "api.example.com" 副本
    println!("{}", API_HOST);

    // static：二进制里只有一个 DATABASE_URL，所有代码指向同一地址
    println!("{}", DATABASE_URL);
}
```

### const vs static 的核心区别

| 特性 | const | static |
|------|-------|--------|
| **存储位置** | 编译期内联到代码中 | 程序内存中的固定地址 |
| **运行时地址** | 无地址（被替换为值） | 有固定地址（`&STATIC` 可取地址） |
| **性能** | 零开销（直接是值） | 通过地址访问（多一步寻址） |
| **生命周期** | 编译期存在 | 程序从启动到结束 |
| **作用域** | 可以是局部（如函数内） | 必须是全局 |
| **可变性** | 总是不可变 | 可以是 `static mut`（需 unsafe） |

**类比理解：**
- `const` 像"直接数字替换"：`PI` 在使用处被替换为 `3.14159`
- `static` 像"全局变量"：在内存中有一个固定盒子，所有地方都访问同一个地址

### 为什么 static 需要固定地址

```rust runnable
const PI: f64 = 3.14;
static VERSION: &str = "1.0";

fn main() {
    // const 没有地址，无法取引用
    // println!("{:p}", &PI);  // 编译错误！

    // static 有地址，可以取引用
    println!("版本地址：{:p}", &VERSION);
}
```

const 因为被编译期内联了，根本不存在于运行时，所以没有地址。而 static 在内存中有真实的地址，因此可以被取引用。

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
+ const 必须指定类型，值在编译期计算
- const 可以被程序修改
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
+ 不能，因为 String::from() 不能在编译期执行
- 能
- 能，需要用 unsafe
- 能，但运行时会 panic
E: static 也要求值在编译期可知。String::from() 是运行时函数，不能用于 static 初始化。应该用 &str 字面量。
```

```quiz multi
Q: 下列关于 const 的说法，正确的是？（多选）
+ const 值在编译期计算
+ const 可以在全局作用域定义
- const 可以用 mut 修饰
+ const 必须指定类型
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
