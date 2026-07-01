---
title: "泛型语法基础"
description: "用泛型消除代码重复：函数、结构体、枚举和方法中的 <T> 写法，以及零开销单态化原理"
difficulty: beginner
estimatedTime: 20
keywords: ["泛型", "generics", "类型参数", "单态化", "monomorphization"]
---

# 用泛型抽象类型

## 为什么需要泛型

假设你要写一个函数，找出整数列表中最大的值：

```rust runnable
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    println!("最大值是 {}", largest_i32(&numbers));
}
```

现在你想对 `f64` 列表做同样的事，怎么办？复制一份：

```rust
fn largest_f64(list: &[f64]) -> &f64 {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}
```

两个函数的**逻辑完全相同**，只有类型不同。如果还要支持 `char`、`u8`……每次都要复制？虽然 C 语言正是这样做的，但 Rust 里可以写的更加优雅，这正是泛型要解决的问题。

**泛型**让你用一个占位符 `T` 代表"某种类型"，写一份代码，让编译器自动适配所有需要的类型。

## 泛型函数

用泛型合并上面两个函数：

```rust runnable
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    println!("整数最大值：{}", largest(&numbers));

    let floats = vec![2.7, 3.1, 0.8, 9.5, 1.4];
    println!("浮点最大值：{}", largest(&floats));
}
```

语法拆解：

- **`<T: PartialOrd>`** — 在函数名后用尖括号声明类型参数 `T`；`PartialOrd` 是**约束**，表示"T 必须支持比较大小"。没有这个约束，编译器不允许用 `>` 运算符
- **`list: &[T]`** — 参数是元素类型为 `T` 的切片
- **`-> &T`** — 返回对 `T` 类型值的引用

> `T` 只是惯例，你可以用任何标识符。但单个大写字母是 Rust 社区的约定，多个类型参数时常用 `T`、`U`、`K`、`V`。

约束语法（如 `PartialOrd`）的完整内容在 Trait 章节会讲，现在只需记住：**约束说明 T 能做什么**。

## 显式指定泛型参数：turbofish

大多数情况下，编译器能从传入的值自动推导 `T` 是什么，不需要手动指定：

```rust runnable
fn wrap<T>(val: T) -> Vec<T> { vec![val] }

fn main() {
    let v = wrap(42);    // 编译器从 42 推导出 T = i32
    println!("{:?}", v);
}
```

但有些函数的泛型参数在参数里看不出来，编译器无法推导，这时需要用 `函数名::<类型>()` 显式指定：

```rust runnable
fn main() {
    // parse 把字符串解析成"某种类型"，但哪种类型？编译器无法从 "42" 推断
    let n = "42".parse::<i32>().unwrap();
    let f = "3.14".parse::<f64>().unwrap();
    println!("{} {}", n, f);
}
```

`parse::<i32>()` 这种 `函数名::<类型>()` 语法叫 **turbofish**。注意不能省略 `::`，写成 `parse<i32>()` 会被编译器误读为比较运算符而报错。

规则很简单：**编译器能推导就省略；推导不了就加 turbofish**。

## 泛型结构体

类型参数同样可以放在结构体上：

```rust runnable
struct Point<T> {
    x: T,
    y: T,
}

fn main() {
    let int_point = Point { x: 5, y: 10 };
    let flt_point = Point { x: 1.0, y: 4.0 };
    println!("整数点: ({}, {})", int_point.x, int_point.y);
    println!("浮点点: ({}, {})", flt_point.x, flt_point.y);
}
```

注意：`x` 和 `y` 共享同一个 `T`，所以它们必须是**相同类型**：

```rust runnable expect-error
# struct Point<T> { x: T, y: T }
# fn main() {
let mixed = Point { x: 5, y: 4.0 }; // 错误！x 推导为 i32，y 推导为 f64
# }
```

如果需要两字段可以是不同类型，用**两个类型参数**：

```rust runnable
struct Point<T, U> {
    x: T,
    y: U,
}

fn main() {
    let mixed = Point { x: 5, y: 4.0 };
    println!("混合点: ({}, {})", mixed.x, mixed.y);
}
```

## 泛型枚举

你其实早就在用泛型枚举了——标准库里的 `Option` 和 `Result` 就是：

```rust
// 标准库中的定义（仅供参考，不需要自己写）
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

`Option<i32>` 和 `Option<String>` 结构完全一样，只是 `T` 不同。这就是泛型让一个枚举适配无数场景的原理。

你自己也可以定义泛型枚举：

```rust runnable
// 一个简单的二叉树，存储任意类型的值
enum Tree<T> {
    Leaf(T),
    Node(Box<Tree<T>>, Box<Tree<T>>),
}

fn main() {
    let tree: Tree<i32> = Tree::Node(
        Box::new(Tree::Leaf(1)),
        Box::new(Tree::Leaf(2)),
    );
    println!("创建成功");
}
```

# 方法与单态化

## 为泛型类型定义方法

在 `impl` 块上使用泛型，需要在 `impl` 关键字后面同样声明 `<T>`：

```rust runnable
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }

    fn y(&self) -> &T {
        &self.y
    }
}

fn main() {
    let p = Point { x: 5, y: 10 };
    println!("x = {}, y = {}", p.x(), p.y());
}
```

为什么要写**两次** `<T>`？对比函数就清楚了：

```rust
// 函数：先在 <T> 里"引入"T，然后在参数里"使用"T
fn foo<T>(x: T) { ... }
//    ^^^  ^^^
//    引入  使用

// impl：同样先"引入"T，然后在类型名里"使用"T
impl<T> Point<T> { ... }
//   ^^^       ^^^
//   引入       使用
```

`impl<T>` 里的 `<T>` 是在告诉编译器："接下来的 `T` 是一个类型参数，不是某个叫做 `T` 的具体类型"。如果直接写 `impl Point<T>`（省掉前面的 `<T>`），编译器会以为 `T` 是某个具体类型的名字，找不到就报错。

## 为特定类型实现专属方法

也可以只为某个**具体类型**实现方法。这时 `impl` 后面不加 `<T>`：

```rust runnable
struct Point<T> {
    x: T,
    y: T,
}

// 所有 Point<T> 都有这个方法
impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }
}

// 只有 Point<f64> 才有这个方法
impl Point<f64> {
    fn distance_from_origin(&self) -> f64 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

fn main() {
    let flt_p = Point { x: 3.0_f64, y: 4.0 };
    println!("x = {}", flt_p.x());
    println!("距原点距离: {}", flt_p.distance_from_origin()); // 5.0

    let int_p = Point { x: 3_i32, y: 4 };
    println!("x = {}", int_p.x());
    // int_p.distance_from_origin(); // 编译错误！i32 版本没有这个方法
}
```

## 单态化：零开销抽象

泛型的关键卖点：**运行时没有任何额外开销**。

Rust 编译器在编译阶段做**单态化**（monomorphization）——把每处泛型代码展开成针对该具体类型的独立代码：

```rust
// 你写的
fn largest<T: PartialOrd>(list: &[T]) -> &T { ... }

// 你调用了
largest(&[1_i32, 2, 3]);
largest(&[1.0_f64, 2.0, 3.0]);

// 编译器实际生成（概念示意）
fn largest_i32(list: &[i32]) -> &i32 { ... }
fn largest_f64(list: &[f64]) -> &f64 { ... }
```

这意味着：

| 维度 | 表现 |
|------|------|
| 运行速度 | 和手写具体类型代码完全相同 |
| 编译时间 | 用到的类型越多，编译越慢 |
| 二进制大小 | 每种类型生成一份代码，体积略增 |

Rust 选择了"编译期多花时间，换取运行时零开销"的策略。这正是 Rust 能做到既安全又高效的原因之一。

> 与单态化相对的是**动态分发**（`dyn Trait`）：推迟到运行时才确定类型，有运行时开销但编译产物更小。两种策略各有适用场景，后续章节会介绍。

# 练习题

## 泛型函数测验

```quiz single
Q: 以下哪种写法能正确声明一个泛型函数？
- fn<T> swap(a: T, b: T) -> (T, T)
- fn swap(a: T, b: T) -> (T, T)
- fn swap(a: <T>, b: <T>) -> (<T>, <T>)
+ fn swap<T>(a: T, b: T) -> (T, T)
E: 类型参数必须在函数名后的 <> 中先声明，才能在参数列表和返回值中使用。正确语法是 fn 函数名<T>(参数: T) -> T。
```

```rust
struct Container<T, U> {
    first: T,
    second: U,
}
```

```quiz single
Q: 上面的代码，以下哪种初始化是合法的？
+ let c = Container { first: 42, second: "hello" };
- let c: Container<i32> = Container { first: 42, second: 43 };
- let c = Container::<i32, i32, i32> { first: 1, second: 2, third: 3 };
- let c = Container { first: 42 };
E: Container 有两个独立的类型参数 T 和 U，所以 first 和 second 可以是不同类型。T=i32、U=&str 完全合法。指定三个类型参数或缺少字段都会报错。
```

## 泛型 impl 测验

```quiz single
Q: impl<T> Point<T> 和 impl Point<f32> 的区别是什么？
- 两种写法功能完全相同
+ impl<T> 为所有类型实现，impl Point<f32> 只为 f32 实现
- impl Point<f32> 会覆盖 impl<T> 对 f32 的所有实现
- Rust 不允许两者共存于同一文件
E: impl<T> 是泛型实现，对 Point<i32>、Point<f64> 等都有效；impl Point<f32> 只针对 f32 类型的 Point，可以添加其他类型没有的专属方法。两者可以同时存在。
```

```quiz multi
Q: 下列关于泛型单态化的说法，哪些是正确的？
+ 单态化后的代码运行速度与手写具体类型代码相同
+ 单态化在编译期完成，运行时没有类型查找开销
- 单态化会导致运行时使用虚函数表（vtable）进行分发
+ 使用的具体类型越多，编译产物的体积可能越大
E: 单态化是编译期展开，生成针对每种具体类型的代码，运行时无额外开销，也不使用 vtable（vtable 是 dyn Trait 动态分发的机制）。代价是编译时间和二进制大小。
```

## 编程练习

下面的 `wrap` 函数只能包装 `i32`。请将它改造成泛型函数，使其能包装任意类型，并让 `main` 中所有调用都正常编译运行。

```rust editable
fn wrap(value: i32) -> Vec<i32> {
    vec![value]
}

fn main() {
    let nums = wrap(42);
    println!("{:?}", nums); // [42]

    // 让下面两行也能工作
    let strs = wrap("hello");
    println!("{:?}", strs); // ["hello"]

    let bools = wrap(true);
    println!("{:?}", bools); // [true]
}
```

```expected
[42]
["hello"]
[true]
```
