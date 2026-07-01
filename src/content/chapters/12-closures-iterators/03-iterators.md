---
title: "迭代器基础"
description: "理解 Rust 迭代器的惰性求值机制、Iterator trait 与 next 方法，并学会实现自定义迭代器"
difficulty: intermediate
estimatedTime: 45
keywords: ["迭代器", "Iterator", "next", "iter", "into_iter", "惰性求值", "自定义迭代器"]
---

# 迭代器是什么

迭代器（iterator）是一种**按需逐个产生值**的机制。你可以把它想象成一条传送带：上面放着待处理的货物，但传送带只有在你喊"下一个"时才会动一格——这就是 Rust 迭代器的核心特征：**惰性求值**（lazy evaluation）。

## 惰性求值：不问不动

创建迭代器本身**不会做任何计算**：

```rust runnable
fn main() {
    let v1 = vec![1, 2, 3];
    let v1_iter = v1.iter(); // 只是创建了迭代器，什么都没发生

    // 只有用到时才真正执行
    for val in v1_iter {
        println!("Got: {}", val);
    }
}
```

这和 Python 的 `range` 类似——`range(1_000_000)` 不会立刻创建百万个数，只是记录了"从 0 数到 999999"的指令，Rust 迭代器也是同样的道理。

## iter、into_iter、iter_mut 的区别

同一个集合可以用三种方式创建迭代器，区别在于**所有权和可变性**：

| 方法 | 产生值的类型 | 原集合之后 |
|------|------------|-----------|
| `iter()` | `&T`（不可变引用） | 仍可使用 |
| `into_iter()` | `T`（拥有所有权） | 被消耗，不可再用 |
| `iter_mut()` | `&mut T`（可变引用） | 仍可使用（但期间独占） |

```rust runnable
fn main() {
    let v = vec![String::from("hello"), String::from("world")];

    // iter()：借用，不消耗 v
    for s in v.iter() {
        print!("{} ", s); // s 是 &String
    }
    println!();
    println!("v 仍然有效: {:?}", v); // v 可以继续用
}
```

```rust runnable
fn main() {
    let mut v = vec![1, 2, 3];

    // iter_mut()：可变借用，可以修改元素
    for x in v.iter_mut() {
        *x *= 2; // 解引用后修改
    }
    println!("{:?}", v); // [2, 4, 6]
}
```

```rust runnable expect-error
fn main() {
    let v = vec![String::from("hello"), String::from("world")];

    // into_iter()：转移所有权，v 之后不可再用
    for s in v.into_iter() {
        println!("{}", s);
    }

    println!("{:?}", v); // 错误！v 已被消耗
}
```

> **经验法则**：只需读取用 `iter()`；需要修改用 `iter_mut()`；需要把元素所有权传出去用 `into_iter()`。

## Iterator Trait 与 next

### Iterator trait 的定义

所有迭代器都实现了标准库中的 `Iterator` trait，它的核心长这样：

```rust
pub trait Iterator {
    type Item; // 这个迭代器产生什么类型的值

    fn next(&mut self) -> Option<Self::Item>; // 唯一必须实现的方法

    // 以下数十个方法都有默认实现，只要实现了 next 就全部免费获得
    // fn map(...) { ... }
    // fn filter(...) { ... }
    // fn sum(...) { ... }
    // ...
}
```

`type Item` 叫做**关联类型**，声明了"这个迭代器产出什么类型的值"。`next` 方法是唯一必须自己实现的，其余几十个方法都基于 `next` 有默认实现。

`next` 每次调用返回：
- `Some(value)` — 下一个值
- `None` — 迭代结束

### 直接调用 next

`for` 循环其实就是在反复调用 `next`，只是语法糖让它看起来更简洁：

```rust runnable
fn main() {
    let v = vec![10, 20, 30];
    let mut iter = v.iter(); // 直接调用 next 需要 mut

    println!("{:?}", iter.next()); // Some(&10)
    println!("{:?}", iter.next()); // Some(&20)
    println!("{:?}", iter.next()); // Some(&30)
    println!("{:?}", iter.next()); // None
    println!("{:?}", iter.next()); // None（继续调用仍是 None）
}
```

> **为什么需要 `mut`？** 每次调用 `next` 都会推进迭代器内部的"游标"位置——这是对迭代器自身状态的修改。`for` 循环会拿走迭代器的所有权并在背后把它设为可变，所以你不用手动写 `mut`。

# 自定义迭代器

## 只需实现 next

任何结构体，只要为它实现了 `Iterator` trait 的 `next` 方法，就成了一个迭代器。来创建一个从 1 数到 5 的计数器：

> **关于 `type Item`**：代码里的 `type Item = u32;` 用到了**关联类型**（associated type）这个特性，后续高级特性章节会专门讲解它。现在只需要把它理解成"告诉编译器这个迭代器产出什么类型的值"——照着写就行，不需要深究语法原理。

```rust runnable
struct Counter {
    count: u32,
}

impl Counter {
    fn new() -> Counter {
        Counter { count: 0 }
    }
}

impl Iterator for Counter {
    type Item = u32; // 声明这个迭代器产出 u32 值（关联类型，后续章节会讲）

    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;
        if self.count <= 5 {
            Some(self.count)
        } else {
            None
        }
    }
}

fn main() {
    // 可以用 for 循环
    for n in Counter::new() {
        print!("{} ", n);
    }
    println!(); // 1 2 3 4 5

    // 也可以直接调用 next
    let mut c = Counter::new();
    println!("{:?}", c.next()); // Some(1)
    println!("{:?}", c.next()); // Some(2)
}
```

## 免费获得的其他方法

只要实现了 `next`，`Iterator` trait 上几十个有默认实现的方法就全部可以使用——不需要再写任何代码：

```rust runnable
struct Counter {
    count: u32,
}

impl Counter {
    fn new() -> Counter { Counter { count: 0 } }
}

impl Iterator for Counter {
    type Item = u32;
    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;
        if self.count <= 5 { Some(self.count) } else { None }
    }
}

fn main() {
    // sum：求和（只实现了 next，sum 是免费的）
    let total: u32 = Counter::new().sum();
    println!("1+2+3+4+5 = {}", total); // 15

    // 链式组合：
    // Counter::new()         → 1,2,3,4,5
    // .zip(skip(1))          → (1,2),(2,3),(3,4),(4,5)
    // .map(|(a,b)| a*b)      → 2,6,12,20
    // .filter(|x| x%3==0)   → 6,12
    // .sum()                 → 18
    let result: u32 = Counter::new()
        .zip(Counter::new().skip(1))
        .map(|(a, b)| a * b)
        .filter(|x| x % 3 == 0)
        .sum();
    println!("结果: {}", result); // 18
}
```

这就是"只需实现 `next`，其余全部免费"的威力。它也体现了 Rust trait 系统的核心设计哲学：最小接口 + 大量基于它的默认实现。

# 零开销抽象

## 迭代器 vs for 循环：谁更快？

初次接触迭代器时，很多人会担心：`map`、`filter` 这些高级方法会不会有额外开销？毕竟它们比手写 `for` 循环看起来"高级"多了。

答案是：**不会**。Rust 针对这个问题专门做了一个基准测试，搜索阿瑟·柯南·道尔"福尔摩斯探案集"全文中的某个单词：

```text
test bench_search_for  ... bench:  19,620,300 ns/iter (+/- 915,700)
test bench_search_iter ... bench:  19,234,900 ns/iter (+/- 657,200)
```

迭代器版本不仅没有更慢，反而**略快一点**。

## 零开销抽象是什么

这背后的原因是 Rust 的**零开销抽象**（zero-cost abstraction）原则。这个词借自 C++ 之父本贾尼·斯特劳斯特卢普：

> 从整体来说，C++ 的实现遵循了零开销原则：你不需要的，无需为它买单。更进一步：你需要的，也不可能找到更好的手写代码了。

Rust 把这个原则贯彻得更彻底。迭代器是一个**编译时抽象**——当你写 `v.iter().map(...).filter(...).sum()` 时，编译器看到的不是"调用了三个函数"，而是一整块可以整体优化的代码。最终生成的机器码与你手写的最优循环几乎一模一样。

理解零开销抽象的关键是区分**运行时抽象**和**编译时抽象**：

| 类型 | 例子 | 运行时开销 |
|------|------|----------|
| 运行时抽象 | 虚函数、动态派发（`dyn Trait`） | 有（查 vtable） |
| 编译时抽象 | 泛型、迭代器、闭包 | 无（编译期单态化） |

`Iterator` trait 的方法是**泛型的**——每种具体迭代器类型会在编译期生成专属的代码，不存在"通过指针间接调用"的运行时开销。

## 编译器如何做到：循环展开

来看一个来自音频解码器的真实例子。这段代码使用线性预测算法，用迭代器链对三个变量做数学运算：

```rust
# let mut buffer = [0i32; 16];
# let coefficients = [1i64; 12];
# let qlp_shift: i16 = 1;
for i in 12..buffer.len() {
    let prediction = coefficients.iter()
        .zip(&buffer[i - 12..i])
        .map(|(&c, &s)| c * s as i64)
        .sum::<i64>() >> qlp_shift;
    let delta = buffer[i];
    buffer[i] = prediction as i32 + delta;
}
```

因为 `coefficients` 的长度固定是 12，Rust 编译器**知道这个迭代只会执行 12 次**。它不会生成带循环控制逻辑（比较、跳转）的循环，而是直接把 12 次迭代**展开**（loop unrolling）成 12 段直线代码——消除了循环开销，让所有系数直接存进寄存器，也不需要运行时边界检查。

结果：迭代器链被编译成了**与手写汇编等价**的代码。

## 应该用迭代器还是 for 循环？

**性能上没有区别**，选择取决于可读性：

```rust runnable
fn main() {
    let v = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // for 循环版本
    let mut sum = 0;
    for &x in &v {
        if x % 2 == 0 {
            sum += x * x;
        }
    }
    println!("for 循环: {}", sum);

    // 迭代器版本——意图更清晰："过滤偶数，平方，求和"
    let sum2: i32 = v.iter()
        .filter(|&&x| x % 2 == 0)
        .map(|&x| x * x)
        .sum();
    println!("迭代器: {}", sum2);
}
```

> 对于需要跨步骤共享可变状态的复杂逻辑，`for` 循环可能更直观。其他情况优先选迭代器——代码更短、意图更清晰，编译器也更容易优化。

# 练习题

## 惰性求值与 next 测验

```rust
let v = vec![1, 2, 3];
let mut iter = v.iter();
iter.next();
iter.next();
```

```quiz single
Q: 上面代码执行后，再调用一次 iter.next() 会返回什么？
+ Some(&3)
- Some(&2)
- Some(&1)
- None
E: iter.next() 每次调用推进一格。已经调用了两次，游标在第 2 个元素之后，下一次返回第 3 个元素 Some(&3)。注意 iter() 产生的是不可变引用，所以是 &3 而不是 3。
```

```quiz single
Q: 以下哪种情况应该使用 into_iter() 而不是 iter()？
- 需要修改集合中的值
- 只需读取集合中的值
+ 需要把集合元素的所有权转移出去
- 需要同时遍历多个集合
E: into_iter() 会消耗集合（转移所有权），产生 T 类型的值。只是读取用 iter()（产生 &T）；修改用 iter_mut()（产生 &mut T）；转移所有权用 into_iter()（产生 T）。
```

```quiz single
Q: 直接调用 iter.next() 时，为什么 iter 变量必须是 mut？
- 因为 Rust 规定所有迭代器必须是可变的
+ 因为 next() 会修改迭代器内部的游标状态
- 因为 next() 可能返回 None
- 因为 next() 会克隆迭代器
E: 每次调用 next() 都会推进迭代器的内部游标（记录"下次从哪儿开始"的状态），这是对迭代器自身的修改，所以需要可变绑定。for 循环内部会拿走所有权并自动设为可变，所以不需要手动写 mut。
```

## Iterator trait 实现测验

```rust
struct Counter { count: u32 }

impl Iterator for Counter {
    type Item = u32;
    fn next(&mut self) -> Option<Self::Item> {
        self.count += 1;
        if self.count <= 3 { Some(self.count) } else { None }
    }
}
```

```quiz single
Q: Counter { count: 0 } 依次产生的值是？
- 0, 1, 2
- 1, 2, 3, 4
+ 1, 2, 3
- 0, 1, 2, 3
E: 每次调用 next 时先自增 count，再检查是否 <= 3。第一次：count 变为 1，返回 Some(1)；第二次：2；第三次：3；第四次：count 变为 4，不满足 <= 3，返回 None。
```

```quiz multi
Q: 为 Counter 实现了 Iterator trait 之后，下列哪些方法可以直接使用？
+ sum()
+ filter()
+ zip()
- push()
+ map()
E: 只要实现了 next()，Iterator trait 上几十个有默认实现的方法（sum、map、filter、zip、enumerate、skip 等）全部可用，无需额外代码。push() 是 Vec 的方法，与 Iterator trait 无关。
```

## 编程练习

下面是一段简单的"词法分析"：对 token 列表，用 `next()` 单独取出第一个 token 做特殊处理，剩余的交给 `for` 循环处理。补全代码使输出符合预期——这道题考查的是 `next()` 调用会推进迭代器状态，`for` 接着从"剩余部分"继续的特性。

```rust editable
fn main() {
    let tokens = vec!["fn", "greet", "(", "name", ":", "String", ")", "{", "}"];
    let mut iter = tokens.iter();

    // TODO: 用 next() 取出第一个 token，打印为 "关键字: <token>"
    // 然后用 for 循环打印剩余 token，每个打印为 "  token: <token>"

}
```

```expected
关键字: fn
  token: greet
  token: (
  token: name
  token: :
  token: String
  token: )
  token: {
  token: }
```
