---
title: "String 与 &str——Rust 的两种字符串"
description: "理解 Rust 为什么有两种字符串类型、掌握它们的区别与适用场景、学会安全地创建、修改和操作字符串数据。"
difficulty: beginner
estimatedTime: 35
keywords: ["字符串", "String", "&str", "字符串切片", "所有权", "UTF-8", "字符编码"]
---

# 字符串基础

## 为什么 Rust 有两种字符串类型

这是初学者最常困惑的地方。**Rust 不是有一种字符串类型，而是有两种：`String` 和 `&str`**。

想象一下快递：
- **`String`** 像是你**拥有的包裹**——你可以打开它、修改里面的东西、把它转送给别人
- **`&str`** 像是你在某个时刻**看到的包裹标签内容**——你只能读，不能修改，但标签本身可能属于别人

这种设计的核心理由是 **所有权**。Rust 使用所有权系统来管理内存安全。`String` 拥有堆上的数据，而 `&str` 只是借用（引用）了某个地方的字符串数据。

## String 和 &str 的基本区别

| 特性 | `String` | `&str` |
|------|----------|--------|
| 存储位置 | 堆（heap） | 栈（stack）或数据段 |
| 大小 | 动态，运行时确定 | 固定，编译时确定 |
| 可修改性 | 可以修改（如果是 `mut`） | 不可修改 |
| 所有权 | 拥有完整数据所有权 | 仅是借用 |
| 类型 | `String` | `&str`（引用类型） |

让我们看一个简单对比：

```rust runnable
fn main() {
    // String：我们拥有的字符串
    let mut s1 = String::from("Hello");
    s1.push_str(", World!");  // 可以修改
    println!("String: {}", s1);

    // &str：字符串切片，借用的数据
    let s2: &str = "Hello";
    // s2.push_str(", World!");  // ✗ 错误！&str 不可修改
    println!("&str: {}", s2);
}
```

这两种类型都是**有效的**，选择哪一种取决于你的**使用场景**。

## 字符串字面量就是 &str

你一直在用的字符串字面量（双引号里的文本）其实就是 `&str` 类型：

```rust runnable
fn main() {
    // 这个字面量的类型是 &str，不是 String！
    let s: &str = "这是一个字符串字面量";
    println!("字面量类型：&str");
    println!("内容：{}", s);
}
```

为什么字面量是 `&str` 而不是 `String`？因为字面量在**编译时就已确定**，被硬编码到二进制文件中，所以没必要在运行时分配堆内存。`&str` 的大小在编译时就知道，效率最高。

# 创建与初始化

## 创建空 String

最基础的方式是 `String::new()`：

```rust runnable
fn main() {
    let mut s = String::new();
    println!("空字符串长度：{}", s.len());
    println!("空字符串容量：{}", s.capacity());

    // 现在可以向里面添加数据
    s.push_str("Hello");
    println!("添加后：{}", s);
}
```

## 从字面量创建 String

方式 1：`String::from()`

```rust runnable
fn main() {
    let s1 = String::from("Hello, World!");
    println!("{}", s1);
}
```

方式 2：`.to_string()` 方法（任何实现了 `ToString` trait 的类型都有这个方法）

```rust runnable
fn main() {
    let s2 = "Hello, World!".to_string();
    println!("{}", s2);
}
```

两种写法的结果完全相同：

```rust runnable
fn main() {
    let s1 = String::from("Hello");
    let s2 = "Hello".to_string();

    println!("s1: {}", s1);
    println!("s2: {}", s2);
    println!("s1 == s2: {}", s1 == s2);
}
```

> **选择建议**：两种方式都可以，但 `String::from()` 更明确地表示"从这个数据创建一个 String"，而 `.to_string()` 更灵活（可用于其他类型的转换）。

## 预分配容量

如果你知道字符串最终会有大概多少字符，可以用 `with_capacity()` 预分配空间，减少内存重分配次数：

```rust runnable
fn main() {
    // 预分配 10 字节容量
    let mut s = String::with_capacity(10);
    println!("初始容量：{}", s.capacity());

    // 添加数据
    s.push_str("Hello");
    println!("添加后容量：{}", s.capacity());
}
```

# 修改字符串

`String` 的一大优势是**可修改**。这里列出最常用的修改操作。

## 单个字符：`push()`

向字符串末尾添加一个 char：

```rust runnable
fn main() {
    let mut s = String::from("hello");
    s.push('!');
    println!("{}", s);

    // 也可以是中文字符
    s.push('✨');
    println!("{}", s);
}
```

## 字符串片段：`push_str()`

向末尾追加一个字符串切片（`&str`）：

```rust runnable
fn main() {
    let mut s = String::from("Hello");
    s.push_str(", ");
    s.push_str("World!");
    println!("{}", s);
}
```

> 注意：`push_str()` 接受 `&str`，不获得所有权，所以原字符串仍可用。

## 移除末尾字符：`pop()`

移除并返回最后一个字符（如果有的话）：

```rust runnable
fn main() {
    let mut s = String::from("hello");

    match s.pop() {
        Some(ch) => println!("移除的字符：{}", ch),
        None => println!("字符串为空"),
    }

    println!("移除后：{}", s);
}
```

## 删除指定位置：`remove()`

删除并返回指定**字节位置**的字符。这个方法有些复杂，因为涉及 UTF-8 编码：

```rust runnable
fn main() {
    let mut s = String::from("hello");

    // 删除位置 0 的字符（'h'）
    let removed = s.remove(0);
    println!("删除的字符：{}", removed);
    println!("修改后：{}", s);
}
```

> **警告**：`remove()` 按**字节位置**工作，不是字符位置。对于多字节字符（如中文），必须传正确的字节位置，否则会 panic。详见后文"字符编码复杂性"。

## 清空字符串：`clear()`

删除所有内容：

```rust runnable
fn main() {
    let mut s = String::from("Hello, World!");
    println!("清空前长度：{}", s.len());

    s.clear();
    println!("清空后长度：{}", s.len());
    println!("清空后：'{}'", s);
}
```

## 替换：`replace()` 和 `replace_range()`

`replace()` 返回一个**新的** String（原字符串不变）：

```rust runnable
fn main() {
    let s = "hello world";
    let s2 = s.replace("world", "Rust");
    println!("原字符串：{}", s);
    println!("新字符串：{}", s2);
}
```

如果要修改原字符串的某个范围，用 `replace_range()`：

```rust runnable
fn main() {
    let mut s = String::from("hello world");

    // 将位置 0..5 的字符替换为 "Hi"
    s.replace_range(0..5, "Hi");
    println!("{}", s);
}
```

## 截断：`truncate()`

保留前 n 个**字节**，删除剩余部分：

```rust runnable
fn main() {
    let mut s = String::from("Hello, World!");

    s.truncate(5);  // 只保留前 5 个字节
    println!("{}", s);
}
```

> 同样，`truncate()` 按字节位置工作，不能用在多字节字符的中间。

# 操作与查询

## 为什么不能用 [] 直接索引字符串

这是一个常见的困惑。你可以对数组和向量用 `v[0]` 获取元素，但**不能对 String 这样做**：

```rust runnable expect-error
fn main() {
    let s = String::from("hello");
    println!("{}", s[0]);  // ✗ 错误！
}
```

为什么？**UTF-8 编码的复杂性**。中文字符、表情符号等多字节字符占多个字节，一个"字符"可能是 1、2、3 或 4 个字节。`s[0]` 只能返回一个字节，而不是一个"字符"。Rust 的设计是**宁可不提供这个操作，也不要让你无意中出错**。

## 字符串切片：使用范围

如果你知道**字节范围**，可以创建字符串切片（`&str`）：

```rust runnable
fn main() {
    let s = String::from("hello");

    let slice1: &str = &s[0..2];   // 前 2 个字节
    let slice2: &str = &s[1..4];   // 字节 1-4

    println!("slice1: {}", slice1);
    println!("slice2: {}", slice2);
}
```

但是**必须确保切片边界在字符边界上**，否则会 panic：

```rust runnable expect-error
fn main() {
    let s = "Hello 🦀";  // 这里的 🦀 是 4 个字节

    // 这会 panic！因为在字符中间切割
    let slice = &s[0..7];
}
```

## 字节 vs 字符 vs 字形簇

这是 UTF-8 字符串最容易混淆的地方。让我们澄清三个概念：

**字节（Byte）** — 最小单位，1 个字节 = 8 比特：

```rust runnable
fn main() {
    let s = "hello";
    println!("字节数：{}", s.len());  // 5

    let s2 = "Hello 世";
    println!("字节数：{}", s2.len());  // 9（不是 7！）
}
```

**字符（Char）** — Unicode 字符，`char` 类型：

```rust runnable
fn main() {
    let s = "Hello 世界";
    println!("字符数：{}", s.chars().count());  // 8
    println!("字节数：{}", s.len());             // 12
}
```

**字形簇（Grapheme Cluster）** — 用户看到的"一个字符"，可能由多个 Unicode 字符组合而成（最常见的是变音符号）：

```rust runnable
fn main() {
    // 这个看起来像一个"e"，但由两个 Unicode 字符组成
    let e_with_acute = "é";  // U+00E9（单个字符）
    let e_combining = "e\u{0301}";  // e（U+0065）+ 锐重音（U+0301）

    println!("字节数（é）：{}", e_with_acute.len());
    println!("字符数（é）：{}", e_with_acute.chars().count());

    println!("字节数（e̍）：{}", e_combining.len());
    println!("字符数（e̍）：{}", e_combining.chars().count());
}
```

**结论**：永远不要假设"一个字符 = 一个字节"。需要的时候：
- 按字节处理用 `.len()` 和 `&s[..]`
- 按字符处理用 `.chars()`
- 按字形簇处理需要第三方库

## 字符迭代

遍历字符串中的每个 **Unicode 字符**（而不是字节）：

```rust runnable
fn main() {
    let s = "Hello 🦀";

    for ch in s.chars() {
        println!("字符：{}", ch);
    }
}
```

迭代**字节**（如果你真的需要）：

```rust runnable
fn main() {
    let s = "hello";

    for byte in s.bytes() {
        println!("字节：{}", byte);
    }
}
```

## 常用字符串方法

**查看是否包含子字符串**：

```rust runnable
fn main() {
    let s = "Hello, Rust!";

    println!("包含 'Rust'？{}", s.contains("Rust"));
    println!("包含 'Python'？{}", s.contains("Python"));
}
```

**查看开头或结尾**：

```rust runnable
fn main() {
    let s = "hello.txt";

    println!("以 'hello' 开头？{}", s.starts_with("hello"));
    println!("以 '.txt' 结尾？{}", s.ends_with(".txt"));
}
```

**分割字符串**：

```rust runnable
fn main() {
    let s = "one,two,three";

    for part in s.split(',') {
        println!("部分：{}", part);
    }
}
```

**移除首尾空白**：

```rust runnable
fn main() {
    let s = "  Hello, Rust!  ";

    println!("原字符串：'{}'", s);
    println!("trim()：'{}'", s.trim());
    println!("trim_start()：'{}'", s.trim_start());
    println!("trim_end()：'{}'", s.trim_end());
}
```

**转换大小写**：

```rust runnable
fn main() {
    let s = "Hello, Rust!";

    println!("大写：{}", s.to_uppercase());
    println!("小写：{}", s.to_lowercase());
}
```

## String 作为函数参数

这是初学者经常遇到的问题：**应该传 `String` 还是 `&str`？**

一般规则是：**优先传 `&str`**。原因是 `&str` 更灵活——无论你有 `String` 还是字面量，都可以转换成 `&str`：

```rust runnable
fn print_string(s: &str) {
    println!("接收到：{}", s);
}

fn main() {
    // 传入字面量（已经是 &str）
    print_string("Hello");

    // 传入 String（会自动解引用转换成 &str）
    let owned = String::from("World");
    print_string(&owned);
}
```

如果你传 `String`，那就只能接收 `String`，不能接收字面量（需要显式转换）：

```rust runnable
fn print_string_owned(s: String) {
    println!("接收到：{}", s);
}

fn main() {
    let owned = String::from("Hello");
    print_string_owned(owned);

    // print_string_owned("World");  // ✗ 错误！需要显式转换
    print_string_owned("World".to_string());  // 可以，但很啰嗦
}
```

> **最佳实践**：除非函数需要**修改**字符串或需要**获得所有权**，否则总是接收 `&str`。

## 字符串解析

将字符串转换成其他类型，使用 `parse()` 方法：

```rust runnable
fn main() {
    let s1 = "42";
    let num: i32 = s1.parse().expect("无法解析为整数");
    println!("解析后：{}", num);

    let s2 = "3.14";
    let float: f64 = s2.parse().expect("无法解析为浮点数");
    println!("解析后：{}", float);
}
```

# 练习题

## String 和 &str 基础测验

```rust
fn main() {
    let s1 = "Hello";
    let s2 = String::from("Hello");
}
```

```quiz single
Q: 上面两个变量的类型分别是什么？
- 两个都是 String
+ s1 是 &str，s2 是 String
- s1 是 String，s2 是 &str
- 两个都是 &str
E: 字符串字面量（双引号中的文本）的类型是 &str。String::from() 创建一个堆上的 String。
```

```quiz multi
Q: 下列关于 String 和 &str 的说法，哪些正确？
+ 字符串字面量是 &str 类型
+ String 拥有其数据的所有权，声明为 mut 的话可以修改
+ &str 是借用的字符串切片，不可修改
- String 总是存储在栈上
E: String 在堆上分配数据，而 &str 可能指向栈、数据段或堆上的数据。字面量在编译时确定，属于 &str。
```

## 字符串创建与修改

```rust
let mut s = String::from("Hello");
s.push('!');
s.push_str(" World");
```

```quiz single
Q: 执行上面代码后，s 的值是什么？
+ "Hello! World"
- "Hello World!"
- "Hello! World!"
- 编译错误
E: push() 添加单个字符 '!'，push_str() 添加字符串 " World"，所以结果是 "Hello! World"。
```

```quiz multi
Q: 关于字符串修改操作，下列哪些说法正确？
+ push() 用于添加单个字符
+ push_str() 不获得所有权，原字符串仍可用
- pop() 向开头删除一个字符
+ truncate() 按字节位置保留前 n 个字节
E: pop() 删除末尾字符。truncate() 有效，但必须小心 UTF-8 字节边界。
```

## 字符编码和索引

```rust
let s = "Hello 中文";
let byte_count = s.len();
let char_count = s.chars().count();
```

```quiz single
Q: 上面代码执行后，byte_count 和 char_count 分别是多少？
+ byte_count = 12, char_count = 8
- byte_count = 8, char_count = 8
- byte_count = 8, char_count = 7
- byte_count = 9, char_count = 9
E: "Hello " 是 6 个字节，每个中文字符是 3 个字节（2 个），共 12 字节。字符数是 6 + 2 = 8。
```

```quiz single
Q: 为什么 Rust 不允许用 `s[0]` 来访问字符串的第一个字符？
- String 不是数组
+ 因为 UTF-8 字符可能占多个字节，s[0] 只能返回一个字节，而不是一个字符
- 这样可以提高性能
- 这是 Rust 的设计限制
E: Rust 禁用直接索引是为了避免在多字节字符中间切割，导致 panic 或未定义行为。
```

## 函数参数和常用操作

```rust
fn describe(s: &str) {
    println!("字符串：{}", s);
}

fn main() {
    describe("Hello");
    describe(&String::from("World"));
}
```

```quiz single
Q: 上面的代码能否编译成功？
+ 能，&str 参数可以接收字面量和 String 的引用
- 不能，String 需要显式转换
- 不能，不能同时传字面量和 String
- 不能，第二行语法错误
E: &str 参数的优点就是既能接收 &str 类型的字面量，也能接收 String 通过 & 得到的引用（自动解引用）。
```

## 编程练习

### 练习 1：字符串切片和迭代

完成下面程序，要求对字符串进行分析：

```rust editable
fn main() {
    let text = "Hello, Rust!";

    // TODO 1: 获取前 5 个字节的切片
    let first_five =
    println!("前5个字节: {}", first_five);

    // TODO 2: 遍历并计算所有字符，使用 for 实现
    let mut char_count = 0;
    for  {
        // TODO: 计数
    }
    println!("字符总数: {}", char_count);

    // TODO 3: 检查字符串是否以 "Hello" 开头
    if  {
        println!("以 'Hello' 开头: true");
    }

    // TODO 4: 检查字符串是否以 "!" 结尾
    if  {
        println!("以 '!' 结尾: true");
    }
}
```

```expected
前5个字节: Hello
字符总数: 12
以 'Hello' 开头: true
以 '!' 结尾: true
```

### 练习 2：文本处理函数

编写一个函数 `process_text()`，接收一个 `&str`，返回处理后的 `String`。要求：
1. 移除首尾空白
2. 将所有内容转为小写
3. 如果内容为空则返回 "(empty)"

```rust editable
fn process_text(text: &str) -> String {
    // TODO: 实现函数体

}

fn main() {
    let test1 = "  HELLO WORLD  ";
    let result1 = process_text(test1);
    println!("输入: '{}' -> 输出: '{}'", test1, result1);

    let test2 = "    ";
    let result2 = process_text(test2);
    println!("输入: '{}' -> 输出: '{}'", test2, result2);

    let test3 = "RustLang";
    let result3 = process_text(test3);
    println!("输入: '{}' -> 输出: '{}'", test3, result3);
}
```

```expected
输入: '  HELLO WORLD  ' -> 输出: 'hello world'
输入: '    ' -> 输出: '(empty)'
输入: 'RustLang' -> 输出: 'rustlang'
```
