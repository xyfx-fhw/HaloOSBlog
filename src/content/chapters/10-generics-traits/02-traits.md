---
title: "Trait：定义共享行为"
description: "掌握 Rust trait 核心机制：定义行为契约、为类型实现 trait、默认方法、派生宏、运算符重载、父 trait 和动态分发"
difficulty: intermediate
estimatedTime: 30
keywords: ["trait", "impl for", "derive", "dyn", "运算符重载", "父 trait", "孤儿规则"]
---

# 定义与实现

## 什么是 Trait

想象你在招聘网站写了一条岗位要求：

> **后端工程师**：必须能写 SQL、会用 Git、能写单元测试。

这条要求描述的是**能力（行为）**，而不是人的其他属性。不管应聘者是应届生还是工作十年的老手，只要满足这三条，都可以被"当作后端工程师"来使用。

Rust 的 **trait** 就是这个角色说明书——它定义一组方法签名，任何实现了它的类型都必须提供这些方法。trait 约定的是"能做什么"，而不关心类型内部是什么。

```rust runnable
// 定义 trait：规定"能摘要的事物"必须提供 summarize 方法
trait Summary {
    fn summarize(&self) -> String;
}

struct NewsArticle {
    headline: String,
    author: String,
}

struct Tweet {
    username: String,
    content: String,
}

// 为 NewsArticle 实现 Summary
impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {}", self.headline, self.author)
    }
}

// 为 Tweet 实现 Summary
impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}

fn main() {
    let article = NewsArticle {
        headline: String::from("Rust 荣获最受喜爱语言"),
        author: String::from("小明"),
    };
    let tweet = Tweet {
        username: String::from("rustacean"),
        content: String::from("今天又爱上了 Rust！"),
    };

    println!("{}", article.summarize());
    println!("{}", tweet.summarize());
}
```

## 定义与实现语法

**定义**：用 `trait` 关键字 + 名称 + 大括号，方法签名以**分号**结尾（不写方法体）：

```rust
pub trait Drawable {
    fn draw(&self);
    fn bounding_box(&self) -> (f64, f64, f64, f64);
}
```

**实现**：用 `impl TraitName for TypeName`，在大括号内提供所有方法的具体实现：

```rust runnable
trait Drawable {
    fn draw(&self);
}

struct Circle {
    x: f64,
    y: f64,
    radius: f64,
}

impl Drawable for Circle {
    fn draw(&self) {
        println!("画圆：圆心({}, {})，半径{}", self.x, self.y, self.radius);
    }
}

fn main() {
    let c = Circle { x: 0.0, y: 0.0, radius: 5.0 };
    c.draw();
}
```

如果实现时遗漏了 trait 中的某个方法，编译器会报错，明确告诉你缺了什么。

## 默认实现

trait 中的方法可以提供**默认实现**——实现方可以选择沿用默认行为，也可以覆盖它：

```rust runnable
trait Summary {
    fn summarize_author(&self) -> String; // 没有默认，必须实现

    fn summarize(&self) -> String {       // 有默认实现，可以不覆盖
        format!("（来自 {} 的内容）", self.summarize_author())
    }
}

struct Tweet {
    username: String,
}

impl Summary for Tweet {
    // 只实现必须的方法，summarize 使用默认实现
    fn summarize_author(&self) -> String {
        format!("@{}", self.username)
    }
}

struct NewsArticle {
    headline: String,
    author: String,
}

impl Summary for NewsArticle {
    fn summarize_author(&self) -> String {
        self.author.clone()
    }

    // 覆盖默认实现，提供自己的格式
    fn summarize(&self) -> String {
        format!("{} — {}", self.headline, self.author)
    }
}

fn main() {
    let tweet = Tweet { username: String::from("rustlang") };
    let article = NewsArticle {
        headline: String::from("Rust 2024 Edition 发布"),
        author: String::from("InfoQ"),
    };

    println!("{}", tweet.summarize());   // 用默认实现
    println!("{}", article.summarize()); // 用自己的实现
}
```

> 默认实现可以调用同一 trait 中的其他方法——哪怕那些方法没有默认实现。这让 trait 可以提供很多"免费"行为，实现方只需实现少数核心方法。

## 孤儿规则

实现 trait 时有一条规则：**trait 和类型中至少有一个必须在你的 crate 中定义**。

```rust runnable expect-error
use std::fmt;

// 错误：Display 和 Vec<T> 都来自标准库，不是本 crate 定义的
impl<T: fmt::Display> fmt::Display for Vec<T> {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[...]")
    }
}

# fn main() {}
```

这条规则叫**孤儿规则**（orphan rule），它保证不会有两个不同的 crate 同时为同一个类型实现同一个 trait 而产生冲突。

**允许的做法：**
- 为**你自己的类型**实现任意 trait（包括标准库的 `Display`、`Debug` 等）✅
- 为**任意类型**实现**你自己定义的 trait** ✅
- 为标准库类型实现标准库 trait ❌

# 高级特性

## #[derive]：让编译器帮你实现

对于常见的 trait，Rust 提供了 `#[derive]` 属性——只要在类型前加一行，编译器就会自动生成实现：

```rust runnable
#[derive(Debug, Clone, PartialEq)]
struct Point {
    x: f64,
    y: f64,
}

fn main() {
    let p1 = Point { x: 1.0, y: 2.0 };
    let p2 = p1.clone();              // Clone 自动实现

    println!("{:?}", p1);             // Debug 自动实现
    println!("相等: {}", p1 == p2);   // PartialEq 自动实现
}
```

常用的可派生 trait：

| trait | 作用 |
|-------|------|
| `Debug` | `{:?}` 格式化输出 |
| `Clone` | `.clone()` 深拷贝 |
| `Copy` | 按位复制，赋值不移动所有权 |
| `PartialEq` / `Eq` | `==` 和 `!=` 比较 |
| `PartialOrd` / `Ord` | `<`、`>`、`<=`、`>=` 比较 |
| `Hash` | 可用作 `HashMap` 的键 |
| `Default` | `T::default()` 创建默认值 |

如果派生行为不满足需求（比如需要自定义 `Display` 的格式），就手动实现对应 trait。

## 运算符重载

`a + b` 实际上是 `a.add(b)` 的语法糖——`+` 运算符对应 `std::ops::Add` trait。你可以为自定义类型定义 `+` 的行为：

```rust runnable
use std::ops::Add;

#[derive(Debug, PartialEq)]
struct Vec2 {
    x: f64,
    y: f64,
}

impl Add for Vec2 {
    type Output = Vec2; // 加法结果的类型

    fn add(self, other: Vec2) -> Vec2 {
        Vec2 {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

fn main() {
    let v1 = Vec2 { x: 1.0, y: 2.0 };
    let v2 = Vec2 { x: 3.0, y: 4.0 };
    let v3 = v1 + v2; // 调用了我们实现的 add
    println!("{:?}", v3); // Vec2 { x: 4.0, y: 6.0 }
}
```

`std::ops` 模块里定义了所有可重载运算符对应的 trait：`Add`、`Sub`、`Mul`、`Div`、`Neg`、`Index` 等。运算符重载的本质就是为这些 trait 提供实现。

## 父 Trait

Rust 没有继承，但 trait 可以**要求实现者同时实现另一个 trait**——这个被依赖的 trait 称为"父 trait"：

```rust runnable
trait Person {
    fn name(&self) -> String;
}

// 实现 Student 前，必须先实现 Person
trait Student: Person {
    fn university(&self) -> String;
}

trait Programmer {
    fn fav_language(&self) -> String;
}

// 同时依赖多个父 trait
trait CompSciStudent: Programmer + Student {
    fn git_username(&self) -> String;
}

struct Alice {
    name: String,
}

impl Person for Alice {
    fn name(&self) -> String { self.name.clone() }
}

impl Student for Alice {
    fn university(&self) -> String { String::from("清华大学") }
}

impl Programmer for Alice {
    fn fav_language(&self) -> String { String::from("Rust") }
}

impl CompSciStudent for Alice {
    fn git_username(&self) -> String { String::from("alice-dev") }
}

fn greet(s: &dyn CompSciStudent) {
    println!("你好，我是 {}，就读于 {}，最爱 {}，GitHub：{}",
        s.name(), s.university(), s.fav_language(), s.git_username());
}

fn main() {
    let alice = Alice { name: String::from("Alice") };
    greet(&alice);
}
```

父 trait 是"前提条件"：想实现 `CompSciStudent`，你得先满足 `Programmer` 和 `Student` 的要求；而 `Student` 又要求先满足 `Person`。编译器会强制检查这条链上所有 trait 都有实现。

## dyn Trait：动态分发

泛型和 `impl Trait` 在编译期就确定了具体类型。但有时你需要在**运行时**根据条件使用不同类型——这时就用 `Box<dyn Trait>`：

```rust runnable
trait Animal {
    fn name(&self) -> &str;
    fn sound(&self) -> &str;
}

struct Dog;
struct Cat;

impl Animal for Dog {
    fn name(&self) -> &str { "狗" }
    fn sound(&self) -> &str { "汪汪！" }
}

impl Animal for Cat {
    fn name(&self) -> &str { "猫" }
    fn sound(&self) -> &str { "喵喵！" }
}

// 返回类型在编译时不确定，所以用 Box<dyn Animal>
fn make_animal(is_dog: bool) -> Box<dyn Animal> {
    if is_dog {
        Box::new(Dog)
    } else {
        Box::new(Cat)
    }
}

fn main() {
    // 可以把不同类型放进同一个 Vec
    let animals: Vec<Box<dyn Animal>> = vec![
        make_animal(true),
        make_animal(false),
        make_animal(true),
    ];

    for animal in &animals {
        println!("{} 说：{}", animal.name(), animal.sound());
    }
}
```

`dyn Trait` 通过**虚函数表**（vtable）在运行时查找方法，代价是每次调用多一次间接跳转。

**`impl Trait` vs `Box<dyn Trait>` 选择指南：**

| | `impl Trait`（静态分发） | `Box<dyn Trait>`（动态分发） |
|--|--|--|
| 类型确定时机 | 编译期 | 运行时 |
| 运行时开销 | 无 | 有（vtable 查找） |
| 根据条件返回不同类型 | 不能 | 能 |
| 存入异构集合（如 `Vec`） | 不能 | 能 |

## 消除方法歧义

一个类型可以实现多个 trait，如果两个 trait 中有同名方法，直接调用会出现歧义：

```rust runnable expect-error
trait UsernameWidget {
    fn get(&self) -> String;
}

trait AgeWidget {
    fn get(&self) -> u8;
}

struct Form {
    username: String,
    age: u8,
}

impl UsernameWidget for Form {
    fn get(&self) -> String { self.username.clone() }
}

impl AgeWidget for Form {
    fn get(&self) -> u8 { self.age }
}

fn main() {
    let form = Form { username: String::from("rustacean"), age: 28 };
    println!("{}", form.get()); // 错误！有多个 get 方法
}
```

用**完全限定语法**（Fully Qualified Syntax）消除歧义：

```rust runnable
# trait UsernameWidget { fn get(&self) -> String; }
# trait AgeWidget { fn get(&self) -> u8; }
# struct Form { username: String, age: u8 }
# impl UsernameWidget for Form { fn get(&self) -> String { self.username.clone() } }
# impl AgeWidget for Form { fn get(&self) -> u8 { self.age } }
fn main() {
    let form = Form { username: String::from("rustacean"), age: 28 };

    // <类型 as Trait名>::方法名(参数)
    let username = <Form as UsernameWidget>::get(&form);
    let age      = <Form as AgeWidget>::get(&form);

    println!("用户名: {}", username);
    println!("年龄: {}", age);
}
```

# 练习题

## Trait 基础测验

```quiz single
Q: 以下关于 trait 的说法，哪个是错误的？
- trait 用来定义一组方法签名，实现方必须提供具体实现
- 同一个 trait 可以被多种不同的类型实现
+ 一个 trait 只能被定义在当前 crate 中的类型实现
- trait 中的方法可以有默认实现
E: 孤儿规则要求 trait 或类型中至少有一个在当前 crate 中定义，但这不等于"只能被本 crate 类型实现"。外部 crate 也可以为其自己的类型实现你的 trait。
```

```rust
trait Greet {
    fn greeting(&self) -> String {
        String::from("你好！")
    }
    fn name(&self) -> String;
}

struct Bob;

impl Greet for Bob {
    fn name(&self) -> String {
        String::from("Bob")
    }
}
```

```quiz single
Q: 上面的代码，调用 Bob{}.greeting() 会输出什么？
+ "你好！"（使用默认实现）
- 编译错误：Bob 没有实现 greeting
- 空字符串
- 编译错误：greeting 没有返回 name
E: Bob 只实现了必须的 name 方法，greeting 有默认实现可以直接继承，所以输出 "你好！"。
```

```quiz multi
Q: 关于孤儿规则，以下哪些操作是允许的？
- 在自己的 crate 中为 Vec<T> 实现 std::fmt::Display
+ 在自己的 crate 中为 Vec<T> 实现自己定义的 MyTrait
- 在自己的 crate 中为 i32 实现 std::ops::Add
+ 在自己的 crate 中为自定义的 MyStruct 实现 std::fmt::Display
E: MyTrait 是本地定义的 trait，可以为任何类型实现它（包括 Vec<T>）。MyStruct 是本地类型，可以为它实现任何外部 trait（包括 Display）。而 Vec<T> 和 Display 都来自标准库，两者都不是本地定义的，不能在一起实现。
```

## 高级特性测验

```rust
#[derive(Debug, Clone, PartialEq)]
struct Color(u8, u8, u8);
```

```quiz multi
Q: 上面的 Color 类型，哪些操作是合法的？
+ let c = Color(255, 0, 0); println!("{:?}", c);
+ let c1 = Color(0, 255, 0); let c2 = c1.clone();
+ let a = Color(1, 2, 3); let b = Color(1, 2, 3); assert!(a == b);
- let c = Color(0, 0, 255); println!("{}", c);
E: 派生了 Debug 可用 {:?}，派生了 Clone 可 .clone()，派生了 PartialEq 可用 ==。但没有实现 Display，所以 {} 格式化会编译失败。
```

```quiz single
Q: trait Student: Person 这行代码的含义是什么？
- Student 继承了 Person 的所有方法实现
+ 实现 Student 的类型也必须实现 Person
- Student 是 Person 的子类型，可以用在需要 Person 的地方
- Person 是可选的，不实现也能通过编译
E: Rust 没有继承，trait 父子关系表示的是约束：想实现 Student，必须先满足 Person 的要求。这是对实现者的前提条件，不是方法实现的继承。
```

```quiz single
Q: 什么时候应该用 Box<dyn Trait> 而不是 impl Trait？
- 想要更好的运行时性能
+ 需要在运行时根据条件返回不同的具体类型
- 想让代码看起来更简洁
- 总是应该优先使用 Box<dyn Trait>
E: impl Trait 在编译期就确定具体类型（静态分发），一个函数只能返回一种具体类型。当你需要根据条件返回不同类型（如 Dog 或 Cat），或将不同类型放入同一 Vec 时，才用 Box<dyn Trait>。
```

```quiz single
Q: 调用同名方法出现歧义时，正确的消除方式是？
- 重命名其中一个 trait 的方法
- 用 self.method_name::<TraitName>() 标注
+ 使用完全限定语法：<Type as TraitName>::method_name(&value)
- 删除其中一个 trait 的实现
E: 完全限定语法 <Type as TraitName>::method_name(&value) 明确指定了"以哪个 trait 的身份"调用方法，从而消除歧义。
```

## 编程练习

下面定义了一个 `Shape` trait 和两个形状结构体，请完成实现，使 `main` 输出正确结果：
- `Circle` 面积 = π × r²，周长 = 2πr（π 用 `std::f64::consts::PI`）
- `Rectangle` 面积 = 宽 × 高，周长 = 2 × (宽 + 高)
- 为两者实现 `Display`，格式见预期输出

```rust editable
use std::fmt;
use std::f64::consts::PI;

trait Shape {
    fn area(&self) -> f64;
    fn perimeter(&self) -> f64;
    fn describe(&self) -> String {
        format!("面积: {:.2}, 周长: {:.2}", self.area(), self.perimeter())
    }
}

struct Circle {
    radius: f64,
}

struct Rectangle {
    width: f64,
    height: f64,
}

// TODO: 为 Circle 实现 Shape
// TODO: 为 Rectangle 实现 Shape
// TODO: 为 Circle 实现 Display，格式：Circle(r=5.00)
// TODO: 为 Rectangle 实现 Display，格式：Rectangle(3.00x4.00)

fn print_shape(s: &dyn Shape) {
    println!("{}", s.describe());
}

fn main() {
    let c = Circle { radius: 5.0 };
    let r = Rectangle { width: 3.0, height: 4.0 };

    println!("{}", c);
    print_shape(&c);

    println!("{}", r);
    print_shape(&r);
}
```

```expected
Circle(r=5.00)
面积: 78.54, 周长: 31.42
Rectangle(3.00x4.00)
面积: 12.00, 周长: 14.00
```
