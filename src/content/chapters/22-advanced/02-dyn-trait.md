---
title: "dyn Trait：动态分发"
description: "理解 Rust 动态分发：为什么需要 dyn Trait、fat pointer 原理、对象安全限制，以及与泛型的选择时机"
difficulty: advanced
estimatedTime: 35
keywords: ["dyn Trait", "动态分发", "trait object", "fat pointer", "类型擦除", "对象安全"]
---

# 为什么需要 dyn Trait

## 泛型搞不定的两个场景

泛型和 `impl Trait` 是"编译期多态"——编译器在编译时就把每种具体类型展开成独立代码，运行时完全不需要判断类型。这很高效，但有两种情况它做不到。

### 场景一：Vec 里装不同的类型

假设你在写一个 UI 框架，页面上有按钮、文本框、复选框……你想把它们全放进一个 `Vec`，然后循环调用每个组件的 `draw()` 方法：

```rust runnable expect-error
trait Widget {
    fn draw(&self);
}

struct Button { label: String }
struct TextBox { text: String }

impl Widget for Button {
    fn draw(&self) { println!("画按钮：{}", self.label); }
}
impl Widget for TextBox {
    fn draw(&self) { println!("画文本框：{}", self.text); }
}

fn main() {
    // 试图把不同类型放进同一个 Vec——编译失败
    let widgets: Vec<Button> = vec![
        Button { label: String::from("确定") },
        TextBox { text: String::from("请输入...") }, // 错误！类型不匹配
    ];
}
```

`Vec<T>` 的 `T` 在编译期只能是一种具体类型，没有办法装"实现了 Widget 的任意类型"。

### 场景二：根据条件返回不同类型

```rust runnable expect-error
# trait Widget { fn draw(&self); }
# struct Button { label: String }
# struct TextBox { text: String }
# impl Widget for Button { fn draw(&self) {} }
# impl Widget for TextBox { fn draw(&self) {} }

fn create_widget(is_button: bool) -> impl Widget {
    if is_button {
        Button { label: String::from("确定") }
    } else {
        TextBox { text: String::from("请输入...") } // 错误！两个分支返回类型不同
    }
}

# fn main() {}
```

`impl Widget` 虽然隐藏了具体类型名，但编译器在编译期就要确定它到底是哪一种——两个分支返回不同类型，没办法确定，编译失败。

## 用 dyn Trait 解决

`dyn Trait` 的核心思路：**不在编译期确定具体类型，而是在运行时通过指针查找方法**。

```rust runnable
trait Widget {
    fn draw(&self);
    fn area(&self) -> f64;
}

struct Button { label: String, width: f64, height: f64 }
struct TextBox { text: String, cols: f64, rows: f64 }
struct Checkbox { checked: bool, size: f64 }

impl Widget for Button {
    fn draw(&self) { println!("[按钮] {}", self.label); }
    fn area(&self) -> f64 { self.width * self.height }
}
impl Widget for TextBox {
    fn draw(&self) { println!("[文本框] {}", self.text); }
    fn area(&self) -> f64 { self.cols * self.rows }
}
impl Widget for Checkbox {
    fn draw(&self) { println!("[复选框] {}", if self.checked { "✓" } else { "□" }); }
    fn area(&self) -> f64 { self.size * self.size }
}

fn build_ui() -> Vec<Box<dyn Widget>> {
    vec![
        Box::new(Button { label: String::from("确定"), width: 80.0, height: 30.0 }),
        Box::new(TextBox { text: String::from("请输入..."), cols: 200.0, rows: 24.0 }),
        Box::new(Checkbox { checked: true, size: 16.0 }),
        Box::new(Button { label: String::from("取消"), width: 80.0, height: 30.0 }),
    ]
}

fn main() {
    let ui = build_ui();

    println!("--- 渲染所有组件 ---");
    for widget in &ui {
        widget.draw();
    }

    let total_area: f64 = ui.iter().map(|w| w.area()).sum();
    println!("总面积: {}", total_area);
}
```

`Box<dyn Widget>` 让不同类型能放进同一个 `Vec`，`build_ui` 也能根据需要自由选择返回哪种组件。

## 类型擦除：dyn 的本质约束

使用 `dyn Widget` 时，只能调用 `Widget` 中定义的方法——具体类型信息"消失"了，这叫**类型擦除**（type erasure）：

```rust runnable expect-error
# trait Widget { fn draw(&self); fn area(&self) -> f64; }
# struct Button { label: String, width: f64, height: f64 }
# impl Widget for Button {
#     fn draw(&self) { println!("[按钮] {}", self.label); }
#     fn area(&self) -> f64 { self.width * self.height }
# }
impl Button {
    fn click(&self) { println!("按钮被点击了！"); } // Button 独有的方法
}

fn main() {
    let w: Box<dyn Widget> = Box::new(Button {
        label: String::from("确定"), width: 80.0, height: 30.0
    });

    w.draw();   // ✅ Widget 定义了 draw，可以调用
    w.area();   // ✅ Widget 定义了 area，可以调用
    w.click();  // ❌ click 不在 Widget 里，类型已擦除，访问不到
}
```

所以 **trait 在动态分发里扮演的角色正是接口合约**：你在 trait 里定义的方法，就是调用方通过 `dyn` 能看到和使用的全部。trait 设计得越精准，`dyn Trait` 就越好用。

# 原理与限制

了解了 `dyn Trait` 能做什么、以及类型擦除的限制，来看看它在内存里的实现——这有助于理解为什么有运行时开销，也解释了对象安全规则背后的原因。

## fat pointer：内存中的样子

`dyn Trait` 在内存中是一个 **fat pointer（胖指针）**，由两个指针组成：

```text
Box<dyn Widget>
┌───────────────┐
│  data ptr  ───┼──→  Button { ... }   ← 堆上的实际数据
│  vtable ptr ──┼──→  { draw, area, … } ← 方法地址表
└───────────────┘
```

调用 `widget.draw()` 时，Rust 先通过 vtable 找到 `Button::draw` 的地址，再跳转执行——这就是"运行时开销"的来源。

## Box\<dyn Trait\> 与 \&dyn Trait

`dyn Trait` 自身没有已知大小，必须放在指针后面使用。常见的两种形式：

```rust runnable
trait Greet {
    fn hello(&self) -> String;
}

struct English;
struct Chinese;

impl Greet for English {
    fn hello(&self) -> String { String::from("Hello!") }
}
impl Greet for Chinese {
    fn hello(&self) -> String { String::from("你好！") }
}

// &dyn Trait：借用，不分配堆内存
fn greet_once(g: &dyn Greet) {
    println!("{}", g.hello());
}

// Box<dyn Trait>：拥有所有权，数据在堆上
fn make_greeter(lang: &str) -> Box<dyn Greet> {
    match lang {
        "en" => Box::new(English),
        _    => Box::new(Chinese),
    }
}

fn main() {
    let e = English;
    greet_once(&e);                    // &dyn：引用栈上的值

    let g = make_greeter("zh");
    greet_once(g.as_ref());            // Box<dyn>：引用堆上的值
}
```

| 形式 | 所有权 | 数据位置 | 典型用途 |
|------|--------|----------|----------|
| `&dyn Trait` | 借用 | 调用者决定 | 函数参数，只需临时访问 |
| `Box<dyn Trait>` | 拥有 | 堆 | 返回值、集合元素、长期持有 |

前面的例子都能正常工作，但不是所有 trait 都能用于 `dyn`——有一条叫**对象安全**的限制需要了解。

## 对象安全

不是所有 trait 都能用作 `dyn Trait`——只有满足**对象安全**（object-safe）条件的才行：

- 方法不能返回 `Self`（运行时无法知道 `Self` 的具体大小）
- 方法不能有泛型类型参数（每种 `T` 对应不同代码，无法放进统一的 vtable）

最常见的不满足情况是 `Clone`——`clone()` 返回 `Self`，所以 `dyn Clone` 不合法：

```rust runnable expect-error
// Clone 的定义：fn clone(&self) -> Self  ← 返回 Self，不对象安全
fn clone_it(x: &dyn Clone) {
    todo!()
}

# fn main() {}
```

## 静态分发 vs 动态分发

| | 泛型 / `impl Trait` | `dyn Trait` |
|--|--|--|
| 类型确定时机 | 编译期 | 运行时 |
| 运行时开销 | 无（单态化） | 有（vtable 查找） |
| 二进制大小 | 每种类型一份代码，偏大 | 共享一份代码，偏小 |
| 存入异构集合 | 不能 | 能 |
| 条件返回不同类型 | 不能 | 能 |
| 对象安全限制 | 无 | 有 |

**经验法则**：默认用泛型（零开销）；需要运行时多态（异构集合、插件系统、条件分支返回不同类型）时才用 `dyn Trait`。

# 练习题

## dyn Trait 测验

```quiz single
Q: 什么时候应该用 Box<dyn Trait> 而不是泛型 <T: Trait>？
+ 需要把不同的具体类型放入同一个集合，或根据条件返回不同类型
- 泛型语法太复杂，想写得简洁一些
- 总是应该优先使用 Box<dyn Trait>
- 想要更好的运行时性能
E: 泛型在编译期确定类型，速度更快但每个调用点只能对应一种具体类型。Box<dyn Trait> 在运行时确定，有额外开销，但能处理运行时才知道具体类型的场景。
```

```quiz single
Q: Box<dyn Animal> 中，"类型擦除"是指什么？
+ 存入后只能通过 Animal 定义的方法访问，具体类型（Dog/Cat）的其他方法不可见
- Box 会把对象复制一份存在栈上
- 只有实现了 Clone 的类型才能被擦除
- Animal trait 被编译器删除了
E: 类型擦除指的是把 Dog 装入 Box<dyn Animal> 后，使用方只能通过 Animal 的方法访问它，Dog 独有的方法对外不可见——好像具体类型"消失"了一样。
```

```quiz single
Q: dyn Trait 的 fat pointer（胖指针）由哪两部分组成？
- 两个分别指向不同数据的指针
- 指向数据的指针 + 数据长度
- 指向 vtable 的指针 + 引用计数
+ 指向数据的指针 + 指向 vtable 的指针
E: dyn Trait 的 fat pointer = 数据指针（指向堆上的具体值）+ vtable 指针（指向该类型对该 trait 的方法表）。通过 vtable，运行时才能找到正确的方法实现。
```

```quiz single
Q: 为什么 Clone trait 不满足对象安全，不能用作 dyn Clone？
- Clone 没有提供默认实现
- dyn 只支持最多两个方法的 trait
- Clone 是标准库的 trait，不允许用作 trait object
+ Clone 的 clone() 方法返回 Self，运行时无法确定 Self 的具体大小
E: 对象安全要求方法不能返回 Self，因为运行时通过 dyn 使用时已经擦除了具体类型，编译器无法知道 Self 是多大，也无法生成对应的代码。Clone::clone 的签名 fn clone(&self) -> Self 违反了这条规则。
```
