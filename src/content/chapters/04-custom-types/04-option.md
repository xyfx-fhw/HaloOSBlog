---
title: "Option<T> 枚举"
description: "掌握 Option 类型如何表示值的存在或缺失，理解 Rust 为何不用 null，以及如何安全地处理可选值。"
difficulty: intermediate
estimatedTime: 35
keywords: ["Option", "Some", "None", "null", "可选值"]
---

# 为什么 Rust 没有 null

很多编程语言（Java、C、JavaScript）都有 `null` 值，表示"没有值"。这听起来合理，但 Tony Hoare（`null` 的发明者）后来称之为**"十亿美元的错误"**，因为 `null` 导致的 bug 无穷无尽：

- 忘记检查 `null`，程序崩溃（"Null Pointer Exception"）
- 在不该是 `null` 的地方突然变成 `null`
- 很难区分"正常的空值"和"未初始化"

Rust 的解决方案是：**没有 `null`，用 `Option<T>` 枚举代替**。

这强制你在编译期就必须处理"可能没有值"的情况。

# Option<T> 的定义

`Option<T>` 是标准库中的一个枚举：

```rust
enum Option<T> {
    Some(T),
    None,
}
```

它很简单：
- `Some(T)` — 表示有值
- `None` — 表示没有值

`<T>` 是一个**泛型参数**（后续会详细讲），现在只需知道它表示"任何类型"。

## 使用 Option

`Option<T>` 在 prelude 中，无需导入前缀就能用 `Some` 和 `None`：

```rust runnable
fn main() {
    let some_number: Option<i32> = Some(5);
    let none_number: Option<i32> = None;
    
    println!("{:?}", some_number);
    println!("{:?}", none_number);
}
```

当有 `None` 时，必须指定类型，因为编译器无法推断。

## 为什么这比 null 安全

假如 Rust 有 `null`：

```rust
let x: i32 = null;     // x 可能是 null
println!("{}", x + 1); // 崩溃！
```

用 `Option<T>`：

```rust runnable expect-error
let x: Option<i32> = None;
println!("{}", x + 1);  // 编译错误！Option<i32> 不能直接和 i32 相加
```

你**必须** 先处理 `Option` 的两种情况。

# 提取 Option 中的值

## 方法一：match 表达式（最常见）

用 `match` 分别处理 `Some` 和 `None`：

```rust runnable
fn main() {
    let maybe_age: Option<u32> = Some(25);
    
    match maybe_age {
        Some(age) => println!("年龄是 {}", age),
        None => println!("年龄未知"),
    }
}
```

`Some(age)` 会绑定内部的值，可以在分支中使用。

## 方法二：if let 表达式（只关心 Some 的情况）

如果只想处理 `Some` 的情况，`if let` 更简洁：

```rust runnable
fn main() {
    let favorite_color: Option<&str> = Some("蓝色");
    
    if let Some(color) = favorite_color {
        println!("你最喜欢的颜色是 {}", color);
    }
}
```

（`if let` 会在后续详细讲）

## 方法三：Option 的方法

`Option<T>` 提供了许多方便的方法（这里先了解，后续会深入）：

```rust runnable
fn main() {
    let x = Some(5);
    
    // unwrap()：如果是 Some，返回内部值；如果是 None，panic
    let value = x.unwrap();
    println!("值是 {}", value);
    
    // unwrap_or()：如果是 Some，返回内部值；如果是 None，返回默认值
    let y: Option<i32> = None;
    let value = y.unwrap_or(0);
    println!("值是 {}", value);
    
    // is_some()、is_none()：检查是 Some 还是 None
    let z = Some(10);
    if z.is_some() {
        println!("z 有值");
    }
}
```

> **警告**：`unwrap()` 如果碰到 `None` 会 panic。在不确定的情况下，用 `match` 或 `if let` 更安全。

# 实际例子

## 查找数组中的元素

```rust runnable
fn find_first_even(numbers: &[i32]) -> Option<i32> {
    for &num in numbers {
        if num % 2 == 0 {
            return Some(num);  // 找到了
        }
    }
    None  // 没找到
}

fn main() {
    let nums = vec![1, 3, 5, 2, 7];
    
    match find_first_even(&nums) {
        Some(num) => println!("找到偶数：{}", num),
        None => println!("没有偶数"),
    }
}
```

## 字符串解析

```rust runnable
fn main() {
    let num_str = "42";
    
    // parse() 返回 Result，但这里我们用 Option 来演示
    match num_str.parse::<i32>() {
        Ok(num) => println!("解析成功：{}", num),
        Err(_) => println!("解析失败"),
    }
    
    // 用 Option 的话
    let result = num_str.parse::<i32>().ok();  // 把 Result 转成 Option
    
    match result {
        Some(num) => println!("数字是 {}", num),
        None => println!("不是有效的数字"),
    }
}
```

# 链式方法调用

Option 的方法可以链式调用，这在处理可选值时很强大：

```rust runnable
fn main() {
    let text = Some(String::from("  hello  "));
    
    // 链式处理：如果有值，去掉空白；如果没值，保持为 None
    let result = text.map(|s| s.trim());
    
    match result {
        Some(trimmed) => println!("'{}' (长度 {})", trimmed, trimmed.len()),
        None => println!("没有文本"),
    }
}
```

（`.map()` 会在后续详细讲）

# 练习题

```rust
fn get_age(name: &str) -> Option<u32> {
    match name {
        "Alice" => Some(30),
        "Bob" => Some(25),
        _ => None,
    }
}
```

```quiz single
Q: 如果调用 get_age("Charlie")，返回值是什么？
- 返回 0
- 返回一个错误
+ 返回 None
- 返回 None 会导致 panic
E: 模式 _ 匹配任何其他情况，在这个函数中返回 None。None 是完全合法的返回值，不会 panic。
```

```rust
let x: Option<i32> = Some(5);
let y = x.unwrap();
```

```quiz single
Q: 变量 y 的值是什么？
- None
+ 5
- x（Option 本身）
- 编译错误
E: unwrap() 方法提取 Option 中的值。因为 x 是 Some(5)，所以 y 是 5。如果 x 是 None，unwrap() 会 panic。
```

```quiz multi
Q: 下列关于 Option 的说法，正确的是？（多选）
+ Option<T> 可以表示值的存在或缺失
+ 使用 Option 时必须处理 Some 和 None 两种情况
- Rust 的 Option 和其他语言的 null 是一样的，只是名字不同
+ match 和 if let 都可以用来处理 Option
E: Option 与 null 的根本区别在于编译器强制检查。你不能"忘记"处理 None，因为编译器不允许。
```

## 编程练习

### 练习 1：返回 Option 的函数

实现一个函数 `first_word_length()`，返回字符串中第一个单词的长度。如果字符串为空或只有空白，返回 None：

```rust editable
fn first_word_length(s: &str) -> Option<usize> {
    // TODO: 实现函数
    // 提示：trim() 可以去掉空白，split_whitespace() 可以按空白分割
}

fn main() {
    println!("{:?}", first_word_length("hello world"));      // Some(5)
    println!("{:?}", first_word_length("  "));               // None
    println!("{:?}", first_word_length(""));                 // None
    println!("{:?}", first_word_length("single"));           // Some(6)
}
```

```expected
Some(5)
None
None
Some(6)
```

### 练习 2：安全地处理 Option

实现一个函数 `divide()`，返回除法结果的 Option。只有当除数不为 0 时才返回 Some，否则返回 None：

```rust editable
fn divide(dividend: f64, divisor: f64) -> Option<f64> {
    // TODO: 实现函数
}

fn main() {
    match divide(10.0, 2.0) {
        Some(result) => println!("10 ÷ 2 = {}", result),
        None => println!("无法除以 0"),
    }
    
    match divide(10.0, 0.0) {
        Some(result) => println!("10 ÷ 0 = {}", result),
        None => println!("无法除以 0"),
    }
}
```

```expected
10 ÷ 2 = 5
无法除以 0
```

### 练习 3：处理多个 Option

实现一个函数 `find_max_in_options()`，接收两个 `Option<i32>`，返回其中最大的值。如果都是 None，返回 None；如果一个是 None，返回另一个：

```rust editable
fn find_max_in_options(a: Option<i32>, b: Option<i32>) -> Option<i32> {
    // TODO: 实现函数
    // 提示：可以用 match 处理所有组合情况
}

fn main() {
    println!("{:?}", find_max_in_options(Some(10), Some(20)));  // Some(20)
    println!("{:?}", find_max_in_options(Some(10), None));      // Some(10)
    println!("{:?}", find_max_in_options(None, Some(15)));      // Some(15)
    println!("{:?}", find_max_in_options(None, None));          // None
}
```

```expected
Some(20)
Some(10)
Some(15)
None
```
