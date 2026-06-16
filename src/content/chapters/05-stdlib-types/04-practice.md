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
fn deduplicate(vec: Vec<i32>) -> Vec<i32> {
    // TODO: 创建结果向量，遍历原向量去重
    Vec::new()
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

## 练习 2：单词频率统计

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
- 用 `split_whitespace()` 方法分割单词
- 使用 HashMap 存储单词计数
- 使用 `entry().and_modify().or_insert()` 更新计数
- 找出最大值

```rust editable
use std::collections::HashMap;

fn most_frequent_word(text: &str) -> String {
    // TODO: 统计单词频率，返回频率最高的单词
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
