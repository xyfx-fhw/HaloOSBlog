---
title: "Vec<T>——动态数组"
description: "掌握 Rust 向量的创建、初始化、元素访问与修改，理解向量中的所有权规则，学会安全高效地使用动态集合。"
difficulty: beginner
estimatedTime: 50
keywords: ["向量", "Vec", "动态数组", "所有权", "借用", "迭代"]
---

# 什么是向量（Vector）

**向量**（Vector）是 Rust 标准库中最常用的**动态数组**类型，记作 `Vec<T>`。

"动态"是什么意思呢？对比你前面学过的**数组**（`[T; n]`），数组的长度在编译时就确定了，是**固定的**：

```rust runnable
fn main() {
    // 数组：长度固定为 5
    let arr: [i32; 5] = [1, 2, 3, 4, 5];
    println!("数组长度：{}", arr.len());

    // 向量：长度可以动态增加或减少
    let mut vec: Vec<i32> = vec![1, 2, 3, 4, 5];
    println!("向量初始长度：{}", vec.len());

    vec.push(6);  // 可以添加新元素
    println!("向量现在的长度：{}", vec.len());
}
```

## 为什么需要向量

想象这个场景：你写一个程序来读取用户输入。用户不一定输入多少行，可能是 1 行，也可能是 100 行。如果用数组，你需要**提前声明大小**（`[String; 100]`），这样既浪费空间（如果只有 10 行输入），又不够灵活（如果有 101 行就溢出了）。

向量解决了这个问题：**可以根据需要动态增长**，无需提前知道确切大小。

```rust runnable
fn main() {
    let mut lines = Vec::new();

    // 模拟用户输入三行数据
    lines.push(String::from("第一行"));
    lines.push(String::from("第二行"));
    lines.push(String::from("第三行"));

    println!("收到 {} 行数据", lines.len());

    for line in &lines {
        println!("  {}", line);
    }
}
```

# 使用向量

## 创建和初始化向量

### 使用 `Vec::new()`

最直接的方式是调用 `Vec::new()`：

```rust runnable
fn main() {
    let mut v: Vec<i32> = Vec::new();

    v.push(1);
    v.push(2);
    v.push(3);

    println!("向量：{:?}", v);
}
```

注意这里需要**显式标注类型** `Vec<i32>`。为什么？因为向量是空的，编译器无法推断元素类型。

### 使用 `vec!` 宏

更简洁的方式是使用 `vec!` 宏。它可以在创建时直接填充数据，而且**编译器能自动推断类型**：

```rust runnable
fn main() {
    // 创建并初始化
    let v = vec![1, 2, 3];
    println!("向量：{:?}", v);

    // 也可以用重复语法
    let v2 = vec![0; 5];  // 五个 0
    println!("重复向量：{:?}", v2);
}
```

这两个写法是等价的：

```rust runnable
fn main() {
    // 这两种方式结果相同
    let v1 = vec![0, 0, 0, 0, 0];
    let v2 = vec![0; 5];

    println!("v1: {:?}", v1);
    println!("v2: {:?}", v2);
}
```

> **小技巧**：如果你需要创建一个特定容量的空向量（为了减少重新分配次数），可以用 `Vec::with_capacity(n)`。这个技巧对性能敏感的代码有帮助。

## 访问向量中的元素

### 使用索引

向量支持基于索引的访问，就像数组一样：

```rust runnable
fn main() {
    let v = vec![10, 20, 30, 40];

    println!("第一个元素：{}", v[0]);
    println!("第三个元素：{}", v[2]);
}
```

### 越界会 panic（恐慌）

如果你访问的索引超出范围，程序会**崩溃**（panic）：

```rust runnable
fn main() {
    let v = vec![10, 20, 30];

    // 这会导致 panic！
    println!("{}", v[5]);
}
```

这在交互式代码中会直接失败。Rust 的设计理念是：**非法的操作应该当即失败**，而不是允许未定义行为。

### 使用 `get()` 方法安全地访问

如果你不确定索引是否有效，使用 `get()` 方法返回 `Option`：

```rust runnable
fn main() {
    let v = vec![10, 20, 30];

    match v.get(0) {
        Some(value) => println!("第一个元素：{}", value),
        None => println!("向量为空"),
    }

    match v.get(10) {
        Some(value) => println!("第 11 个元素：{}", value),
        None => println!("索引 10 超出范围"),
    }
}
```

`get()` 返回 `Option<&T>`，你可以安全地处理"找不到"的情况。

### 关键区别：`[]` vs `get()`

- **`v[i]`**：如果超出范围，**panic**。用于已确认索引合法的地方。
- **`v.get(i)`**：返回 `Option`。用于索引可能不合法的地方。

```rust runnable
fn main() {
    let v = vec![10, 20, 30];

    // 场景 1：你知道索引肯定存在
    println!("第一个：{}", v[0]);  // ✓ 直接用 [] 没关系

    // 场景 2：索引来自外部输入，可能无效
    let user_input = "5";
    if let Ok(index) = user_input.parse::<usize>() {
        match v.get(index) {
            Some(val) => println!("找到：{}", val),
            None => println!("用户输入的索引超出范围"),
        }
    }
}
```

## 修改向量

### 添加元素：`push()`

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3];

    v.push(4);
    v.push(5);

    println!("向量：{:?}", v);
}
```

### 删除元素：`pop()`

`pop()` 移除并返回最后一个元素，返回 `Option`：

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3];

    match v.pop() {
        Some(value) => println!("弹出：{}", value),
        None => println!("向量为空"),
    }

    println!("剩余：{:?}", v);
}
```

### 删除指定位置：`remove()`

`remove(index)` 删除指定索引的元素，并返回该元素。**注意**：这个操作时间复杂度是 O(n)，因为后面的所有元素都要向前移动：

```rust runnable
fn main() {
    let mut v = vec!["a", "b", "c", "d"];

    let removed = v.remove(1);  // 删除索引 1 的元素
    println!("删除的元素：{}", removed);
    println!("剩余：{:?}", v);
}
```

### 修改元素

向量是可变的时候，可以直接修改元素：

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3];

    v[0] = 10;  // 直接修改第一个元素

    println!("修改后：{:?}", v);
}
```

或者用迭代获取可变引用：

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3];

    for elem in &mut v {
        *elem *= 2;  // 将每个元素乘以 2
    }

    println!("翻倍后：{:?}", v);
}
```

## 遍历向量

### 不可变遍历

最常见的遍历方式是用 `for` 循环和不可变借用 `&v`：

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5];

    for num in &v {
        println!("数字：{}", num);
    }

    // 遍历后仍然可以使用 v
    println!("向量长度：{}", v.len());
}
```

如果直接 `for num in v`（不用 `&`），会**转移所有权**，之后就无法再使用 `v` 了。

### 可变遍历

要修改遍历过程中的元素，使用 `&mut v`：

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3, 4];

    for num in &mut v {
        *num += 10;  // 指针解引用后修改
    }

    println!("修改后：{:?}", v);
}
```

### 转移所有权的遍历

如果向量包含**非复制类型**（如 `String`），直接 `for elem in v` 会转移所有权，元素无法再用：

```rust runnable
fn main() {
    let v = vec![
        String::from("hello"),
        String::from("world"),
    ];

    for s in v {
        // s 拥有这个字符串的所有权
        println!("{}", s);
        // s 在这里被销毁
    }

    // v 现在已经被清空了（所有权转移完成）
    // println!("{:?}", v);  // ✗ 错误！v 已经被消耗
}
```

对比一下用不可变借用的方式，它不会消耗原向量：

```rust runnable
fn main() {
    let v = vec![
        String::from("hello"),
        String::from("world"),
    ];

    for s in &v {
        // s 是一个引用 &String
        println!("{}", s);
    }

    // v 仍然可用！
    println!("向量长度：{}", v.len());
}
```

# 向量中的所有权规则

这是一个容易出错的地方。向量的所有权规则和普通变量一样，但因为向量可以包含多个元素，情况会更复杂。

## 规则 1：向量拥有其元素的所有权

```rust runnable
fn main() {
    let s = String::from("hello");
    let mut v = vec![s];

    // s 的所有权已经转移到 v
    // println!("{}", s);  // ✗ 错误！s 已经没有所有权了

    println!("向量中的字符串：{:?}", v[0]);
}
```

向量被销毁时，它会自动销毁其中的所有元素。

## 规则 2：不能在遍历时修改向量的大小

一个常见的错误是：**在迭代过程中修改向量的结构**（添加/删除元素）。

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3];

    // 这样做是错误的：
    // for elem in &v {
    //     v.push(*elem);  // ✗ 错误！不能在迭代时修改 v
    // }
}
```

为什么不行？因为迭代器一开始就记录了要遍历的元素，如果中途改变向量的大小，迭代器可能会访问无效的内存。

> **如果需要修改向量的大小**：先遍历并收集信息（比如要删除的索引），然后遍历完成后再修改向量。或者使用 `retain()` 方法：`v.retain(|&x| x % 2 == 1)` 保留满足条件的元素。

## 规则 3：不能同时持有可变和不可变引用

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3];

    let first = &v[0];  // 不可变借用

    v.push(4);  // ✗ 错误！不能获得可变借用，因为还有不可变借用存在

    println!("{}", first);
}
```

这个规则确保了内存安全。如果允许在持有引用时修改向量，那个引用可能变成悬垂指针。

# 向量中的多种类型

向量的类型参数 `T` 必须是单一类型。如果你要存储**多种不同类型**的数据，可以用**枚举**：

```rust runnable
enum Value {
    Integer(i32),
    Text(String),
    Boolean(bool),
}

fn main() {
    let v = vec![
        Value::Integer(42),
        Value::Text(String::from("hello")),
        Value::Boolean(true),
    ];

    for val in &v {
        match val {
            Value::Integer(i) => println!("整数：{}", i),
            Value::Text(s) => println!("文本：{}", s),
            Value::Boolean(b) => println!("布尔值：{}", b),
        }
    }
}
```

另一个选择是用 **trait 对象**（后续章节会学到），这里先不展开。

# 常见操作速览

向量还有很多好用的方法。这里列出最常用的几个：

```rust runnable
fn main() {
    let mut v = vec![3, 1, 4, 1, 5, 9, 2, 6];

    // 获取长度
    println!("长度：{}", v.len());

    // 检查是否为空
    println!("为空吗？{}", v.is_empty());

    // 清空（删除所有元素）
    let mut v2 = v.clone();
    v2.clear();
    println!("清空后的长度：{}", v2.len());

    // 检查是否包含某个元素（用 contains）
    println!("包含 4 吗？{}", v.contains(&4));

    // 获取第一个和最后一个元素
    println!("第一个：{:?}", v.first());
    println!("最后一个：{:?}", v.last());

    // 反转
    let mut v3 = v.clone();
    v3.reverse();
    println!("反转后：{:?}", v3);
}
```

# 练习题

```quiz single
Q: 下面哪种方式创建一个空向量的类型标注是正确的？
- let v = Vec::new();
- let v = Vec;
- let v = vec![];
+ let v: Vec<i32> = Vec::new();
E: 创建空向量时，编译器无法推断元素类型，必须显式标注，如 Vec<i32>。如果使用 vec![] 也必须标注类型。
```

```quiz single
Q: 以下代码会发生什么？（let v = vec![1, 2, 3]; println!("{}", v[10]);）
- 打印 0
- 打印 None
+ 程序 panic（崩溃）
- 编译错误
E: 使用索引 [] 访问超出范围的元素会导致 panic。如果想安全地处理可能超出范围的索引，应该使用 get() 方法。
```

```quiz multi
Q: 下列关于 vec![1, 2, 3] 和数组 [1, 2, 3] 的说法，正确的是？（多选）
- 向量和数组使用的内存管理方式完全相同
+ 向量的长度可以在运行时改变
+ 向量数据存储在堆上，数组通常存储在栈上
+ 向量可以动态增长，数组大小固定
E: 向量的核心特点是动态大小。它在堆上分配内存，允许运行时增长或缩小，而数组是固定大小的编译时确定的类型。
```

```quiz single
Q: 以下代码中，哪行代码会导致编译错误？（let mut v = vec![1, 2, 3]; let first = &v[0]; v.push(4); println!("{}", first);）
+ 第 3 行（v.push(4)）
- 第 3 行
- 第 2 行
- 第 4 行
E: 第 2 行创建了不可变借用 first。第 3 行试图获得可变借用来修改向量，这违反了"不能同时持有可变和不可变引用"的规则，所以会编译错误。
```

```quiz multi
Q: 在向量中遍历元素时，关于所有权和借用，下列说法正确的是？（多选）
+ for elem in &mut v 允许在遍历时修改元素
+ for elem in v 会消耗 v 的所有权，遍历后 v 不可用
+ for elem in &v 不会消耗 v 的所有权，遍历后 v 仍可用
- 三种遍历方式在遍历中都可以修改向量的大小
E: 使用 &v 进行不可变遍历不消耗所有权；使用 &mut v 允许修改元素；直接使用 v 消耗所有权。但都不能在遍历中改变向量的大小，那会使迭代器失效。
```

```quiz single
Q: 如果想在向量中存储不同类型的数据（比如整数、字符串和布尔值），最简单的方法是什么？
- Rust 不支持向量存储多种类型
- 创建多个向量，每个存储一种类型
- 使用 trait 对象（后续章节会学到）
+ 定义一个包含不同成员的枚举，然后向量存储该枚举
E: 向量的类型参数 T 必须是单一类型。要存储多种类型，可以定义枚举并存储枚举值，或者使用 trait 对象。枚举是更直接的方式。
```

## 编程练习

### 练习 1：创建和初始化向量

创建三个向量：
1. 使用 `Vec::new()` 和 `push()` 添加数字 10、20、30
2. 使用 `vec!` 宏直接创建包含 `"red"`、`"green"`、`"blue"` 的向量
3. 使用 `vec![0; 5]` 创建五个零

然后打印这三个向量的长度和内容：

```rust editable
fn main() {
    // TODO: 创建第一个向量（通过 Vec::new 和 push）


    // TODO: 创建第二个向量（颜色）


    // TODO: 创建第三个向量（五个零）


    // TODO: 打印三个向量的长度和内容
    println!("第一个向量长度：{}，内容：{:?}", v1.len(), v1);
    println!("第二个向量长度：{}，内容：{:?}", v2.len(), v2);
    println!("第三个向量长度：{}，内容：{:?}", v3.len(), v3);
}
```

```expected
第一个向量长度：3，内容：[10, 20, 30]
第二个向量长度：3，内容：["red", "green", "blue"]
第三个向量长度：5，内容：[0, 0, 0, 0, 0]
```

### 练习 2：向量操作综合

完成下面的函数，实现对向量的各种操作：

```rust editable
fn print_vector_info(v: &Vec<i32>) {
    // 打印向量的长度
    println!("长度：{}", );

    // 打印是否为空
    println!("为空吗？{}", );

    // 打印第一个元素（用 first）
    println!("第一个元素：{:?}", );

    // 打印最后一个元素（用 last）
    println!("最后一个元素：{:?}", );

    // 打印所有元素
    println!("所有元素：{:?}", );
}

fn sum_vector(v: &Vec<i32>) -> i32 {
    // 计算向量所有元素的和（用 for 循环）

}

fn main() {
    let v = vec![1, 2, 3, 4, 5, 6];

    print_vector_info(&v);

    println!("总和：{}", sum_vector(&v));
}
```

```expected
长度：6
为空吗？false
第一个元素：Some(1)
最后一个元素：Some(6)
所有元素：[1, 2, 3, 4, 5, 6]
总和：21
```
