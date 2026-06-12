---
title: "if let 与 while let"
description: "学习 if let 和 while let 语法糖，在只关心一个模式时简化 match 表达式，提高代码的简洁性。"
difficulty: intermediate
estimatedTime: 25
keywords: ["if let", "while let", "语法糖", "简洁"]
---

# if let：match 的简洁写法

有时候，你用 `match` 只想处理**一个特定的情况**，其他情况都无需特殊处理。这时 `if let` 提供了更简洁的语法。

## match vs if let

假设你只想在 `Option` 有值时做某事：

```rust runnable
// 使用 match（相对冗长）
let config_max = Some(3u8);

match config_max {
    Some(max) => println!("最大值配置为 {}", max),
    _ => (),  // 什么都不做
}
```

用 `if let` 简化：

```rust runnable
// 使用 if let（更简洁）
let config_max = Some(3u8);

if let Some(max) = config_max {
    println!("最大值配置为 {}", max);
}
```

**关键差异：**
- `match` 必须穷尽所有情况
- `if let` 只关心一个模式是否匹配，其他情况隐含地忽略

## if let 的语法

```rust
if let 模式 = 表达式 {
    // 模式匹配时执行
}
```

注意：是 `=` 而不是 `match`。

# 实际例子

```rust runnable
enum Status {
    Done,
    Working { progress: u32 },
}

fn main() {
    let status = Status::Working { progress: 50 };
    
    // 用 match
    match status {
        Status::Working { progress } => {
            println!("进度：{}%", progress);
        }
        _ => {}
    }
    
    // 用 if let（更清晰）
    if let Status::Working { progress } = status {
        println!("进度：{}%", progress);
    }
}
```

# if let ... else

`if let` 可以配合 `else`，处理模式不匹配的情况：

```rust runnable
let favorite_color: Option<&str> = Some("蓝色");
let is_tuesday = false;
let age: Result<u8, _> = "34".parse();

if let Some(color) = favorite_color {
    println!("使用你最喜欢的颜色：{}", color);
} else if is_tuesday {
    println!("星期二穿绿色！");
} else if let Ok(age) = age {
    if age > 30 {
        println!("使用紫色");
    } else {
        println!("使用橙色");
    }
} else {
    println!("使用蓝色作为后备方案");
}
```

**等价的 match 写法会更复杂**。

# while let：循环中的模式匹配

类似 `if let`，`while let` 在循环中只关心某个模式：

```rust runnable
fn main() {
    let mut stack = vec![1, 2, 3];
    
    // 当 pop() 返回 Some 时继续循环
    while let Some(top) = stack.pop() {
        println!("栈顶：{}", top);
    }
}
```

等价的 `loop + match` 写法：

```rust runnable
fn main() {
    let mut stack = vec![1, 2, 3];
    
    loop {
        match stack.pop() {
            Some(top) => println!("栈顶：{}", top),
            None => break,
        }
    }
}
```

`while let` 明显更简洁。

# 何时用 if let vs match

| 情况 | 用 if let | 用 match |
|------|----------|---------|
| 只关心一个模式匹配 | ✓ | 不推荐（代码冗长） |
| 需要穷尽所有情况 | ✗ | ✓ |
| 需要处理多个模式 | 嵌套 if let 会很丑 | ✓ |
| 需要在模式中使用守卫条件 | 可以，但有限制 | ✓ |

简单规则：**如果你的 `match` 只有两个分支，其中一个用 `_` 忽略，那就考虑用 `if let`。**

# 练习题

```rust
let x = Some(5);

if let Some(y) = x {
    println!("{}", y);
}
```

```quiz single
Q: 这段代码的输出是什么？
- 编译错误
- None
+ 5
- Some(5)
E: if let Some(y) = x 会将 x 中的值（5）绑定到 y。所以输出是 5。
```

```rust
let config = Some(String::from("config.toml"));

if let Some(file) = config {
    println!("使用配置文件：{}", file);
} else {
    println!("使用默认配置");
}
```

```quiz multi
Q: 关于这段代码的说法，正确的是？（多选）
+ file 只在 if 块中可用
+ 如果 config 是 None，会执行 else 块
- else 块中 config 仍然可用
+ 这可以用更简洁的 if let 写法实现
E: if let 创建新的作用域，绑定的变量只在该作用域中有效。else 块是模式不匹配时执行的代码。
```

```rust
while let Some(x) = some_iterator {
    // ...
}
```

```quiz single
Q: 这个循环会在何时结束？
- 当 x 等于某个值时
+ 当 some_iterator 返回 None 时
- 循环会无限执行
- 编译错误
E: while let 循环在模式不再匹配（即返回 None）时自动结束，无需显式 break。
```

## 编程练习

### 练习 1：用 if let 简化代码

使用 `if let` 和 `else` 处理以下场景：

```rust editable
enum Message {
    NewEmail { subject: String, sender: String },
    Text(String),
    Quit,
}

fn main() {
    let message = Message::NewEmail {
        subject: String::from("你好"),
        sender: String::from("Alice"),
    };
    
    // TODO: 用 if let 检查是否是 NewEmail
    // 如果是，打印 subject 和 sender
    // 否则打印 "收到其他类型的消息"
    
    let message2 = Message::Quit;
    
    // TODO: 同样处理 message2
}
```

```expected
收到新邮件，主题：你好，来自：Alice
收到其他类型的消息
```

### 练习 2：用 while let 遍历 Option

创建一个简单的"有限迭代器"结构，演示如何用 `while let` 循环：

```rust editable
struct Counter {
    current: i32,
    max: i32,
}

impl Counter {
    fn new(max: i32) -> Self {
        Counter { current: 0, max }
    }
    
    fn next(&mut self) -> Option<i32> {
        if self.current < self.max {
            self.current += 1;
            Some(self.current)
        } else {
            None
        }
    }
}

fn main() {
    let mut counter = Counter::new(3);
    
    // TODO: 使用 while let 循环输出 1, 2, 3
    // 当 next() 返回 None 时循环结束
}
```

```expected
1
2
3
```

### 练习 3：条件守卫

虽然 `if let` 的条件表达有限，但可以在分支内部添加条件。实现一个函数处理不同的状态：

```rust editable
enum Status {
    Active { level: u32 },
    Inactive,
    Banned,
}

fn describe_status(status: Status) {
    // TODO: 使用 if let 处理 Active 状态
    // 如果 level > 10，打印 "高级用户"
    // 如果 level <= 10，打印 "普通用户"
    // 对其他状态打印对应的消息
}

fn main() {
    describe_status(Status::Active { level: 15 });
    describe_status(Status::Active { level: 5 });
    describe_status(Status::Inactive);
    describe_status(Status::Banned);
}
```

```expected
高级用户，等级 15
普通用户，等级 5
状态：不活跃
状态：被禁用
```
