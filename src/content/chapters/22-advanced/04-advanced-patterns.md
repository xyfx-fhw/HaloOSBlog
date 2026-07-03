---
title: "模式匹配进阶"
description: "掌握 @ 绑定、模式守卫、嵌套解构、序列展开等高级模式技巧，让 match 表达式写得更精准、更优雅"
difficulty: advanced
estimatedTime: 30
keywords: ["模式匹配", "@ 绑定", "模式守卫", "解构", "match", "if let", "while let"]
---

# 绑定与守卫

## 快速回顾：基础模式

你在前面章节已经见过基础的模式匹配：

```rust runnable
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    Color(u8, u8, u8),
}

fn main() {
    let msg = Message::Move { x: 10, y: 20 };

    match msg {
        Message::Quit => println!("退出"),
        Message::Move { x, y } => println!("移动到 ({}, {})", x, y),
        Message::Write(text) => println!("写入：{}", text),
        Message::Color(r, g, b) => println!("颜色：{} {} {}", r, g, b),
    }
}
```

本章讲几种进阶用法，让你处理更复杂的情况。

## @ 绑定：捕获的同时进行匹配

有时候你想**同时检测**一个值在不在某个范围内，**并且保留**这个值做后续使用。普通的范围匹配做不到：

```rust runnable
fn describe_score(score: u32) -> String {
    match score {
        0..=59 => format!("不及格：{}", score), // ✅ 用到了 score
        60..=79 => format!("良好：{}", score),  // ✅ 但这里 score 只是原始变量
        80..=100 => format!("优秀：{}", score),
        _ => format!("无效分数：{}", score),
    }
}
# fn main() {}
```

这个可以，但模式里写的 `score` 其实是在匹配**原始变量**，不是"被匹配中的分支里的值"。当你想对**解构出来的值**同时进行范围检查并绑定时，就需要 `@` 了：

```rust runnable
fn categorize(n: u32) -> String {
    match n {
        // @ 让你同时做两件事：检查是否在 1..=10，并把值绑定到 small
        small @ 1..=10 => format!("{} 是小数", small),
        big @ 11..=100 => format!("{} 是中等数", big),
        _ => format!("{} 超出范围", n),
    }
}

fn main() {
    println!("{}", categorize(5));   // 5 是小数
    println!("{}", categorize(50));  // 50 是中等数
    println!("{}", categorize(200)); // 200 超出范围
}
```

`@ 绑定` 的语法：`名字 @ 模式`——如果 `模式` 匹配，把值绑定到 `名字`。

更复杂的例子——匹配嵌套枚举时绑定整个变体：

```rust runnable
#[derive(Debug)]
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
}

fn area(shape: &Shape) -> f64 {
    match shape {
        // 同时匹配 Circle 并把整个 Shape 绑定到 c，方便后面调试打印
        c @ Shape::Circle { radius } => {
            let a = std::f64::consts::PI * radius * radius;
            println!("处理 {:?}，面积 = {:.2}", c, a);
            a
        }
        Shape::Rectangle { width, height } => width * height,
    }
}

fn main() {
    let s = Shape::Circle { radius: 3.0 };
    println!("面积：{:.2}", area(&s));
}
```

## 模式守卫：在 match 分支里加条件

有时候模式本身不够精确，你需要加一个额外条件才能决定是否匹配。**模式守卫**（guard）用 `if` 关键字写在分支后面：

```rust runnable
fn classify_temp(celsius: f64) -> &'static str {
    match celsius {
        t if t < 0.0   => "冰点以下",
        t if t < 10.0  => "寒冷",
        t if t < 20.0  => "凉爽",
        t if t < 30.0  => "舒适",
        _              => "炎热",
    }
}

fn main() {
    println!("{}", classify_temp(-5.0));  // 冰点以下
    println!("{}", classify_temp(5.0));   // 寒冷
    println!("{}", classify_temp(25.0));  // 舒适
    println!("{}", classify_temp(35.0));  // 炎热
}
```

守卫和枚举解构组合使用：

```rust runnable
#[derive(Debug)]
struct Point { x: i32, y: i32 }

fn quadrant(p: &Point) -> &str {
    match p {
        Point { x, y } if *x > 0 && *y > 0 => "第一象限",
        Point { x, y } if *x < 0 && *y > 0 => "第二象限",
        Point { x, y } if *x < 0 && *y < 0 => "第三象限",
        Point { x, y } if *x > 0 && *y < 0 => "第四象限",
        Point { x: 0, .. } | Point { y: 0, .. } => "坐标轴上",
        _ => "原点",
    }
}

fn main() {
    println!("{}", quadrant(&Point { x: 3, y: 4 }));   // 第一象限
    println!("{}", quadrant(&Point { x: -2, y: 1 }));  // 第二象限
    println!("{}", quadrant(&Point { x: 0, y: 5 }));   // 坐标轴上
}
```

> **注意**：模式守卫的 `if` 条件在模式匹配**成功之后**才执行。如果守卫条件为假，`match` 继续尝试后面的分支。

# 解构进阶

## 嵌套结构解构

Rust 允许你在一个模式里解构多层嵌套的结构体、枚举和元组：

```rust runnable
struct Address {
    city: String,
    zip: String,
}

struct Person {
    name: String,
    age: u32,
    address: Address,
}

fn greet(p: &Person) {
    // 一个模式解构两层结构体
    let Person {
        name,
        age,
        address: Address { city, .. },
        // ^^^^^^^^^^^^^^^ 嵌套解构 Address，只取 city
    } = p;

    println!("你好，{}！{}岁，来自{}。", name, age, city);
}

fn main() {
    let p = Person {
        name: "Alice".to_string(),
        age: 28,
        address: Address {
            city: "北京".to_string(),
            zip: "100000".to_string(),
        },
    };
    greet(&p);
}
```

枚举中包含结构体的嵌套解构：

```rust runnable
enum Event {
    MouseClick { x: i32, y: i32 },
    KeyPress(char),
    Resize { width: u32, height: u32 },
}

fn handle(event: &Event) {
    match event {
        Event::MouseClick { x, y } if *x > 0 && *y > 0 => {
            println!("点击在正象限：({}, {})", x, y);
        }
        Event::MouseClick { x, y } => {
            println!("点击在负象限或轴上：({}, {})", x, y);
        }
        Event::KeyPress(c) => {
            println!("按键：'{}'", c);
        }
        Event::Resize { width, height } => {
            println!("窗口大小：{}×{}", width, height);
        }
    }
}

fn main() {
    handle(&Event::MouseClick { x: 10, y: 20 });
    handle(&Event::KeyPress('R'));
    handle(&Event::Resize { width: 1920, height: 1080 });
}
```

## `..` 忽略剩余字段

解构结构体时，不需要的字段可以用 `..` 忽略：

```rust runnable
struct Config {
    debug: bool,
    timeout: u32,
    retries: u32,
    log_level: String,
}

fn main() {
    let cfg = Config {
        debug: true,
        timeout: 30,
        retries: 3,
        log_level: "info".to_string(),
    };

    // 只关心 debug 和 timeout，其余用 .. 忽略
    let Config { debug, timeout, .. } = cfg;
    println!("调试模式：{}，超时：{}s", debug, timeout);
}
```

元组中用 `..` 忽略头部或尾部：

```rust runnable
fn main() {
    let numbers = (1, 2, 3, 4, 5);

    let (first, .., last) = numbers;
    println!("第一个：{}，最后一个：{}", first, last); // 1, 5

    let (a, b, ..) = numbers;
    println!("前两个：{} {}", a, b); // 1 2

    let (.., x, y) = numbers;
    println!("后两个：{} {}", x, y); // 4 5
}
```

## `|` 在模式中合并多个情况

用 `|` 在单个 match 分支里匹配多个模式：

```rust runnable
fn is_weekday(day: u8) -> bool {
    matches!(day, 1..=5) // 等价于 day >= 1 && day <= 5
}

fn day_name(day: u8) -> &'static str {
    match day {
        1 => "周一",
        2 => "周二",
        3 => "周三",
        4 => "周四",
        5 => "周五",
        6 | 7 => "周末",  // 用 | 合并
        _ => "无效",
    }
}

fn describe_char(c: char) -> &'static str {
    match c {
        'a'..='z' | 'A'..='Z' => "字母",   // 范围 + | 组合
        '0'..='9' => "数字",
        ' ' | '\t' | '\n' => "空白",
        _ => "其他",
    }
}

fn main() {
    println!("{}", day_name(3));         // 周三
    println!("{}", day_name(6));         // 周末
    println!("{}", describe_char('R'));  // 字母
    println!("{}", describe_char('7'));  // 数字
    println!("{}", describe_char(' ')); // 空白
}
```

# 切片模式

结构体和枚举的解构你已经很熟悉了。切片（slice）也可以用模式匹配，而且语法非常直观——用 `[]` 括起来，按位置描述元素。

## 基本用法

```rust runnable
fn describe(nums: &[i32]) -> String {
    match nums {
        []        => "空".to_string(),
        [x]       => format!("只有一个：{}", x),
        [x, y]    => format!("恰好两个：{} 和 {}", x, y),
        [first, .., last] => format!("首 {}，尾 {}，共 {} 个", first, last, nums.len()),
    }
}

fn main() {
    println!("{}", describe(&[]));          // 空
    println!("{}", describe(&[42]));        // 只有一个：42
    println!("{}", describe(&[1, 2]));      // 恰好两个：1 和 2
    println!("{}", describe(&[1, 2, 3, 4])); // 首 1，尾 4，共 4 个
}
```

`[first, .., last]` 里的 `..` 和结构体里的 `..` 是同一个概念——忽略中间任意多个元素。

## 捕获剩余部分：`rest @ ..`

用 `@` 绑定可以把"剩余部分"也捕获成一个子切片：

```rust runnable
fn process(data: &[i32]) {
    match data {
        [] => println!("没有数据"),
        [head, tail @ ..] => {
            // head 是第一个元素，tail 是剩余部分的切片
            println!("头：{}，剩余 {} 个：{:?}", head, tail.len(), tail);
            // 可以递归处理 tail，或者继续匹配
        }
    }
}

fn main() {
    process(&[10, 20, 30, 40]);  // 头：10，剩余 3 个：[20, 30, 40]
    process(&[99]);               // 头：99，剩余 0 个：[]
    process(&[]);                 // 没有数据
}
```

`tail @ ..` 的意思是：把 `..`（剩余所有元素）绑定到名字 `tail`。`tail` 的类型是 `&[i32]`，可以继续对它做任何切片操作。

## 实际用途：协议解析

切片模式在处理结构化字节流时特别有用——比如解析一个简单的文本命令：

```rust runnable
fn handle_command(parts: &[&str]) -> String {
    match parts {
        ["quit"] | ["exit"] => "退出程序".to_string(),
        ["help"] => "显示帮助".to_string(),
        ["get", key] => format!("获取 key: {}", key),
        ["set", key, value] => format!("设置 {} = {}", key, value),
        ["set", ..] => "用法：set <key> <value>".to_string(),
        [cmd, ..] => format!("未知命令：{}", cmd),
        [] => "请输入命令".to_string(),
    }
}

fn main() {
    println!("{}", handle_command(&["get", "name"]));       // 获取 key: name
    println!("{}", handle_command(&["set", "x", "42"]));    // 设置 x = 42
    println!("{}", handle_command(&["set", "x"]));          // 用法：set <key> <value>
    println!("{}", handle_command(&["quit"]));               // 退出程序
    println!("{}", handle_command(&["foo", "bar", "baz"])); // 未知命令：foo
}
```

注意分支顺序：`["set", key, value]` 必须在 `["set", ..]` 前面，因为 `match` 从上往下匹配，更具体的模式要写在更宽泛的前面。

# ref 绑定与 match ergonomics

## 所有权问题

`match` 默认会**移动**被匹配的值。对 `String`、`Vec` 等有所有权的类型，这往往不是你想要的：

```rust runnable expect-error
struct User {
    name: String,
    age: u32,
}

fn greet(user: &User) {
    match user {
        User { name, age } => println!("你好 {}，{}岁", name, age),
        // ❌ 试图从 &User 里移走 String，不允许
    }
}
# fn main() {}
```

有三种方式解决。

## 方式一：对引用本身 match

最常见的做法——直接 match `&user`（或者 match `*user` 并在模式里写 `&`）：

```rust runnable
struct User { name: String, age: u32 }

fn greet(user: &User) {
    // 对 &User 解构，name 和 age 自动成为引用
    let User { name, age } = user;
    println!("你好 {}，{}岁", name, age);
}

fn main() {
    let u = User { name: "Alice".to_string(), age: 30 };
    greet(&u);
    println!("u.name 还在：{}", u.name); // 没有被移走
}
```

对 `&T` 做 `let` 解构时，Rust 自动把字段变成引用（`name: &String`，`age: &u32`）。这就是 **match ergonomics**：编译器帮你省去了每个字段前手写 `ref` 的麻烦。

## 方式二：显式 ref 绑定

在模式里显式写 `ref`，把绑定变成引用而不是移动：

```rust runnable
struct User { name: String, age: u32 }

fn greet(user: User) { // 注意：拿的是所有权
    match user {
        User { ref name, age } => {
            // name 是 &String（借用），age 是 u32（Copy，直接复制）
            println!("你好 {}，{}岁", name, age);
            // user.name 没有被移走，但 user 还在这个 match 作用域里
        }
    }
}

fn main() {
    greet(User { name: "Bob".to_string(), age: 25 });
}
```

`ref name` 告诉编译器：不要移动 `name`，给我一个 `&String`。`ref mut name` 则给一个 `&mut String`。

## 什么时候还需要手写 ref？

match ergonomics（自动推导引用）覆盖了大多数情况，但有两种场景仍需手写 `ref`：

**1. 在 `let` 解构里只想借用部分字段，其他字段要移动：**

```rust runnable
struct Packet { header: u8, payload: String }

fn main() {
    let p = Packet { header: 0xAB, payload: "数据".to_string() };

    // header 移动（Copy 类型，实际是复制），payload 借用
    let Packet { header, ref payload } = p;

    println!("头：{:#x}", header);
    println!("数据：{}", payload);
    println!("p.payload 还在：{}", p.payload); // 没有被移走
}
```

**2. 在 `match` 里对同一个值同时需要移动部分字段和借用部分字段时，ergonomics 可能推导不出你想要的，显式 `ref` 可以精确控制。**

> **简单记法**：
> - 匹配 `&T` 或 `&mut T` → match ergonomics 自动处理，大多数情况不需要 `ref`
> - 匹配有所有权的 `T`，只想借用某个字段 → 在那个字段前写 `ref`

# 练习题

## 模式匹配测验

```quiz single
Q: @ 绑定的作用是什么？
- 阻止值被移动所有权
- 给当前 match 分支里的所有变量统一起别名
- 把多个模式用 @ 连接起来，任意一个匹配就行
+ 同时检查值是否匹配某个模式，并把值绑定到一个名字
E: n @ 1..=10 的含义是：如果值在 1 到 10 之间，把它绑定为 n。模式检查和绑定同时发生。没有 @ 时，1..=10 只是检查，不绑定；有 @ 时，检查通过的值被绑定到 n 供后续使用。
```

```rust
fn main() {
    let pair = (3, -2);
    let result = match pair {
        (x, y) if x == y => "相等",
        (x, y) if x + y > 0 => "和为正",
        _ => "其他",
    };
    println!("{}", result);
}
```

```quiz single
Q: 上面的代码输出什么？
- 编译错误
- 其他
+ 和为正
- 相等
E: pair = (3, -2)，x=3，y=-2。第一个守卫：x == y → 3 == -2 → 假，跳过。第二个守卫：x + y > 0 → 3 + (-2) = 1 > 0 → 真，匹配。输出"和为正"。
```

```rust
fn main() {
    let numbers = (1, 2, 3, 4, 5);
    let (.., last) = numbers;
    println!("{}", last);
}
```

```quiz single
Q: 上面的代码中 last 的值是什么？
- 1
- (2, 3, 4, 5)
+ 5
- 编译错误：.. 不能出现在 let 解构的开头
E: (.., last) 中，.. 忽略除最后一个之外的所有元素，last 绑定最后一个值 5。同样，(first, ..) 取第一个，(first, .., last) 取首尾。
```

```rust
struct Config {
    width: u32,
    height: u32,
    title: String,
}
```

```quiz single
Q: 如果只需要从 Config 中提取 width 和 height，下列哪个写法是正确的？
+ let Config { width, height, .. } = cfg;
- let Config { width, height, _ } = cfg;
- let (width, height) = cfg;
- let Config { width, height } = cfg;
E: 解构结构体时，如果不列出所有字段，必须用 .. 表示"剩余字段我不关心"。用单下划线 _ 只能忽略一个字段，不能忽略所有剩余字段。直接写 { width, height } 不加 .. 会报错，因为 title 字段没有被处理。
```

```quiz multi
Q: 关于模式守卫（if guard），下列哪些说法是正确的？
- 守卫为假时，整个 match 表达式返回默认值
- 守卫在模式匹配之前执行
+ 如果守卫为假，match 会继续尝试下一个分支
+ 守卫中可以使用已被模式解构出来的变量
E: 守卫的执行顺序是：先检查模式是否匹配，匹配了再评估守卫条件。所以守卫里可以使用解构出的变量（x、y 等）。如果守卫为假，不是返回默认值，而是继续往下看有没有其他分支能匹配。
```
