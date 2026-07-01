---
title: "适配器"
description: "理解消费适配器与迭代器适配器的本质区别，掌握 sum/collect/fold 与 map/filter/zip 等常用方法"
difficulty: intermediate
estimatedTime: 40
keywords: ["消费适配器", "迭代器适配器", "map", "filter", "collect", "fold", "zip", "enumerate", "Iterator"]
---

# 两类适配器

`Iterator` trait 上有几十个方法，它们分为截然不同的两类：

| 类别 | 返回值 | 是否惰性 | 典型方法 |
|------|--------|---------|---------|
| **迭代器适配器** | 新的迭代器 | 是（不立即执行） | `map`、`filter`、`zip`、`enumerate` |
| **消费适配器** | 最终结果值 | 否（立即执行并消耗） | `sum`、`collect`、`fold`、`find` |

一条完整的迭代器链通常长这样：**迭代器适配器（零个或多个）→ 消费适配器（恰好一个）**。

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5, 6];

    let result: i32 = v.iter()          // 创建迭代器
        .filter(|&&x| x % 2 == 0)      // 迭代器适配器：惰性，只描述"保留偶数"
        .map(|&x| x * x)               // 迭代器适配器：惰性，只描述"平方"
        .sum();                         // 消费适配器：触发执行，返回 i32

    println!("{}", result); // 4 + 16 + 36 = 56
}
```

> **关键点**：`filter` 和 `map` 被调用时**什么都没有发生**，它们只是在描述"待做的变换"。直到 `sum()` 被调用，整条链才从头到尾运行一遍。这就是惰性求值的好处——中间不产生任何临时集合，内存效率更高。

## 如果只调用适配器，不消费会怎样？

```rust runnable expect-error
fn main() {
    let v = vec![1, 2, 3];

    v.iter().map(|x| x * 2); // 编译器警告：unused Map，适配器是惰性的，不消费则什么都不做
}
```

Rust 编译器会发出警告提醒你：这段代码什么都没做。

# 消费适配器

消费适配器获取迭代器的所有权，反复调用 `next()` 直到 `None`，最终产生一个非迭代器的结果值。**调用之后迭代器就不能再用了。**

| 方法 | 返回值 | 功能 |
|------|--------|------|
| `sum()` | 数值 | 对所有元素求和 |
| `product()` | 数值 | 对所有元素求乘积 |
| `count()` | `usize` | 统计元素个数 |
| `last()` | `Option<T>` | 获取最后一个元素 |
| `nth(n)` | `Option<T>` | 获取第 n 个元素（会消耗前面的） |
| `max()` / `min()` | `Option<T>` | 获取最大 / 最小值 |
| `any(f)` | `bool` | 是否存在满足条件的元素（短路） |
| `all(f)` | `bool` | 是否所有元素都满足条件（短路） |
| `find(f)` | `Option<&T>` | 返回第一个满足条件的元素 |
| `position(f)` | `Option<usize>` | 返回第一个满足条件的元素的索引 |
| `collect()` | 集合 | 收集为 `Vec`、`HashSet`、`String` 等 |
| `fold(init, f)` | 任意类型 | 通用聚合，从初始值开始逐步累加 |

## sum 与 product：数值聚合

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    let total: i32 = v.iter().sum();
    println!("求和: {}", total); // 15

    let product: i32 = v.iter().product();
    println!("求积: {}", product); // 120
}
```

## count、last、nth：定位与计数

```rust runnable
fn main() {
    let v = vec![10, 20, 30, 40, 50];

    println!("元素数量: {}", v.iter().count()); // 5
    println!("最后一个: {:?}", v.iter().last()); // Some(&50)

    // nth 会消耗前面的元素
    let mut iter = v.iter();
    println!("第 2 个: {:?}", iter.nth(2));  // Some(&30)，前 3 个已被消耗
    println!("之后的下一个: {:?}", iter.next()); // Some(&40)
}
```

## max 与 min：求极值

```rust runnable
fn main() {
    let v = vec![3, 1, 4, 1, 5, 9, 2, 6];

    println!("最大值: {:?}", v.iter().max()); // Some(&9)
    println!("最小值: {:?}", v.iter().min()); // Some(&1)

    let empty: Vec<i32> = vec![];
    println!("空集合的最大值: {:?}", empty.iter().max()); // None
}
```

## any 与 all：条件判断

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    println!("有偶数: {}", v.iter().any(|x| x % 2 == 0)); // true
    println!("全部为正: {}", v.iter().all(|x| *x > 0));   // true
}
```

> `any` 和 `all` 是**短路求值**的：`any` 找到第一个满足条件的元素就停止；`all` 遇到第一个不满足的就停止。

## find 与 position：查找元素

```rust runnable
fn main() {
    let v = vec![1, 3, 5, 6, 7, 8];

    let first_even = v.iter().find(|&&x| x % 2 == 0);
    println!("第一个偶数: {:?}", first_even); // Some(&6)

    let pos = v.iter().position(|&x| x % 2 == 0);
    println!("第一个偶数的位置: {:?}", pos); // Some(3)
}
```

## collect：把迭代器变成集合

`collect` 是最常用的消费适配器之一，它把迭代器收集进一个集合。必须显式标注目标类型：

```rust runnable
fn main() {
    let v = vec![1, 2, 3];

    let doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();
    println!("{:?}", doubled); // [2, 4, 6]

    // 收集成字符串
    let parts = vec!["Rust", " ", "is", " ", "fast"];
    let sentence: String = parts.into_iter().collect();
    println!("{}", sentence); // Rust is fast
}
```

```rust runnable
use std::collections::HashSet;

fn main() {
    // 收集成 HashSet 自动去重
    let v = vec![1, 2, 2, 3, 3, 3, 4];
    let unique: HashSet<i32> = v.into_iter().collect();
    println!("去重后有 {} 个元素", unique.len()); // 4
}
```

## fold：通用聚合

`fold` 是所有聚合方法的"祖先"，`sum`/`product`/`count` 等都可以用它实现：

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    // fold(初始值, |累加器, 当前元素| 新的累加器)
    let sum  = v.iter().fold(0, |acc, x| acc + x);     // 等价于 sum()
    let prod = v.iter().fold(1, |acc, x| acc * x);     // 等价于 product()
    let max  = v.iter().fold(i32::MIN, |acc, &x| acc.max(x));

    println!("sum={} product={} max={}", sum, prod, max);

    // fold 可以构建任意结构
    let s = v.iter().fold(String::new(), |mut acc, x| {
        if !acc.is_empty() { acc.push_str(", "); }
        acc.push_str(&x.to_string());
        acc
    });
    println!("{}", s); // 1, 2, 3, 4, 5
}
```

# 迭代器适配器

迭代器适配器返回新的迭代器，不立即执行，可以无限链式调用。**必须以一个消费适配器结尾，整条链才会真正运行。**

| 方法 | 功能 |
|------|------|
| `map(f)` | 对每个元素应用闭包，产生等量的新元素 |
| `filter(f)` | 保留闭包返回 `true` 的元素 |
| `filter_map(f)` | 闭包返回 `Some` 则保留变换后的值，`None` 则丢弃 |
| `enumerate()` | 将每个元素包装为 `(index, element)` 元组 |
| `zip(other)` | 将两个迭代器逐一配对为元组，以较短的为准 |
| `take(n)` | 只取前 n 个元素 |
| `skip(n)` | 跳过前 n 个元素 |
| `take_while(f)` | 取元素直到闭包首次返回 `false` |
| `skip_while(f)` | 跳过元素直到闭包首次返回 `false` |
| `chain(other)` | 将两个迭代器首尾拼接 |
| `flat_map(f)` | 每个元素映射为一个子迭代器，然后展平一层 |
| `flatten()` | 展平嵌套迭代器（等价于不做变换的 `flat_map`） |
| `peekable()` | 包装为可窥视下一个元素而不消耗的迭代器 |
| `cloned()` / `copied()` | 将 `&T` 元素克隆 / 复制为 `T` |

## map：变换每个元素

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    let doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();
    println!("{:?}", doubled); // [2, 4, 6, 8, 10]

    let strings: Vec<String> = v.iter().map(|x| x.to_string()).collect();
    println!("{:?}", strings);
}
```

## filter：筛选元素

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5, 6];

    let evens: Vec<&i32> = v.iter().filter(|x| *x % 2 == 0).collect();
    println!("{:?}", evens); // [2, 4, 6]
}
```

`filter` 的闭包可以捕获外部变量，实现动态筛选：

```rust runnable
#[derive(Debug)]
struct Shoe { size: u32, style: String }

fn shoes_in_size(shoes: Vec<Shoe>, shoe_size: u32) -> Vec<Shoe> {
    shoes.into_iter()
        .filter(|s| s.size == shoe_size) // 捕获外部变量 shoe_size
        .collect()
}

fn main() {
    let shoes = vec![
        Shoe { size: 10, style: String::from("运动鞋") },
        Shoe { size: 13, style: String::from("凉鞋") },
        Shoe { size: 10, style: String::from("靴子") },
    ];
    println!("{:?}", shoes_in_size(shoes, 10));
}
```

## filter_map：变换 + 过滤一步到位

闭包返回 `Some(value)` 表示保留，返回 `None` 表示丢弃：

```rust runnable
fn main() {
    let strings = vec!["1", "两", "3", "四", "5"];

    let numbers: Vec<i32> = strings.iter()
        .filter_map(|s| s.parse().ok()) // 解析失败的直接丢弃
        .collect();
    println!("{:?}", numbers); // [1, 3, 5]
}
```

## enumerate：带上索引

```rust runnable
fn main() {
    let fruits = vec!["苹果", "香蕉", "橙子"];

    for (i, fruit) in fruits.iter().enumerate() {
        println!("{}: {}", i, fruit);
    }
}
```

## zip：合并两个迭代器

`zip` 把两个迭代器逐一配对，以较短的为准：

```rust runnable
fn main() {
    let names = vec!["Alice", "Bob", "Charlie"];
    let scores = vec![95, 87, 92];

    let combined: Vec<(&str, i32)> = names.into_iter().zip(scores.into_iter()).collect();
    for (name, score) in &combined {
        println!("{}: {}", name, score);
    }
}
```

```rust runnable
fn main() {
    let a = vec![1, 2, 3, 4, 5];
    let b = vec!["one", "two", "three"]; // 只有 3 个

    let zipped: Vec<_> = a.iter().zip(b.iter()).collect();
    println!("{:?}", zipped); // [(1, "one"), (2, "two"), (3, "three")]
}
```

## take、skip 及其变体

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5, 6, 7, 8];

    let first3: Vec<_> = v.iter().take(3).collect();
    println!("前 3 个: {:?}", first3); // [1, 2, 3]

    let after3: Vec<_> = v.iter().skip(3).collect();
    println!("跳过前 3: {:?}", after3); // [4, 5, 6, 7, 8]

    let less_than5: Vec<_> = v.iter().take_while(|&&x| x < 5).collect();
    println!("小于 5 的前缀: {:?}", less_than5); // [1, 2, 3, 4]

    let from5: Vec<_> = v.iter().skip_while(|&&x| x < 5).collect();
    println!("从 5 开始: {:?}", from5); // [5, 6, 7, 8]
}
```

## chain 与 flat_map：拼接与展平

```rust runnable
fn main() {
    let a = vec![1, 2, 3];
    let b = vec![4, 5, 6];

    // chain：连接两个迭代器
    let combined: Vec<_> = a.iter().chain(b.iter()).collect();
    println!("{:?}", combined); // [1, 2, 3, 4, 5, 6]

    // flat_map：变换后展平一层
    let words = vec!["hello world", "foo bar"];
    let all_words: Vec<&str> = words.iter()
        .flat_map(|s| s.split_whitespace())
        .collect();
    println!("{:?}", all_words); // ["hello", "world", "foo", "bar"]
}
```

## 综合示例：链式流水线

```rust runnable
fn main() {
    let sentences = vec![
        "rust is fast",
        "rust is safe",
        "go is fast",
    ];

    // 找出所有包含 "rust" 的句子中的单词，去重后按字母排序
    let mut words: Vec<&str> = sentences.iter()
        .filter(|s| s.contains("rust"))
        .flat_map(|s| s.split_whitespace())
        .collect();

    words.sort();
    words.dedup(); // 去重（要求已排序）
    println!("{:?}", words); // ["fast", "is", "rust", "safe"]
}
```

# 练习题

## 两类适配器辨别

```quiz multi
Q: 下列哪些方法是迭代器适配器（惰性，返回新迭代器）？
+ zip()
+ take()
- collect()
+ enumerate()
+ map()
- sum()
+ filter()
- find()
E: sum()、collect()、find() 是消费适配器——调用后迭代器被消耗，返回最终结果。map、filter、zip、enumerate、take 都是迭代器适配器——返回新迭代器，不立即执行，必须被消费才会运行。
```

```rust
let v = vec![1, 2, 3];
v.iter().map(|x| x * 2);
```

```quiz single
Q: 上面代码会产生什么结果？
- 编译错误
- [2, 4, 6]
+ 什么都不做，编译器会发出警告
- 打印 2 4 6
E: 迭代器适配器是惰性的。没有消费适配器（collect、sum 等）驱动，整条链不会运行。Rust 编译器对此发出 "unused Map" 警告，但不报错。
```

## 消费适配器测验

```quiz single
Q: 调用 sum() 之后，原来的迭代器还能使用吗？
- 取决于迭代器的类型
- 能，sum() 只是读取了值，不影响迭代器
+ 不能，sum() 获取了迭代器的所有权并消耗它
- 能，但迭代器会被重置到开头
E: 消费适配器获取迭代器的所有权并消耗掉它。调用 sum() 之后，迭代器变量不再有效，再次使用会报编译错误 "use of moved value"。
```

```rust
let v = vec![1, 3, 5, 6, 7];
let result = v.iter().find(|&&x| x % 2 == 0);
```

```quiz single
Q: result 的值是什么？
- None
- Some(6)
- Some(&5)
+ Some(&6)
E: find() 返回第一个满足条件的元素的引用。v.iter() 产生 &i32，所以 find 返回 Option<&&i32>，即 Some(&6)（指向 v 中的 6）。
```

```quiz single
Q: fold(0, |acc, x| acc + x) 等价于哪个消费适配器？
- product()
+ sum()
- count()
- max()
E: fold 以 0 为初始值，每步将累加器加上当前元素，这正是求和的定义，等价于 sum()。fold(1, |acc, x| acc * x) 等价于 product()。
```

## 迭代器适配器测验

```quiz single
Q: filter 的闭包应该返回什么类型？
- Option<T>
- T
- Result<T, E>
+ bool
E: filter 的闭包返回 bool：true 保留，false 丢弃。filter_map 的闭包返回 Option<T>，可以同时做筛选和变换。
```

```rust
let a = vec![1, 2, 3];
let b = vec!["a", "b"];
let result: Vec<_> = a.iter().zip(b.iter()).collect();
```

```quiz single
Q: result 的长度是多少？
- 3
+ 2
- 5
- 6
E: zip 以两个迭代器中较短的为准。a 有 3 个元素，b 有 2 个，zip 产生 2 对后停止，a 的第 3 个元素被丢弃。
```

## 编程练习

给定一段逗号分隔的分数字符串，解析为数字，过滤掉 60 分以下的，对合格分数乘以 1.1（取整），最后求加权后的平均分（保留一位小数）。

```rust editable
fn main() {
    let input = "45,72,88,55,91,63,38,76";

    // TODO:
    // 1. 用 split(',') 分割字符串
    // 2. 用 filter_map 解析为 u32（解析失败的跳过）
    // 3. 过滤掉 < 60 的
    // 4. 每个乘以 1.1 后取整（(x as f64 * 1.1) as u32）
    // 5. 收集为 Vec<u32>，然后计算平均分
    let adjusted: Vec<u32> = todo!();

    let avg = adjusted.iter().sum::<u32>() as f64 / adjusted.len() as f64;
    println!("加权分: {:?}", adjusted);
    println!("平均分: {:.1}", avg);
}
```

```expected
加权分: [79, 96, 100, 69, 83]
平均分: 85.4
```
