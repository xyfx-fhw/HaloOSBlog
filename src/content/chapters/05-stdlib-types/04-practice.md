---
title: "综合练习"
description: "综合检验对 Vec<T>、String 和 HashMap 的理解，通过完整的编程项目掌握标准库集合类型，学会在实际场景中灵活应用所有权规则。"
difficulty: intermediate
estimatedTime: 90
keywords: ["向量", "字符串", "哈希表", "综合应用", "所有权", "集合"]
---

# 代码判断题

## 题目 1：向量与所有权

```rust
fn main() {
    let mut vec = vec![1, 2, 3];
    let first = &vec[0];
    
    vec.push(4);
    
    println!("{}", first);
}
```

```quiz single
Q: 这段代码能编译吗？
- 能，push 不影响现有元素
+ 不能，first 是对 vec 的不可变借用，而 vec.push(4) 试图可变修改 vec
- 能，first 已经复制了值
- 能，但运行时会 panic
E: Rust 的借用规则：当存在不可变借用时，不能进行可变借用。first 引用了 vec 的元素，所以 push 无法执行。
```

## 题目 2：String 与 &str 的区别

```rust
fn modify_string(s: &mut String) {
    s.push_str("!");
}

fn main() {
    let s = "Hello";
    modify_string(s);
}
```

```quiz single
Q: 这段代码的问题是什么？
- modify_string 函数没有 impl 块
+ 字符串字面量 "Hello" 的类型是 &str，不是 String，无法可变借用
- s 没有声明为 mut
- 编译时会产生内存泄漏
E: 字符串字面量 "Hello" 是 &str 类型，本身是不可变的。函数期望 &mut String，类型不匹配。
```

## 题目 3：HashMap 的所有权转移

```rust
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    let key = String::from("name");
    
    map.insert(key, "Alice");
    
    println!("{}", key);
}
```

```quiz single
Q: 这段代码能编译吗？
- 能，key 被复制了
+ 不能，key 的所有权被转移给了 HashMap
- 能，但会输出 null
- 不能，HashMap 不支持 String 作为键
E: 当把 String 插入 HashMap 时，String 的所有权转移给了 HashMap。之后无法再使用 key。
```

## 题目 4：向量的迭代与修改

```rust
fn main() {
    let mut vec = vec![1, 2, 3];
    
    for val in &vec {
        if *val == 2 {
            vec.push(4);
        }
    }
}
```

```quiz single
Q: 这段代码能编译吗？
- 能，push 只添加元素
+ 不能，不能在迭代时可变修改向量（会导致迭代器失效）
- 能，但会无限循环
- 能，会输出错误
E: 当你持有向量的不可变借用（通过迭代器）时，不能进行可变操作。这违反了 Rust 的借用规则。
```

## 题目 5：字符串查找

```rust
fn main() {
    let s = String::from("hello");
    let sub = "ll";
    
    if s.contains(sub) {
        println!("找到了");
    }
}
```

```quiz single
Q: 这段代码的输出是？
- 编译错误
+ 找到了
- 什么也不输出
- panic
E: String 类型的 contains() 方法接受 &str，sub 会自动转换为 &str。"hello" 确实包含 "ll"。
```

---

# 编程练习

## 练习 1：向量去重

从一个向量中移除所有重复的元素，保留第一次出现的值。

**任务：**
- 实现 `deduplicate()` 函数，接收 `Vec<i32>`，返回去重后的新向量
- 只保留每个值的第一次出现

**格式要求：**
- 输入：`[1, 2, 2, 3, 1, 4, 3]`
- 输出：`[1, 2, 3, 4]`

**提示：**
- 可以创建一个新的空向量
- 遍历原向量，检查元素是否已在结果向量中
- `vec.contains(&x)` 可以检查是否存在

```rust editable
fn deduplicate(mut vec: Vec<i32>) -> Vec<i32> {
    // TODO: 创建结果向量，遍历原向量去重
}

fn main() {
    let nums = vec![1, 2, 2, 3, 1, 4, 3];
    let result = deduplicate(nums);
    println!("{:?}", result);
}
```

```expected
[1, 2, 3, 4]
```

## 练习 2：字符串统计

统计字符串中每个字符出现的次数。

**任务：**
- 实现 `count_chars()` 函数，接收 `&str`，返回每个字符及其出现次数的字符串
- 按字符首次出现的顺序输出
- 格式：`'a':3 'b':2 'c':1`

**格式要求：**
- 输入：`"aabbc"`
- 输出：`'a':2 'b':2 'c':1`

**提示：**
- 创建一个向量来保存首次出现的字符顺序
- 创建一个向量存储对应的计数
- 或者用 HashMap

```rust editable
fn count_chars(s: &str) -> String {
    // TODO: 统计每个字符出现的次数
    // 返回按首次出现顺序格式化的字符串
}

fn main() {
    let text = "aabbc";
    println!("{}", count_chars(text));
}
```

```expected
'a':2 'b':2 'c':1
```

## 练习 3：向量求和与平均值

计算向量中所有数字的总和和平均值。

**任务：**
- 实现 `calculate_stats()` 函数，接收 `&[i32]`，返回包含总和和平均值的字符串
- 格式：`总和: {sum}, 平均值: {avg}`
- 平均值只保留一位小数

**格式要求：**
- 输入：`&[10, 20, 30]`
- 输出：`总和: 60, 平均值: 20.0`

```rust editable
fn calculate_stats(nums: &[i32]) -> String {
    // TODO: 计算总和和平均值
    // 使用 format! 返回结果字符串
}

fn main() {
    let numbers = [10, 20, 30];
    println!("{}", calculate_stats(&numbers));
}
```

```expected
总和: 60, 平均值: 20.0
```

## 练习 4：单词频率统计

统计文本中每个单词出现的次数，输出频率最高的单词。

**任务：**
- 实现 `most_frequent_word()` 函数，接收 `&str`
- 返回出现次数最多的单词和出现次数
- 格式：`"{word}" 出现了 {count} 次`
- 假设单词用空格分隔

**格式要求：**
- 输入：`"the cat and the dog and the bird"`
- 输出：`"the" 出现了 3 次`

**提示：**
- 用 `split()` 方法分割单词
- 使用 HashMap 存储单词计数
- 找出最大值

```rust editable
use std::collections::HashMap;

fn most_frequent_word(text: &str) -> String {
    // TODO: 统计单词频率
    // 返回频率最高的单词
    String::new()
}

fn main() {
    let text = "the cat and the dog and the bird";
    println!("{}", most_frequent_word(text));
}
```

```expected
"the" 出现了 3 次
```

## 练习 5：简单的电话簿

实现一个简单的电话簿系统。

**任务：**
- 创建一个 `PhoneBook` 结构体，包含 HashMap 存储名字和电话
- 实现 `new()` 创建空电话簿
- 实现 `add()` 方法添加联系人
- 实现 `find()` 方法查询电话，如果不存在返回 "Not found"

**格式要求：**
- 依次执行：add("Alice", "123-4567")、add("Bob", "234-5678")、find("Alice")、find("Charlie")
- 输出：

```text
Alice: 123-4567
Charlie: Not found
```

```rust editable
use std::collections::HashMap;

struct PhoneBook {
    // TODO: 添加一个 HashMap 字段
}

impl PhoneBook {
    fn new() -> PhoneBook {
        // TODO: 创建空电话簿
    }
    
    fn add(&mut self, name: &str, phone: &str) {
        // TODO: 添加联系人
    }
    
    fn find(&self, name: &str) -> String {
        // TODO: 查询联系人，返回格式化字符串
        String::new()
    }
}

fn main() {
    let mut pb = PhoneBook::new();
    pb.add("Alice", "123-4567");
    pb.add("Bob", "234-5678");
    
    println!("{}", pb.find("Alice"));
    println!("{}", pb.find("Charlie"));
}
```

```expected
Alice: 123-4567
Charlie: Not found
```

## 练习 6：学生成绩管理

实现一个学生成绩管理系统，记录每个学生的多门课程成绩。

**任务：**
- 创建一个结构体，用 HashMap 存储学生的成绩（学生名 -> Vec 成绩）
- 实现 `new()` 创建管理器
- 实现 `add_score()` 方法添加成绩
- 实现 `get_average()` 方法返回某学生的平均成绩，格式：`"{name}: {avg:.1}"`
  如果学生不存在或无成绩返回 "未找到"

**格式要求：**
- 为 "Alice" 添加成绩 [85, 90, 88]
- 为 "Bob" 添加成绩 [92, 88]
- 输出 Alice 的平均成绩和 Bob 的平均成绩

```rust editable
use std::collections::HashMap;

struct GradeManager {
    // TODO: 添加 HashMap 字段
}

impl GradeManager {
    fn new() -> GradeManager {
        // TODO: 创建管理器
    }
    
    fn add_score(&mut self, name: &str, score: i32) {
        // TODO: 向学生的成绩列表添加成绩
    }
    
    fn get_average(&self, name: &str) -> String {
        // TODO: 计算平均成绩，返回格式化字符串
        String::new()
    }
}

fn main() {
    let mut manager = GradeManager::new();
    
    // 为 Alice 添加成绩
    manager.add_score("Alice", 85);
    manager.add_score("Alice", 90);
    manager.add_score("Alice", 88);
    
    // 为 Bob 添加成绩
    manager.add_score("Bob", 92);
    manager.add_score("Bob", 88);
    
    println!("{}", manager.get_average("Alice"));
    println!("{}", manager.get_average("Bob"));
}
```

```expected
Alice: 87.7
Bob: 90.0
```

## 练习 7：日志解析

解析一个简单的日志字符串，统计每个操作的执行次数。

**任务：**
- 实现 `parse_log()` 函数，接收日志字符串
- 日志格式：每行一个操作，格式为 `[操作名]`，操作之间用 `;` 分隔
- 统计每种操作出现的次数
- 返回一个 HashMap，键是操作名，值是出现次数

**格式要求：**
- 输入：`"login;logout;login;login;logout"`
- 输出：`{"login": 3, "logout": 2}`

**提示：**
- 用 `split(';')` 分割操作
- 使用 HashMap 统计

```rust editable
use std::collections::HashMap;

fn parse_log(log: &str) -> HashMap<String, i32> {
    // TODO: 解析日志，返回操作统计结果
    HashMap::new()
}

fn main() {
    let log = "login;logout;login;login;logout";
    let stats = parse_log(log);
    
    for (op, count) in &stats {
        println!("{}: {}", op, count);
    }
}
```

```expected
login: 3
logout: 2
```

## 练习 8：综合项目 - 购物车系统

实现一个简单的购物车系统。

**任务：**
- 创建一个 `ShoppingCart` 结构体
- 使用 HashMap 存储商品名 -> 数量
- 实现 `add_item()` 方法添加商品（可以重复添加，每次增加数量）
- 实现 `remove_item()` 方法移除商品（数量减 1，如果数量变成 0 则删除）
- 实现 `get_items()` 方法返回所有商品及其数量（格式：逐行输出 "商品名: 数量"）
- 实现 `total_items()` 方法返回购物车中商品总数

**格式要求：**
- 添加苹果 3 个、香蕉 2 个、苹果 1 个（共 4 个苹果）
- 移除苹果 1 个（变成 3 个苹果）
- 输出购物车中所有商品
- 输出总数

```rust editable
use std::collections::HashMap;

struct ShoppingCart {
    // TODO: 添加 HashMap 字段存储商品信息
}

impl ShoppingCart {
    fn new() -> ShoppingCart {
        // TODO: 创建空购物车
    }
    
    fn add_item(&mut self, name: &str, quantity: i32) {
        // TODO: 添加商品
    }
    
    fn remove_item(&mut self, name: &str, quantity: i32) {
        // TODO: 移除商品
    }
    
    fn get_items(&self) -> String {
        // TODO: 返回所有商品的格式化字符串
        String::new()
    }
    
    fn total_items(&self) -> i32 {
        // TODO: 返回商品总数
        0
    }
}

fn main() {
    let mut cart = ShoppingCart::new();
    
    cart.add_item("苹果", 3);
    cart.add_item("香蕉", 2);
    cart.add_item("苹果", 1);
    
    cart.remove_item("苹果", 1);
    
    println!("购物车内容：");
    println!("{}", cart.get_items());
    println!("总数：{}", cart.total_items());
}
```

```expected
购物车内容：
苹果: 4
香蕉: 2
总数：6
```

---

**完成这些练习，你就掌握了 Rust 标准库集合类型的实战应用！**

从简单的向量操作，到字符串处理，再到 HashMap 的复杂场景，这些练习覆盖了 Rust 开发中最常见的数据结构使用模式。现在你已经做好准备，可以去处理更复杂的真实项目了。加油！
