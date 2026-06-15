---
title: "综合练习"
description: "综合检验对结构体、方法、枚举、Option、match 和 if let 的理解，通过完整的编程项目巩固所学知识。"
difficulty: intermediate
estimatedTime: 60
keywords: ["结构体", "枚举", "Option", "match", "综合"]
---

# 代码判断题

## 题目 1：结构体与所有权

```rust
struct Person {
    name: String,
    age: u32,
}

fn main() {
    let p1 = Person {
        name: String::from("Alice"),
        age: 30,
    };
    
    let p2 = Person {
        name: p1.name,
        age: p1.age,
    };
    
    println!("{}", p1.name);
}
```

```quiz single
Q: 这段代码能编译吗？
- 能，p1.name 被复制了
+ 不能，p1.name（String）的所有权被转移给了 p2.name
- 能，但运行时会 panic
- 能，Person 自动实现了 Copy
E: String 不是 Copy 类型，赋值时发生移动。p1.name 的所有权转给 p2.name，之后 p1.name 无效。
```

## 题目 2：枚举与模式匹配

```rust
enum Result {
    Ok(i32),
    Err(String),
}

fn main() {
    let result = Result::Ok(42);
    
    match result {
        Result::Ok(x) if x > 0 => println!("正数：{}", x),
        Result::Ok(x) => println!("非正数：{}", x),
        Result::Err(_) => println!("错误"),
    }
}
```

```quiz single
Q: 这段代码的输出是？
- 编译错误
+ 正数：42
- 非正数：42
- 错误
E: 第一个分支的守卫条件（x > 0）满足，所以输出"正数：42"。
```

## 题目 3：Option 与 if let

```rust
fn main() {
    let x: Option<i32> = None;
    let y = if let Some(val) = x { val + 1 } else { 0 };
    println!("{}", y);
}
```

```quiz single
Q: 变量 y 的值是？
- 编译错误
+ 0
- None
- panic
E: x 是 None，所以不匹配 Some(val)，执行 else 分支返回 0。
```

# 编程练习

## 练习 1：书籍管理

定义一个 `Book` 结构体，并实现相关方法。

**任务：**
- 定义 `Book` 结构体，包含 `title`（String）、`author`（String）、`pages`（u32）
- 实现 `new()` 方法创建新书
- 实现 `summary()` 方法返回书籍摘要

**格式要求：**
- `summary()` 返回格式：`"{title}" by {author}（{pages} 页）`
- 例如：`"Rust 圣经" by 张汉东（652 页）`

```rust editable
struct Book {
    // TODO: 添加三个字段
}

impl Book {
    fn new(title: String, author: String, pages: u32) -> Book {
        // TODO: 创建并返回 Book 实例
    }
    
    fn summary(&self) -> String {
        // TODO: 返回书籍摘要，按格式要求组织
    }
}

fn main() {
    let book = Book::new(String::from("Rust 圣经"), String::from("张汉东"), 652);
    println!("{}", book.summary());
}
```

```expected
"Rust 圣经" by 张汉东（652 页）
```

## 练习 2：灯泡颜色

定义一个 `LightColor` 枚举，用 `match` 返回颜色的描述。

**任务：**
- 定义 `LightColor` 枚举，包含三个成员：`Red`、`Green`、`Blue`
- 实现 `describe()` 函数，接收 `LightColor`，用 `match` 返回对应的中文描述

**格式要求：**
- 红灯返回：`"红灯：停止"`
- 绿灯返回：`"绿灯：通行"`
- 蓝灯返回：`"蓝灯：准备"`

```rust editable
enum LightColor {
    // TODO: 定义三个成员：Red、Green、Blue
}

fn describe(color: LightColor) -> String {
    // TODO: 使用 match 处理三种情况，返回对应字符串
}

fn main() {
    println!("{}", describe(LightColor::Red));
    println!("{}", describe(LightColor::Green));
    println!("{}", describe(LightColor::Blue));
}
```

```expected
红灯：停止
绿灯：通行
蓝灯：准备
```

## 练习 3：数组中查找

使用 `Option` 在数组中查找元素。

**任务：**
- 实现 `find_number()` 函数，在数组中查找指定数字
- 如果找到，返回 `Some(位置)`；如果没找到，返回 `None`
- 在 `main` 中使用 `if let` 处理结果，并打印查找信息

**格式要求：**
- 找到时：`"{number} 在位置 {index}"`（例如：`30 在位置 2`）
- 未找到时：`"{number} 未找到"`（例如：`99 未找到`）

**提示：**
- 可以用 `for` 循环配合 `enumerate()` 遍历数组
- 或使用 `numbers.iter().position(|&x| x == target)`

```rust editable
fn find_number(numbers: &[i32], target: i32) -> Option<usize> {
    // TODO: 遍历数组，找到 target 返回 Some(位置)，否则返回 None
}

fn main() {
    let nums = [10, 20, 30, 40, 50];
    
    // TODO: 查找 30，使用 if let 处理返回值，按格式打印
    
    // TODO: 查找 99，使用 if let 处理返回值，按格式打印
}
```

```expected
30 在位置 2
99 未找到
```

---

**完成这三个练习，你掌握了自定义类型的基础！**
