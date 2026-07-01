---
title: "HashMap<K, V>——键值对集合"
description: "掌握 Rust 中最常用的键值对数据结构 HashMap，学会创建、插入、查询、修改和遍历，理解所有权规则和常见使用模式。"
difficulty: beginner
estimatedTime: 50
keywords: ["哈希表", "HashMap", "键值对", "字典", "所有权", "entry API", "迭代"]
---

# 什么是 HashMap

**HashMap<K, V>** 是 Rust 标准库中最常用的**键值对**（key-value pair）集合类型。与向量 `Vec<T>` 和字符串 `String` 不同，HashMap 不按位置存储数据，而是通过**键**来查找对应的**值**。

想象一个现实场景：你要建一本电话簿。向量不太适合，因为你需要通过**姓名**（而不是位置）来查找电话号码。

```rust runnable
use std::collections::HashMap;

fn main() {
    // 创建一个 HashMap 存储人名 -> 电话号码
    let mut phone_book = HashMap::new();

    phone_book.insert("Alice", "123-4567");
    phone_book.insert("Bob", "234-5678");
    phone_book.insert("Charlie", "345-6789");

    // 通过姓名查找电话
    if let Some(phone) = phone_book.get("Alice") {
        println!("Alice 的电话：{}", phone);
    }
}
```

## 为什么需要 HashMap

对比三种查找场景：

| 场景 | 向量 | 字符串 | HashMap |
|------|------|--------|---------|
| 按位置查找 | ✓ 快速 | ✗ 不适合 | ✗ 不适合 |
| 按内容查找 | ✗ 需要遍历 | ✓ 可以 | ✓ 快速 |
| 关联数据 | ✗ 分散 | ✗ 分散 | ✓ 紧凑 |

HashMap 通过**哈希函数**将键映射到存储位置，使得查找、插入、删除的平均时间复杂度是 O(1)，远比遍历向量快得多。

## HashMap 的基本概念

每个条目由两部分组成：
- **键（Key）**：用来查找的唯一标识，必须实现 `Eq` 和 `Hash` trait
- **值（Value）**：与键关联的数据，类型没有限制

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();

    // Key 是 String，Value 是 i32
    map.insert("apple", 5);
    map.insert("banana", 3);
    map.insert("cherry", 7);

    println!("苹果的数量：{}", map.get("apple").unwrap_or(&0));
}
```

> **哈希函数**（Hash Function）：一个函数，能快速把任意大小的输入"转换"成固定大小的数字（位置）。想象一下档案馆：给定一个人名，哈希函数计算出应该放在哪一行哪一列，从而快速找到文件。Rust 中常见的键类型（`i32`、`String` 等）都内置了哈希实现，不用你手动处理。

# 使用HashMap

## 创建和初始化 HashMap

### 使用 `HashMap::new()`

最直接的创建方式：

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map: HashMap<String, i32> = HashMap::new();

    println!("空 HashMap 的长度：{}", map.len());
}
```

注意这里需要显式标注类型 `HashMap<String, i32>`，因为 HashMap 是空的，编译器无法推断。

### 从向量创建

一个常见的模式是从**元组向量**转换成 HashMap：

```rust runnable
use std::collections::HashMap;

fn main() {
    // 一个团队的名字和成绩
    let teams = vec![
        ("Alice", 88),
        ("Bob", 92),
        ("Charlie", 85),
    ];

    // 使用 collect() 将向量转换为 HashMap
    let scores: HashMap<&str, i32> = teams.iter().cloned().collect();

    println!("总共 {} 个团队", scores.len());
    println!("Bob 的成绩：{}", scores.get("Bob").unwrap_or(&0));
}
```

> **学习提示**：`iter().cloned().collect()` 是一个很常用的模式。不用现在完全理解迭代器的细节，[闭包与迭代器](/RustCourse/chapters/12-closures-iterators/00-index)章节会详细讲解。

## 访问 HashMap 中的值

### 使用 `get()` 方法

最安全的访问方式是 `get()`，它返回 `Option<&V>`：

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("name", "Alice");
    map.insert("job", "Engineer");

    // get() 返回 Option<&V>
    match map.get("name") {
        Some(name) => println!("名字：{}", name),
        None => println!("找不到 name 键"),
    }

    match map.get("age") {
        Some(age) => println!("年龄：{}", age),
        None => println!("找不到 age 键"),
    }
}
```

`get()` 的优点是**不会 panic**，你可以安全地处理键不存在的情况。

### 使用索引访问

也可以直接用 `map[key]` 访问，但如果键不存在会 panic：

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("city", "Beijing");

    // 如果键确实存在，直接用 [] 没关系
    println!("城市：{}", map["city"]);

    // 但如果键不存在会 panic：
    // println!("{}", map["nonexistent"]);  // ✗ panic！
}
```

**选择建议**：
- 用 `get()` 当键可能不存在时
- 用 `[]` 当你确定键一定存在时

### 检查键是否存在

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("red", 0xFF0000);
    map.insert("green", 0x00FF00);

    if map.contains_key("red") {
        println!("红色存在！");
    }

    if !map.contains_key("blue") {
        println!("蓝色不存在，添加它");
        map.insert("blue", 0x0000FF);
    }
}
```

### 获取 HashMap 的大小

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("x", 10);
    map.insert("y", 20);

    println!("条目数量：{}", map.len());
    println!("是否为空：{}", map.is_empty());
}
```

## 插入和修改数据

### 插入新键值对

`insert()` 既可以添加新数据，也可以覆盖存在的值：

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();

    // 第一次插入
    map.insert("a", 1);
    println!("插入后：{:?}", map);

    // 如果键已存在，新值覆盖旧值
    let old_value = map.insert("a", 10);
    println!("返回的旧值：{:?}", old_value);
    println!("现在的值：{:?}", map);
}
```

`insert()` 会返回原来的值（如果存在），这很有用。

### 使用 `entry()` API 优化更新

**`entry()` 的作用**：只需查找一次，就能**检查键是否存在**并**根据存在与否来执行不同的操作**。它返回一个 `Entry` 对象，你可以链式调用 `or_insert()`（不存在就插入）或 `and_modify()`（存在就修改）。

为什么用 `entry()` 而不是先 `get()` 再 `insert()`？因为 `entry()` 只查找一次，而分开操作需要查找两次，性能更差。

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();

    // 场景 1：只在键不存在时才插入
    map.entry("name").or_insert("Alice");
    println!("name：{}", map.get("name").unwrap());

    map.entry("name").or_insert("Bob");  // 已存在，不会改变
    println!("name 仍然是：{}", map.get("name").unwrap());

    // 场景 2：修改已存在的值，否则插入初始值（常见的计数模式）
    map.entry("count")
        .and_modify(|e| *e += 1)  // 如果存在，修改它，这里的操作后面会讲到，目前只需要会用即可
        .or_insert(1);             // 如果不存在，插入 1

    println!("count：{}", map.get("count").unwrap());

    // 再运行一次
    map.entry("count")
        .and_modify(|e| *e += 1)
        .or_insert(1);

    println!("count 现在是：{}", map.get("count").unwrap());
}
```

这个模式在**计数、累加、初始化**等场景中最常见。

## 删除数据

### 删除键值对

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("name", "Alice");
    map.insert("age", "28");

    // remove() 返回删除的值
    if let Some(value) = map.remove("age") {
        println!("删除的值：{}", value);
    }

    println!("删除后的 map：{:?}", map);
}
```

### 清空 HashMap

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("a", 1);
    map.insert("b", 2);

    println!("清空前：{}", map.len());
    map.clear();
    println!("清空后：{}", map.len());
}
```

## 遍历 HashMap

### 遍历所有键值对

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("red", 0xFF0000);
    map.insert("green", 0x00FF00);
    map.insert("blue", 0x0000FF);

    // 遍历键值对
    for (color, hex) in &map {
        println!("{} 的十六进制值：{:06X}", color, hex);
    }
}
```

### 只遍历键

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("Alice", 88);
    map.insert("Bob", 92);
    map.insert("Charlie", 85);

    println!("所有学生：");
    for name in map.keys() {
        println!("  {}", name);
    }
}
```

### 只遍历值

```rust runnable
use std::collections::HashMap;

fn main() {
    let map = {
        let mut m = HashMap::new();
        m.insert("Alice", 88);
        m.insert("Bob", 92);
        m.insert("Charlie", 85);
        m
    };

    println!("所有分数：");
    for score in map.values() {
        println!("  {}", score);
    }
}
```

### 可变遍历

要修改值，需要可变引用：

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("apple", 5);
    map.insert("banana", 3);
    map.insert("cherry", 7);

    // 将所有数量翻倍
    for (_fruit, count) in &mut map {
        *count *= 2;
    }

    println!("翻倍后：{:?}", map);
}
```

> **提示**：**不能在遍历 HashMap 时修改其大小**（添加或删除键值对）。这会导致迭代器失效，导致编译错误。如果需要在遍历中过滤或修改 HashMap，应该先遍历收集结果，然后在循环外修改。这个限制和向量一样——它们都使用迭代器，都要保护迭代器的有效性。

# HashMap 的所有权规则

HashMap **拥有其键和值的所有权**。这是一个容易出错的地方。

## 键和值被转移到 HashMap

```rust runnable
use std::collections::HashMap;

fn main() {
    let key = String::from("name");
    let value = String::from("Alice");

    let mut map = HashMap::new();
    map.insert(key, value);

    // 现在 key 和 value 的所有权已转移到 map
    // println!("{}", key);    // ✗ 错误！key 已被转移
    // println!("{}", value);  // ✗ 错误！value 已被转移

    println!("map 中的值：{:?}", map);
}
```

但如果键和值是 **Copy 类型**（如 `i32`），就不会转移所有权：

```rust runnable
use std::collections::HashMap;

fn main() {
    let key = 1;
    let value = 100;

    let mut map = HashMap::new();
    map.insert(key, value);

    // key 和 value 都是 i32（Copy 类型），仍可使用
    println!("key：{}，value：{}", key, value);
    println!("map 中的值：{:?}", map);
}
```

## 使用引用作为键

如果键是非 Copy 类型（如 `String`），不想转移所有权，可以用**引用**：

```rust runnable
use std::collections::HashMap;

fn main() {
    let key = String::from("name");
    let value = String::from("Alice");

    let mut map = HashMap::new();
    map.insert(&key, &value);  // 用引用

    // 现在可以继续使用原始的 key 和 value
    println!("key：{}，value：{}", key, value);
    println!("map 中的键：{:?}", map.get(key.as_str()).unwrap());
}
```

但这样做有个限制：HashMap 中的引用受**生命周期**约束（后续章节会学到）。实际上最常见的做法是 HashMap 拥有数据的所有权。

# HashMap 的重要特性

## 键必须实现 Eq 和 Hash

这是 HashMap 的一个基础限制。大多数内置类型（`i32`、`String`、`&str` 等）都实现了这两个 trait，所以通常不是问题。

```rust runnable
use std::collections::HashMap;

fn main() {
    // 这些都是合法的键
    let mut m1 = HashMap::new();
    m1.insert(1, "one");  // i32 可以

    let mut m2 = HashMap::new();
    m2.insert("key", "value");  // &str 可以

    let mut m3 = HashMap::new();
    m3.insert(String::from("key"), "value");  // String 可以

    println!("所有类型都有效！");
}
```

## HashMap 无序

HashMap **不保证遍历顺序**。如果需要有序的键值对，需要使用 `BTreeMap`（后续章节会提到）。

```rust runnable
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert(3, "three");
    map.insert(1, "one");
    map.insert(2, "two");

    // 遍历顺序未定义，可能是 3, 1, 2 或任何其他顺序
    for (k, v) in &map {
        println!("{}: {}", k, v);
    }
}
```

# 练习题

## HashMap 基础测验

```quiz single
Q: 下列哪个选项正确描述了 HashMap 与 Vec 的主要区别？
+ HashMap 通过键快速查找，Vec 通过位置查找，HashMap 查找更高效
- HashMap 只能存储整数，Vec 可以存储任何类型
- Vec 的内存开销更小，应该总是优先使用 Vec
- HashMap 和 Vec 都可以用索引访问，没有本质区别
E: HashMap 使用哈希函数将键映射到值，查找时间复杂度 O(1)；Vec 需要遍历，时间复杂度 O(n)。选择 HashMap 还是 Vec 取决于你是按位置还是按内容查找。
```

```quiz single
Q: 下列关于 HashMap 中键的说法，正确的是？
- 键可以重复，相同的键可以存储多个值
- 键必须是字符串类型
+ 键必须实现 Eq 和 Hash trait，大多数内置类型满足这个条件
- 键可以是任何类型，包括浮点数和自定义结构体
E: HashMap 要求键能进行相等比较（Eq）和哈希运算（Hash），才能正确地进行查找和存储。String、&str、i32 等内置类型都满足。
```

```quiz multi
Q: 下列关于 HashMap 的所有权规则，正确的是？（多选）
+ 如果键是 Copy 类型（如 i32），插入后原变量仍可用
+ HashMap 拥有其键和值的所有权
- HashMap 通过借用存储数据，不会转移所有权
+ 如果键是 String，插入后原变量的所有权被转移
E: HashMap 获得键和值的完整所有权。Copy 类型被复制，非 Copy 类型（如 String）的所有权被转移。
```

```quiz single
Q: 如果想在键不存在时才插入值，应该用哪个方法？
- map.get("key").or_insert(value)
- map["key"] = value
- map.insert("key", value)
+ map.entry("key").or_insert(value)
E: entry().or_insert() 是优化的方法，只在键不存在时才插入。直接 insert() 会覆盖已存在的值。
```

```rust
let mut map = HashMap::new();
map.insert("count", 0);
map.entry("count").and_modify(|e| *e += 1).or_insert(0);
map.entry("count").and_modify(|e| *e += 1).or_insert(0);
```

```quiz single
Q: 下列代码运行后，map 中会有什么值？
- 1
+ 2
- 编译错误
- 0
E: entry("count").and_modify() 会修改存在的值。两次执行都会将值加 1，最终结果是 2。
```

```quiz multi
Q: 关于遍历 HashMap，下列说法正确的是？（多选）
- 在遍历 HashMap 的循环中可以安全地删除或添加键值对
+ for key in map.keys() 可以只遍历键
+ for (key, value) in &map 可以遍历所有键值对
+ HashMap 遍历顺序不固定，无法保证顺序
E: 不可变借用遍历不会转移所有权。在遍历时修改 HashMap 的大小（添加/删除）会导致迭代器失效，就像向量一样。HashMap 本身不保证遍历顺序，每次可能不同。
```

## 编程练习

### 练习 1：创建和查询 HashMap

创建一个 HashMap 存储学生姓名和分数，然后查询特定学生的分数。

```rust editable
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();

    // TODO: 添加三个学生及其分数
    // Alice: 88, Bob: 92, Charlie: 85


    // TODO: 查询 Alice 的分数，如果存在打印，不存在打印"学生不存在"


    // TODO: 检查 "Diana" 是否存在，不存在则添加分数 90


    for (name, score) in scores {
        println!("{}: {}", name, score);
    }
}
```

```expected
Alice: 88
Bob: 92
Charlie: 85
Diana: 90
```

### 练习 2：更新和删除

在 HashMap 中更新值和删除键。

```rust editable
use std::collections::HashMap;

fn main() {
    let mut inventory = HashMap::new();
    inventory.insert("apple", 10);
    inventory.insert("banana", 5);
    inventory.insert("cherry", 8);

    println!("初始库存：{:?}", inventory);

    // TODO: 将苹果的数量增加 5 个（用 entry().and_modify(|e| *e += 5)）

    println!("苹果现在有 {} 个", inventory.get("apple").unwrap());

    // TODO: 删除香蕉并打印删除的数量
    if let Some(count) =  {
        println!("删除的香蕉数量：{}", count);
    }

    // TODO: 添加新的水果 "grape"，数量 12


    // TODO: 打印最终库存
    println!("最终库存：{:?}", inventory);
}
```

```expected
初始库存：{"apple": 10, "banana": 5, "cherry": 8}
苹果现在有 15 个
删除的香蕉数量：5
最终库存：{"apple": 15, "cherry": 8, "grape": 12}
```
