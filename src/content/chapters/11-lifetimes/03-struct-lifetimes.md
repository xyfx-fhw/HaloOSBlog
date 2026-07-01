---
title: "结构体中的生命周期"
description: "学会为含引用的结构体标注生命周期，掌握 impl 块、方法、T: 'a 约束和 trait 实现中的生命周期写法"
difficulty: intermediate
estimatedTime: 30
keywords: ["struct lifetime", "结构体生命周期", "impl", "方法", "T: 'a", "trait"]
---

# 含引用的结构体

## 为什么结构体需要生命周期

到目前为止，你见过的结构体字段都是有所有权的类型，比如 `String`、`Vec<T>`、`i32`。这些类型在结构体销毁时随之销毁，没有引用的问题。

但如果你想让结构体**持有引用**——比如存一个字符串 slice `&str` 而不是 `String`——问题就来了：结构体不拥有那块数据，那块数据可能在结构体还活着的时候就被销毁了。

Rust 要求你在定义时明确标注生命周期，保证"结构体实例的生命周期不超过它所引用数据的生命周期"。

## 基本语法

先看不写标注会发生什么：

```rust runnable expect-error
// 字段 part 是 &str，但没有任何生命周期信息
struct ImportantExcerpt {
    part: &str,
}
```

编译器直接报错：`missing lifetime specifier`——结构体持有引用，但编译器不知道这个引用需要活多久，无法做任何保证。

解决方法是在结构体名后声明一个生命周期参数，并把它标注到引用字段上：

```rust runnable
// 'a 声明在结构体名后面的尖括号里
// 字段 part 是一个与 'a 关联的 &str 引用
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("叫我伊实马利。从前年轻的时候……");
    // novel 的所有权在这里，生命周期覆盖整个 main
    let first_sentence = novel.split('。').next().expect("没找到句号");
    // excerpt 引用了 novel 的一部分
    // novel 必须活得比 excerpt 更久（或一样久）
    let excerpt = ImportantExcerpt { part: first_sentence };
    println!("摘录：{}", excerpt.part);
}
```

`ImportantExcerpt<'a>` 的意思是：这个结构体实例不能比 `part` 字段所引用的数据活得更久。

如果尝试违反这个约束：

```rust runnable expect-error
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let excerpt;
    {
        let novel = String::from("叫我伊实马利。从前年轻的时候……");
        let first = novel.split('。').next().unwrap();
        excerpt = ImportantExcerpt { part: first };
        // novel 在这里被销毁
    }
    println!("{}", excerpt.part); // 错误！excerpt 引用了已销毁的 novel
}
```

## 多个生命周期参数

结构体可以有多个生命周期参数，表示不同字段来自不同的数据源：

```rust runnable
#[derive(Debug)]
struct TwoRefs<'a, 'b> {
    x: &'a i32,
    y: &'b i32,
}

fn main() {
    let a = 10;
    let result;
    {
        let b = 20;
        let t = TwoRefs { x: &a, y: &b };
        // a 和 b 可以有不同的生命周期
        result = *t.x; // 只复制 x 的值，不复制引用
        println!("t = {:?}", t);
    }
    println!("a = {}", result);
}
```

## 枚举中的生命周期

枚举的变体也可以包含引用，同样需要生命周期标注：

```rust runnable
#[derive(Debug)]
enum Message<'a> {
    Quit,
    Move { x: i32, y: i32 },
    Write(&'a str),        // 持有一个字符串 slice 引用
    ChangeColor(u8, u8, u8),
}

fn process(msg: &Message) {
    match msg {
        Message::Write(text) => println!("写入：{}", text),
        Message::Move { x, y } => println!("移动到 ({}, {})", x, y),
        Message::Quit => println!("退出"),
        Message::ChangeColor(r, g, b) => println!("颜色：{} {} {}", r, g, b),
    }
}

fn main() {
    let text = String::from("hello");
    let msg = Message::Write(&text);
    process(&msg);
}
```

# impl 块的生命周期

## 基本写法

当你为带生命周期参数的结构体实现方法时，`impl` 关键字后面也需要声明生命周期：

```rust runnable
struct Excerpt<'a> {
    part: &'a str,
}

// impl<'a> 声明生命周期，Excerpt<'a> 使用它
impl<'a> Excerpt<'a> {
    // 不涉及引用返回值时，方法签名可以很简洁
    fn level(&self) -> i32 {
        3
    }

    // 返回字段引用，生命周期由省略规则自动处理
    fn content(&self) -> &str {
        self.part
    }

    // 接受一个额外的引用参数
    fn announce_and_return(&self, announcement: &str) -> &str {
        println!("注意：{}", announcement);
        self.part // 返回 self.part，生命周期与 self 绑定
    }
}

fn main() {
    let text = String::from("这是一段重要的文字。后面还有更多内容。");
    let first = text.split('。').next().unwrap();
    let exc = Excerpt { part: first };

    println!("级别：{}", exc.level());
    println!("内容：{}", exc.content());
    println!("公告后返回：{}", exc.announce_and_return("请注意！"));
}
```

> `impl<'a>` 后面的 `'a` 与结构体定义中的 `'a` 是同一个生命周期参数。

## 为带生命周期的类型实现 trait

```rust runnable
use std::fmt;

struct Wrapper<'a> {
    data: &'a [i32],
}

impl<'a> fmt::Display for Wrapper<'a> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let parts: Vec<String> = self.data.iter().map(|x| x.to_string()).collect();
        write!(f, "[{}]", parts.join(", "))
    }
}

fn main() {
    let nums = vec![1, 2, 3, 4, 5];
    let w = Wrapper { data: &nums };
    println!("{}", w);
}
```

## 方法中的生命周期

有了结构体生命周期的基础，现在可以来看方法里的情况了。

方法签名里通常有两条生命周期线索：一条是结构体字段带来的 `'a`，另一条是方法自身参数带来的新生命周期。关键问题是：**返回值的生命周期该跟哪条线索走？**

```rust runnable
struct Config<'a> {
    host: &'a str,
    port: u16,
}

impl<'a> Config<'a> {
    // 返回的是 self.host，生命周期跟结构体的 'a 走
    // （省略规则自动处理，不需要手写）
    fn host(&self) -> &str {
        self.host
    }

    // 接受一个外部字符串，原样返回它
    // 返回值跟 new_host 走，和结构体的 'a 无关 → 需要独立的 'b
    fn with_host<'b>(&self, new_host: &'b str) -> &'b str {
        println!("原主机: {}", self.host);
        new_host
    }
}

fn main() {
    let host = String::from("localhost");
    let cfg = Config { host: &host, port: 8080 };

    let result;
    {
        let new_host = String::from("example.com");
        result = cfg.with_host(&new_host);
        println!("切换到: {}", result);
        // new_host 在这里销毁
    }
    println!("原来的: {}", cfg.host()); // cfg 和 host 仍然有效
}
```

`with_host` 为什么要用 `'b` 而不直接复用 `'a`？

如果写成 `fn with_host(&self, new_host: &'a str) -> &'a str`，调用方就必须保证 `new_host` 活得和 `self.host` 一样久——但 `new_host` 只是临时传进来用一下，没必要这么长寿。上面的例子里 `new_host` 在内部 `{}` 里就销毁了，如果强制要求它活到 `'a`，这段合理的代码就会被编译器拒绝。

独立的 `'b` 告诉编译器：**返回值只和 `new_host` 有关，和结构体的 `'a` 互不干扰**。

## 生命周期约束 T: 'a

当结构体需要持有泛型类型 `T` 的引用时，要约束 `T` 里包含的引用不会比结构体本身先销毁。语法是 `T: 'a`：

- `T: 'a` — `T` 中的所有引用都必须比 `'a` 活得更久
- `T: Trait + 'a` — `T` 必须实现 `Trait`，且 `T` 中的所有引用都比 `'a` 活得更久

```rust runnable
use std::fmt::Debug;

// Ref<'a, T> 持有一个指向 T 的引用
// T: 'a 保证 T 内部的引用在 'a 期间始终有效
#[derive(Debug)]
struct Ref<'a, T: 'a>(&'a T);

fn print_ref<'a, T>(t: &'a T)
where
    T: Debug + 'a,
{
    println!("{:?}", t);
}

fn main() {
    let x = 42;
    let r = Ref(&x);
    print_ref(r.0);

    let s = String::from("hello");
    print_ref(&s);
}
```

## trait 实现中的生命周期

为带生命周期参数的类型实现 trait 时，`impl` 块同样需要声明这个参数：

```rust runnable
use std::fmt;

struct StrWrapper<'a> {
    content: &'a str,
}

// impl 块也要带 <'a>，与结构体定义保持一致
impl<'a> fmt::Display for StrWrapper<'a> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}]", self.content)
    }
}

fn main() {
    let s = String::from("Rust 生命周期");
    let w = StrWrapper { content: &s };
    println!("{}", w);
}
```



含有字符串的结构体，有两种写法：

```rust runnable
// 方案 A：字段持有所有权（String）
// 优点：结构体完全独立，不依赖外部数据
// 缺点：创建时必须分配堆内存
struct OwnedConfig {
    host: String,
    port: u16,
}

// 方案 B：字段持有引用（&str）
// 优点：零拷贝，直接引用现有字符串
// 缺点：结构体生命周期受限于被引用字符串
struct BorrowedConfig<'a> {
    host: &'a str,
    port: u16,
}

fn main() {
    // A：任何时候都能用
    let cfg_owned = OwnedConfig {
        host: String::from("localhost"),
        port: 3000,
    };

    // B：只在 host 数据有效期内能用
    let host = String::from("example.com");
    let cfg_borrowed = BorrowedConfig { host: &host, port: 8080 };

    println!("A: {}:{}", cfg_owned.host, cfg_owned.port);
    println!("B: {}:{}", cfg_borrowed.host, cfg_borrowed.port);
}
```

> **实践建议：** 初学时优先用 `String`（方案 A），更简单不容易出错。当你有明确的性能需求（避免拷贝），且数据来源的生命周期容易管理，再考虑方案 B。

# 练习题

## 结构体生命周期测验

```quiz single
Q: 为什么结构体中的引用字段需要生命周期标注？
- 这是 Rust 的历史遗留要求，即将被移除
- 只有 &str 类型的字段需要，其他引用不需要
+ 编译器需要知道结构体实例的生命周期不能超过它引用的数据的生命周期
- 引用字段会让结构体变大，需要标注大小
E: 结构体持有引用时，如果引用的数据被销毁而结构体还在，就会出现悬垂引用。生命周期标注告诉编译器约束条件，让它能够在违规时报错。这适用于所有引用类型的字段。
```

```quiz single
Q: `struct Foo<'a> { x: &'a i32 }` 表示什么约束？
+ Foo 的实例不能活得比 x 所引用的数据更久
- Foo 只能在 'a 这个作用域内创建
- 'a 是一个全局常量生命周期
- x 必须是一个静态的 i32 值
E: 生命周期标注 'a 建立了约束：Foo 实例的生命周期不能超过其 x 字段所引用的数据的生命周期。这保证了只要 Foo 还在，x 引用的数据就还有效。
```

```quiz single
Q: 方法 `fn with_host<'b>(&self, new_host: &'b str) -> &'b str` 引入了独立的 `'b`，原因是？
- self 和 new_host 的生命周期必须不同
- 两个引用参数时必须用两个不同的生命周期名
+ 返回值来自 new_host 而不是 self，它的生命周期应该和 new_host 关联，而不是和结构体的 'a 关联
- 'b 是方法的默认命名约定，必须这样写
E: 如果用 'a 标注 new_host，调用方就必须保证 new_host 和结构体字段一样长寿，这是不必要的限制。独立的 'b 让返回值只与传入参数绑定，调用方可以传入临时的 new_host。
```

```quiz single
Q: `T: 'a` 这个约束的含义是？
+ T 中包含的所有引用的生命周期都不短于 'a
- T 类型本身的值只能活 'a 这么久
- T 必须实现名为 'a 的 trait
- T 必须在生命周期 'a 内创建
E: T: 'a 是生命周期约束，保证 T 内部若有引用，这些引用的有效期都不短于 'a。这样持有 &'a T 的结构体才能安全地在整个 'a 期间使用 T。
```

```quiz multi
Q: 关于 `impl<'a> SomeStruct<'a>` 的写法，下列说法哪些正确？
+ 方法可以引入自己的额外生命周期参数（如 'b），独立于结构体的 'a
- 每个方法都必须在签名中显式使用 'a
+ 这里的 'a 和结构体定义 struct SomeStruct<'a> 中的 'a 是同一个生命周期参数
+ impl 块需要声明 'a，才能在方法签名中使用它
E: impl<'a> 是必须的，它声明了生命周期参数让后面的 SomeStruct<'a> 能使用。impl 中的 'a 和结构体定义中的 'a 对应同一个参数。方法可以有自己的额外生命周期参数，但不一定每个方法都要在签名里用到 'a。
```

## 编程练习

`Config` 结构体目前无法编译，它持有两个字符串 slice 引用。请添加正确的生命周期标注，使其能够工作：

```rust editable
// TODO: 给 Config 和 impl 块添加生命周期标注
struct Config {
    host: &str,
    path: &str,
}

impl Config {
    fn new(host: &str, path: &str) -> Self {
        Config { host, path }
    }

    fn url(&self) -> String {
        format!("https://{}{}", self.host, self.path)
    }
}

fn main() {
    let host = String::from("example.com");
    let path = String::from("/api/v1");
    let cfg = Config::new(&host, &path);
    println!("{}", cfg.url());
}
```

```expected
https://example.com/api/v1
```
