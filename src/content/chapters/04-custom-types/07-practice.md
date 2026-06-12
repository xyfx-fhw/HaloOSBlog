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

## 练习 1：银行账户系统

设计一个简单的银行账户系统，包含以下功能：

```rust editable
#[derive(Debug, Clone)]
struct Account {
    holder: String,
    balance: f64,
}

enum Transaction {
    Deposit(f64),
    Withdraw(f64),
    Check,
}

impl Account {
    fn new(holder: String, initial_balance: f64) -> Account {
        // TODO: 创建新账户
    }
    
    fn process(&mut self, transaction: Transaction) -> bool {
        // TODO: 处理交易
        // Deposit: 存钱（总是成功）
        // Withdraw: 取钱（余额不足返回 false）
        // Check: 检查余额（总是成功，打印余额）
    }
}

fn main() {
    let mut account = Account::new(String::from("张三"), 1000.0);
    
    // 存钱
    account.process(Transaction::Deposit(500.0));
    account.process(Transaction::Check);
    
    // 取钱
    if account.process(Transaction::Withdraw(300.0)) {
        println!("取钱成功");
    }
    account.process(Transaction::Check);
    
    // 试图取超过余额的钱
    if !account.process(Transaction::Withdraw(2000.0)) {
        println!("余额不足");
    }
}
```

```expected
当前余额：1500
当前余额：1200
取钱成功
余额不足
```

## 练习 2：订单处理系统

设计一个订单处理系统，处理不同状态的订单：

```rust editable
#[derive(Debug, Clone)]
struct Order {
    id: u32,
    customer: String,
    amount: f64,
    status: OrderStatus,
}

#[derive(Debug, Clone)]
enum OrderStatus {
    Pending,
    Processing,
    Shipped { tracking_number: String },
    Delivered,
    Cancelled { reason: String },
}

impl Order {
    fn new(id: u32, customer: String, amount: f64) -> Order {
        // TODO: 创建新订单，初始状态为 Pending
    }
    
    fn process(&mut self) -> bool {
        // TODO: 从 Pending 转移到 Processing（其他状态无法处理）
    }
    
    fn ship(&mut self, tracking_number: String) -> bool {
        // TODO: 从 Processing 转移到 Shipped（其他状态无法发货）
    }
    
    fn deliver(&mut self) -> bool {
        // TODO: 从 Shipped 转移到 Delivered（其他状态无法交付）
    }
    
    fn cancel(&mut self, reason: String) -> bool {
        // TODO: 如果订单还没发货（Pending 或 Processing），可以取消
    }
    
    fn status_info(&self) -> String {
        // TODO: 使用 match 返回订单状态的描述
        match &self.status {
            OrderStatus::Pending => String::from("订单待处理"),
            OrderStatus::Processing => String::from("订单处理中"),
            OrderStatus::Shipped { tracking_number } => {
                format!("订单已发货，追踪号：{}", tracking_number)
            }
            OrderStatus::Delivered => String::from("订单已交付"),
            OrderStatus::Cancelled { reason } => {
                format!("订单已取消：{}", reason)
            }
        }
    }
}

fn main() {
    let mut order = Order::new(1001, String::from("Alice"), 299.99);
    println!("初始：{}", order.status_info());
    
    order.process();
    println!("处理后：{}", order.status_info());
    
    order.ship(String::from("SF123456"));
    println!("发货后：{}", order.status_info());
    
    order.deliver();
    println!("交付后：{}", order.status_info());
}
```

```expected
初始：订单待处理
处理后：订单处理中
发货后：订单已发货，追踪号：SF123456
交付后：订单已交付
```

## 练习 3：数据验证与 Option

实现一个用户注册系统，使用 `Option` 处理验证：

```rust editable
struct User {
    username: String,
    email: String,
    age: u32,
}

fn validate_username(username: &str) -> Option<String> {
    // TODO: 用户名必须 3-20 个字符，全是字母和数字
    // 有效返回 Some(用户名)，无效返回 None
}

fn validate_email(email: &str) -> Option<String> {
    // TODO: 邮箱必须包含 @ 和点号
    // 有效返回 Some(邮箱)，无效返回 None
}

fn validate_age(age: u32) -> Option<u32> {
    // TODO: 年龄必须在 18-120 之间
    // 有效返回 Some(年龄)，无效返回 None
}

fn register_user(
    username: &str,
    email: &str,
    age: u32,
) -> Option<User> {
    // TODO: 使用 match 或 if let 验证所有字段
    // 全部有效则返回 Some(User)，否则返回 None
    
    let valid_username = validate_username(username)?;
    let valid_email = validate_email(email)?;
    let valid_age = validate_age(age)?;
    
    Some(User {
        username: valid_username,
        email: valid_email,
        age: valid_age,
    })
}

fn main() {
    match register_user("Alice", "alice@example.com", 25) {
        Some(user) => println!("注册成功：{:?}", user),
        None => println!("注册失败：数据验证错误"),
    }
    
    match register_user("Al", "invalid.email", 25) {
        Some(user) => println!("注册成功：{:?}", user),
        None => println!("注册失败：数据验证错误"),
    }
}
```

```expected
注册成功：User { username: "Alice", email: "alice@example.com", age: 25 }
注册失败：数据验证错误
```

---

**完成这些练习，你就已经掌握了自定义数据类型的核心概念！**
