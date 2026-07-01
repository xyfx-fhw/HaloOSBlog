---
title: "切片"
description: "学习 Rust 切片类型，理解字符串切片与数组切片的语法，以及切片如何结合借用规则防止 bug。"
difficulty: intermediate
estimatedTime: 35
keywords: ["切片", "slice", "&str", "&[T]", "字符串切片", "数组切片", "range"]
---

# 字符串切片

**切片**（slice）是对集合中一段**连续元素序列**的引用，它不拥有所有权。切片用一种让编译器帮你检查边界安全性的方式，取代了手动管理索引。

<img src="/RustCourse/diagrams/slice_string.svg" alt="切片的原理" style="max-width:100%;margin:1rem 0;" />

## 问题引入：返回索引有什么不好

假设我们要写一个函数，找出字符串中第一个单词的结束位置。不用切片时，最直接的想法是返回一个索引：

```rust runnable
fn first_word(s: &String) -> usize {
    let bytes = s.as_bytes(); // 把字符串转成字节数组

    // 逐字节遍历，找到第一个空格
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' { // b' ' 是空格字节的字面量
            return i;
        }
    }

    s.len() // 没有空格，整个字符串就是一个单词
}

fn main() {
    let s = String::from("hello world");
    let word_end = first_word(&s);
    println!("第一个单词结束于索引 {}", word_end); // 5
}
```

这能工作，但有一个隐患——`word_end` 只是一个普通的 `usize` 整数，它和字符串 `s` 完全没有绑定关系：

```rust runnable
fn first_word(s: &String) -> usize {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' { return i; }
    }
    s.len()
}

fn main() {
    let mut s = String::from("hello world");
    let word_end = first_word(&s); // 返回 5

    s.clear(); // 把字符串清空了！

    // word_end 仍然是 5，但 s 已经空了
    // 用 word_end 去切分 s 会得到错误结果，但编译器不知道
    println!("word_end = {}", word_end); // 程序不报错，但这是 bug！
}
```

索引 `5` 变成了无效的信息——它描述的那个字符串已经不存在了，而编译器对此一无所知。如果再写一个 `second_word` 返回 `(usize, usize)`，情况会更难维护。

**切片解决的正是这个问题：让引用和数据永远绑定在一起。**

## 字符串切片语法

字符串切片（string slice）是对 `String` 中一段内容的引用，类型写作 `&str`：

```rust runnable
fn main() {
    let s = String::from("hello world");

    let hello = &s[0..5];   // 索引 0 到 4（不含 5）
    let world = &s[6..11];  // 索引 6 到 10（不含 11）

    println!("{} {}", hello, world);
}
```

语法是 `&s[start..end]`，其中：
- `start` 是切片的**起始索引**（包含）
- `end` 是切片的**结束索引**（不含，即"开区间"）

> 索引是按**字节**计算的，不是按字符。对于全 ASCII 的字符串没有问题；如果字符串包含中文等多字节字符，必须在字符边界处切分，否则程序会 panic。

## Range 的各种简写

Rust 的 `..` 语法有几种简写形式：

```rust runnable
fn main() {
    let s = String::from("hello");

    // 从头开始，可以省略起始索引
    let s1 = &s[0..3]; // "hel"
    let s2 = &s[..3];  // 等同于上面

    // 到末尾结束，可以省略结束索引
    let s3 = &s[2..s.len()]; // "llo"
    let s4 = &s[2..];        // 等同于上面

    // 整个字符串
    let s5 = &s[0..s.len()]; // "hello"
    let s6 = &s[..];         // 等同于上面

    println!("{} {} {} {} {} {}", s1, s2, s3, s4, s5, s6);
}
```

## 用切片重写 first_word

返回 `&str` 而不是 `usize`，让切片与原始字符串绑定在一起：

```rust runnable
fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i]; // 返回切片，而不是索引
        }
    }

    &s[..] // 没有空格，返回整个字符串的切片
}

fn main() {
    let s = String::from("hello world");
    let word = first_word(&s);
    println!("第一个单词是：{}", word); // "hello"
}
```

现在如果我们尝试在切片还存活时清空字符串，借用检查器会直接报错：

```rust runnable expect-error
fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' { return &s[0..i]; }
    }
    &s[..]
}

fn main() {
    let mut s = String::from("hello world");
    let word = first_word(&s); // word 是对 s 的不可变引用

    s.clear(); // 错误！clear() 需要可变引用，但 word 还持有不可变引用

    println!("{}", word);
}
```

同样的 bug，现在在编译期就被发现了，而不是在运行时悄悄出错。这正是切片的核心价值：**把"数据从哪里来"的信息编码进类型，让编译器帮你检查。**

## 字符串字面量就是切片

我们一直在用的字符串字面量，它的类型其实就是 `&str`：

```rust runnable
fn main() {
    let s: &str = "hello, world!"; // &str 类型
    println!("{}", s);
}
```

`"hello, world!"` 是程序二进制文件中只读区域的一段数据，`s` 是指向它的切片引用。这就是为什么字符串字面量永远是不可变的——它是对只读数据的不可变引用。

# &str vs &String

写函数时，参数应该用 `&String` 还是 `&str`？这是一个非常实用但容易搞混的问题：

## 问题背景：为什么会纠结

假设你要写一个函数来找出字符串中第一个单词。新手可能会这样写：

```rust
fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' { return &s[0..i]; }
    }
    &s[..]
}

fn main() {
    let owned = String::from("hello world");
    let w1 = first_word(&owned);           // ✓ 可以

    let w2 = first_word("hello world");    // ✗ 错误！参数是 &str，不是 &String
}
```

你会发现，用 `&String` 作参数后，**无法直接传入字符串字面量**。这很不方便。

## 解决方案：用 &str 代替 &String

如果函数只需要**读取**字符串内容（不需要转移所有权），应该用 `&str` 而不是 `&String`：

```rust runnable
fn first_word(s: &str) -> &str {  // 改为 &str
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' { return &s[0..i]; }
    }
    &s[..]
}

fn main() {
    let owned = String::from("hello world");

    // 传 &String：自动转换为 &str（解引用强制转换）
    let w1 = first_word(&owned);

    // 传 &str 切片
    let w2 = first_word(&owned[..]);

    // 传字符串字面量（字面量本身就是 &str）
    let w3 = first_word("hello world");

    println!("{} {} {}", w1, w2, w3);
}
```

现在**三种调用方式都工作了**！

## 原理：解引用强制转换

为什么 `&String` 可以自动转换为 `&str`？这叫**解引用强制转换**（deref coercion）。

- `&String` 的本质是"指向 String 数据的引用"
- `&str` 的本质是"对字符串数据某一段的切片引用"
- Rust 编译器足够聪明，知道当你传 `&String` 给期望 `&str` 的函数时，可以自动将其转换为"整个字符串的 `&str` 切片"

## 最佳实践

**规则很简单**：

| 函数需要... | 参数类型 | 原因 |
|-----------|---------|------|
| 只读字符串 | `&str` | 可以接受 `&String`、字面量、切片，最灵活 |
| 可能修改字符串 | `&mut String` | 需要可变访问权限，只能传 `&mut String` |
| 拥有字符串 | `String` | 需要完全所有权，会转移所有权 |

**类比其他切片**：数组切片也遵循同样逻辑——函数参数用 `&[T]` 比 `&Vec<T>` 更通用，因为 `&[T]` 可以接受任何数组或 `Vec` 的切片。



# 数组与其他切片

字符串切片只是切片的一种特殊形式。Rust 的切片机制适用于任何数组和序列类型。

## 数组切片语法

对数组取切片，就像对字符串取切片一样：

```rust runnable
fn main() {
    let a = [1, 2, 3, 4, 5];

    let slice = &a[1..3]; // 取索引 1 到 2 的元素
    println!("{:?}", slice); // [2, 3]

    // 省略写法同样适用
    let first_three = &a[..3]; // [1, 2, 3]
    let last_two = &a[3..];    // [4, 5]
    let all = &a[..];          // [1, 2, 3, 4, 5]

    println!("{:?} {:?} {:?}", first_three, last_two, all);
}
```

数组切片的类型是 `&[T]`，其中 `T` 是数组元素的类型。比如 `[i32; 5]` 的切片类型是 `&[i32]`，`[bool; 3]` 的切片类型是 `&[bool]`。

## 切片的内部结构

<img src="/RustCourse/diagrams/slice.svg" alt="切片的原理" style="max-width:100%;margin:1rem 0;" />

字符串切片和数组切片在内部结构上是一样的：存储**指向序列起始位置的指针**和**切片的长度**。切片本身存在栈上（两个 `usize` 大小），真正的数据仍然在原始集合里。

```rust runnable
fn main() {
    let a = [10, 20, 30, 40, 50];
    let slice = &a[1..4]; // 指向 a[1]，长度为 3

    println!("切片内容：{:?}", slice);
    println!("切片长度：{}", slice.len()); // 3
}
```

这也意味着切片不复制数据，只是创建了一个"窗口"，从已有数据中截取一段来观察。

## 函数中使用数组切片

把 `&[T]` 作为函数参数，是 Rust 中处理序列数据的惯用方式。函数可以接受数组的任意一段，而不需要知道数组的具体大小：

```rust runnable
fn sum(numbers: &[i32]) -> i32 {
    let mut total = 0;
    for n in numbers {
        total += n;
    }
    total
}

fn main() {
    let arr = [1, 2, 3, 4, 5];

    println!("全部之和：{}", sum(&arr));        // 15
    println!("前三项之和：{}", sum(&arr[..3])); // 6
    println!("后两项之和：{}", sum(&arr[3..])); // 9
}
```

> 这个 `sum` 函数接受 `&[i32]`，因此同一个函数既可以接受完整数组的引用，也可以接受任意长度的子切片——灵活又安全。

## 切片与所有权

切片不拥有数据，它是对原始集合的**借用**。

### 不可变切片

```rust runnable expect-error
fn main() {
    let mut v = [1, 2, 3, 4, 5];
    let s = &v[1..3]; // 不可变切片

    v[0] = 99; // 错误！v 被不可变借用中

    println!("{:?}", s);
}
```

### 可变切片

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3, 4, 5];
    let s = &mut v[1..3]; // 可变切片

    s[0] = 20;  // ✓ 可以修改
    println!("{:?}", v);
}
```

切片遵循和引用完全相同的借用规则——不可变切片可以多个共存，可变切片同一时间只能有一个，两者不能同时存在。

# 练习题

## 字符串切片测验

```quiz single
Q: 字符串切片 &str 和对整个字符串的引用 &String 最本质的区别是什么？
- &str 存在堆上，&String 存在栈上
- 没有区别，两者可以完全互换
- &str 拥有数据，&String 只是借用
+ &str 可以指向字符串的任意一段，而 &String 必须指向整个 String
E: &str 是对字符串数据中某一段连续区域的引用（切片），可以只引用一部分；&String 是对整个 String 对象的引用，指向那个 String 的全部内容。字符串字面量就是 &str 类型，指向二进制中某段只读数据。
```

```rust
fn main() {
    let s = String::from("hello world");
    let hello = &s[..5];
    let world = &s[6..];
    println!("{} {}", hello, world);
}
```

```quiz single
Q: 上面代码中，hello 和 world 分别是什么内容？
- hello 是 "hello "（含空格），world 是 "world"
- 编译错误，切片语法不正确
+ hello 是 "hello"，world 是 "world"
- hello 是 "hello"，world 是 " world"（含空格）
E: &s[..5] 取索引 0 到 4 共 5 个字节，即 "hello"；&s[6..] 从索引 6 取到末尾，即 "world"。索引 5 是空格字符，被跳过了。
```

```quiz single
Q: 下列关于字符串字面量的说法，正确的是？
- 字符串字面量和 &str 是完全不同的两种类型
+ 字符串字面量的类型是 &str，是指向程序只读区域的切片
- 字符串字面量可以被修改，因为它在程序运行期间始终存在
- 字符串字面量的类型是 String，存储在堆上
E: 字符串字面量如 "hello" 被编译进程序的只读数据区，其类型是 &str——对该区域数据的切片引用。这就是字符串字面量不可变的根本原因：它是对只读内存的不可变引用。
```

```rust
fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' { return &s[0..i]; }
    }
    &s[..]
}

fn main() {
    let mut s = String::from("hello world");
    let word = first_word(&s);
    s.clear();
    println!("{}", word);
}
```

```quiz single
Q: 上面代码能编译通过吗？
- 能，因为 word 是 &str 类型，已经把内容复制出来了
+ 不能，word 持有对 s 的不可变引用，s.clear() 需要可变引用，两者冲突
- 能，clear() 只是清空字符串，不影响已创建的切片
- 不能，因为 first_word 的参数类型应该是 &str 而不是 &String
E: word 是对 s 的不可变借用（一个 &str 切片）。s.clear() 需要可变借用 s。在 word 还有效（之后的 println! 还用到它）时，不能同时对 s 进行可变借用。这正是切片比返回索引更安全的原因——编译器会捕获这个 bug。
```

## 数组切片测验

```rust
fn main() {
    let a = [10, 20, 30, 40, 50];
    let s = &a[1..4];
    println!("{}", s.len());
}
```

```quiz single
Q: 上面代码输出什么？
- 5
- 4
- 编译错误
+ 3
E: &a[1..4] 取索引 1、2、3 共三个元素（不含索引 4），所以切片长度是 3。range 语法 [start..end] 中 end 是不包含的。
```

```quiz multi
Q: 下列哪些关于切片的说法是正确的？（多选）
+ 切片存储的是指向数据起始位置的指针和切片的长度
+ &[i32] 是 i32 数组切片的类型
- 切片会在内部复制数据，所以修改原数组不会影响切片
+ 切片不拥有它引用的数据，是一种借用
- 字符串切片 &str 和数组切片 &[T] 是完全不同的机制，没有共同之处
E: 切片不复制数据，只是存储一个（指针，长度）对，作为对原始数据某段的引用。&str 是字符串字节的切片，&[T] 是任意类型 T 的切片，两者在内部结构上完全一致。正因为切片不拥有数据，原数组被修改时，已有切片的借用规则会阻止潜在的冲突。
```

## 编程练习

下面的函数返回第一个单词结束位置的**索引**，请将其改写为返回**字符串切片**（`&str`）：

```rust editable
fn first_word(s: &str) -> usize {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return i;
        }
    }
    s.len()
}

fn main() {
    let s = String::from("hello world");
    let word = first_word(&s);
    println!("{}", word);
}
```

```expected
hello
```

---

下面的代码有借用冲突错误。找出问题并修复：

```rust editable expect-error
fn double_first(arr: &mut [i32]) {
    arr[0] *= 2;
}

fn main() {
    let mut v = vec![1, 2, 3];
    let first = &v[0];           // 创建不可变切片
    
    double_first(&mut v[..]);    // 错误！试图创建可变引用
    
    println!("first: {}, v[0]: {}", first, v[0]);
}
```

**问题分析**：

1. **为什么会报错**？ `first` 是什么类型的引用？ `double_first` 的参数需要什么类型的引用？

2. **如何修复**？有几种修复方式，请思考至少两种。

3. **借用规则**：这体现了之前学过的什么规则？（不可变引用与可变引用不能同时活跃）
