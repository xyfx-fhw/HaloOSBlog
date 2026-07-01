---
title: "模块与可见性"
description: "掌握 Rust 模块系统：定义模块、构建模块树、控制可见性（pub 关键字），学会用模块组织和隐藏代码。"
difficulty: intermediate
estimatedTime: 35
keywords: ["模块", "mod", "pub", "可见性", "私有性", "模块树", "封装"]
---

# 模块介绍

## 为什么需要模块

随着代码增长，代码会变得杂乱无序。模块提供了一种**组织和隐藏**代码的方式：

- **组织**：把相关功能分组到一起，提高可读性
- **隐藏**：控制哪些代码对外部可见，隐藏内部实现细节（封装）
- **作用域隔离**：防止名称冲突，同一个名字可以在不同模块中存在

想象一个餐厅：**前台**（公开，客人可见）和**后台**（私有，只有员工可见）。模块就是这样的概念。

## 定义模块：mod 关键字

使用 `mod` 关键字定义一个模块：

```rust runnable
mod front_of_house {
    fn greet_customer() {
        println!("欢迎来到我们的餐厅！");
    }
}

fn main() {
    // 错误！front_of_house 中的函数是私有的，无法直接调用
    // front_of_house::greet_customer();
    println!("程序运行");
}
```

模块可以**嵌套**，形成模块树。每个模块里可以包含子模块：

```rust
mod restaurant {
    mod front_of_house {
        mod hosting {
            fn add_to_waitlist() {
                println!("已将您添加到等待列表");
            }
        }
    }
}
```

# 可见性：pub 关键字

默认情况下，模块中的所有项都是**私有的**（private）。私有项只能在本模块和子模块中访问。

要让项对外部可见，需要用 `pub` 修饰：

```rust runnable
mod restaurant {
    // 私有模块（只能在 restaurant 内部使用）
    mod back_of_house {
        fn prepare_order() {
            println!("准备订单...");
        }
    }

    // 公有模块（可以从外部访问）
    pub mod front_of_house {
        pub fn add_to_waitlist() {
            println!("已添加到等待列表");
        }
    }

    pub fn eat_at_restaurant() {
        front_of_house::add_to_waitlist();
    }
}

fn main() {
    // 正确！front_of_house 是 pub，add_to_waitlist 也是 pub
    restaurant::front_of_house::add_to_waitlist();

    // 错误！back_of_house 是私有的
    // restaurant::back_of_house::prepare_order();
}
```

## pub 应用规则

- **模块**：必须标记 `pub` 才能从外部访问
- **函数**：必须标记 `pub` 才能从外部调用
- **结构体字段**：默认私有，每个字段需要单独标记 `pub`
- **枚举变体**：如果枚举是 `pub`，所有变体自动是 `pub`

> **重要**：`pub` 关键字控制的是**可见性**（visibility）——"能否看到和访问"。这是独立于以下两个机制的：
> - **所有权**（ownership）— "谁拥有这个值"（由之前的所有权系统控制）
> - **可变性**（mutability）— "能否修改这个值"（由 `mut` 关键字控制）
>
> 一个字段可以既是 `pub`（对外可见）又是不可变的（没有 `mut`）；反之，一个私有字段可以被内部代码通过 `mut` 修改。

## 结构体和枚举的可见性

**结构体的字段需要单独声明为 pub：**

```rust runnable
mod restaurant {
    pub struct Breakfast {
        pub toast: String,      // 公有
        seasonal_fruit: String, // 私有
    }

    impl Breakfast {
        pub fn new(toast: &str) -> Breakfast {
            Breakfast {
                toast: toast.to_string(),
                seasonal_fruit: "苹果".to_string(),
            }
        }
    }
}

fn main() {
    let mut meal = restaurant::Breakfast::new("黑麦面包");

    // 正确！toast 是 pub
    println!("今天的面包是 {}", meal.toast);

    // 错误！seasonal_fruit 是私有的
    // println!("水果是 {}", meal.seasonal_fruit);
}
```

> 结构体中 impl 里的函数也算是结构体的一部分，因此需要单独的 pub（不需要给 impl 加 pub，impl 的公开性同 struct）

**枚举的所有变体自动是 pub（如果枚举本身是 pub）：**

```rust runnable
mod pizza {
    pub enum PizzaSize {
        Small,
        Medium,
        Large,
    }
}

fn main() {
    // 所有变体都可以访问
    let _size = pizza::PizzaSize::Large;
}
```

# 可见性与模块层级

## 理论 1：路径可达性原则

Rust 可见性的本质是**路径可达性**。当你要访问 `a::b::c::item` 时，不仅 `item` 要公开，整条路径上的每一步 `a`、`b`、`c` 都必须是可穿过的（即都要标 `pub`），否则整条路径就断裂了。

想象一个办公楼：
- 楼 A（私有）→ 即使楼内的办公室是开放的，外人也进不去
- 楼 A（公开）→ 但对应楼层是私有的 → 外人也进不了那层
- 楼 A（公开）→ 楼层（公开）→ 办公室（私有）→ 外人还是进不了办公室

**结论**：父模块是私有的，就像给整栋楼上了锁，子模块内的任何 `pub` 项都无法从外部访问。

```rust runnable expect-error
mod parent {
    mod child {
        pub fn public_function() {
            println!("我是 pub 的");
        }
    }
}

fn main() {
    // ❌ 即使函数是 pub，但 parent 是私有的，外部无法穿过
    parent::child::public_function();
}
```

修复：让父模块也标为 `pub`

```rust runnable
pub mod parent {
    pub mod child {
        pub fn public_function() {
            println!("现在可以访问了");
        }
    }
}

fn main() {
    parent::child::public_function();  // ✅
}
```

## 理论 2：访问方向的非对称性

模块树内的访问有一个重要的**不对称性**：同一棵树里，向上可以，向下不行。为什么？

**向上访问**（子访问父）：
- 子模块内可以用 `super` 关键字访问父模块的**任何内容**，包括私有项
- **类比**：楼 A（私有）→ 楼层（私有）→ 办公室（私有），虽然楼 A 和楼层都是私有的，但现在这件办公室的员工必须有访问楼 A 和楼层的权限，不然楼都进不去

**向下访问**（父访问子）：
- 父模块**无法访问**子模块的私有项，只能访问子模块标记为 `pub` 的东西
- **类比**：楼 A（公开）→ 楼层（公开）→ 办公室（私有），虽然在公司内，但不能随意进入每个员工的私人办公室。如果员工想让别人进来，必须把门打开（标记为 `pub`）

这看起来不对称，但有深层逻辑：**私有性是一种承诺** —— 子模块说"这是我的内部实现，整个树内也不能依赖"。这样才能真正隐藏实现细节，让子模块可以自由改变内部结构而不影响外部（包括父模块）。

```rust runnable expect-error
mod parent {
    fn parent_private() {
        println!("父的私有函数");
    }

    pub mod child {
        fn child_private() {
            println!("子的私有函数");
        }

        pub fn access_upward() {
            // ✅ 子可以向上访问父的私有项
            super::parent_private();
        }
    }

    pub fn access_downward() {
        // ❌ 父无法访问子的私有项
        child::child_private();
    }
}

fn main() {
    parent::child::access_upward();
}
```

## 实战总结

<img src="/RustCourse/diagrams/mod.svg" alt="mod" style="max-width:100%;margin:1rem 0;" />

我们来看看这个图，思考几个场景（假设都是非 pub 的）：

1. 「自己」访问「父模块」的私有项：「兄弟模块」、「函数 A」、「结构体 A」 —— 都可以访问（向上访问，树内特权。原因是这四者同属一个父模块，父模块的内容都可以访问）
2. 「自己」访问「子模块 a」或者「子模块 b」—— 不能访问（父访问子）
3. 「自己」访问「兄弟模块」的「结构体 b」 —— 不能访问（向下访问，私有边界保护）
4. 「子模块 a」 访问「自己」（子模块 a 的父级）的「私有项」：「子模块 b」 或者「函数 a」 —— 能访问（向上访问，树内特权）
5. 「子模块 a」 访问「子模块 b」（子模块 a 的兄弟） 的「私有项」 —— 不能访问（私有边界保护）
6. 「子模块 a」 访问「父模块」（子模块 a 的爷级）的私有项：「函数 A」、「结构体 A」 —— 可以访问（向上访问，传递的树内特权）

| 场景 | 是否可以 | 原因 |
|------|--------|------|
| 外部代码访问私有模块内的 pub 项 | ❌ | 路径断裂 |
| 外部代码访问完整 pub 路径末端的项 | ✅ | 路径可达 |
| 子模块访问父模块的私有项 | ✅ | 同树内部 |
| 父模块访问子模块的私有项 | ❌ | 要尊重私有边界 |
| 兄弟模块互相访问 pub 项 | ✅ | 通过 `super` 从父导航 |


# 文件模块化

## 模块树

每个 crate 都有一个**模块树**，以 crate root（`src/main.rs` 或 `src/lib.rs`）为根：

```text
crate                          ← 隐式的根模块
 └── restaurant                ← 模块
     └── front_of_house        ← 嵌套模块
         ├── hosting           ← 模块
         │   ├── add_to_waitlist
         │   └── seat_at_table
         └── serving           ← 模块
             ├── take_order
             ├── serve_order
             └── take_payment
```

树中的每一项（函数、结构体、常量等）都有一个**路径**：
- `crate::restaurant::front_of_house::hosting::add_to_waitlist`
- `crate::restaurant::front_of_house::serving::take_order`

当模块变得很大时，可以将它们放在单独的文件中。

**项目结构有两种等价的方式：**

方式 1：单文件 + 目录

```text
src/
├── main.rs
├── restaurant.rs          ← 模块文件
└── restaurant/
    └── hosting.rs         ← 嵌套模块文件
```

方式 2：纯目录形式（旧写法，不推荐了）

```text
src/
├── main.rs
└── restaurant/
    ├── mod.rs             ← 模块定义（代替 restaurant.rs）
    └── hosting.rs         ← 嵌套模块文件
```

**src/main.rs：**

```rust
mod restaurant;

fn main() {
    restaurant::eat_at_restaurant();
}
```

**src/restaurant.rs：**

```rust
pub mod hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}
```

**src/restaurant/hosting.rs：**

> **目录名必须与模块名相同**：如果模块叫 `restaurant`，目录必须叫 `restaurant/`，不能用其他名字

```rust
pub fn add_to_waitlist() {
    println!("已添加到等待列表");
}
```

## 文件模块化的规则

- 声明模块使用 `mod 模块名;`（注意**分号**）
- Rust 会在 `模块名.rs` 文件或 `模块名/` 目录中查找模块定义
- **模块树中每个模块只能被声明一次**：模块的声明权属于它的父模块。例如，如果 `main.rs` 中声明了 `mod c;`，其他文件就不能再声明 `mod c;`
- 嵌套模块的文件放在对应名称的**目录**中
- 目录内的 `mod.rs` 文件定义该目录对应模块的内容

# 练习题

## 模块定义测验

```rust
mod restaurant {
    mod kitchen {
        fn cook() {}
    }

    pub fn eat() {
        kitchen::cook();
    }
}
```

```quiz single
Q: 以下哪个调用是正确的？
- kitchen::cook();
- restaurant::kitchen::cook();
- restaurant::eat();
+ 这里会有编译问题，eat() 无法使用 cook()
E: eat() 虽然在 restaurant 内，但只能获取到 kitchen 这一层，cook 必须 pub 才能使用。
```

```quiz single
Q: 要在文件系统中组织嵌套模块，正确的目录结构是什么？
- 必须在 Cargo.toml 中声明每个模块
- 所有模块都放在 src/ 目录下的 .rs 文件
+ 模块放在名称对应的文件夹中，如 src/restaurant/hosting.rs
- 模块文件名必须是 mod.rs
E: 嵌套模块应放在对应名称的目录中。父模块用 `mod child_name;` 声明，Rust 会在 child_name/ 目录中查找。
```

```quiz multi
Q: 下列关于 pub 关键字的说法，正确的是？（多选）
+ 没有 pub 时，模块项默认是私有的
+ 结构体的每个字段需要单独标记 pub 才能被外部访问
- 枚举的变体需要单独标记 pub
+ 如果父模块是私有的，子模块中的 pub 项也无法从外部访问
E: 默认私有。结构体字段需单独 pub。嵌套模块需要完整的公开路径。枚举的 pub 变体自动对外开放。
```

```quiz single
Q: 要让结构体的某些字段对外部可见，应该怎么做？
+ 需要分别标记要公开的每个字段为 pub
- 给整个结构体标记 pub 就足够了
- 使用 #[derive(pub)]
- 结构体中所有字段必须都是 pub
E: 结构体是 pub 不代表字段是 pub。每个字段需要独立标记。这样的设计让你可以隐藏内部字段。
```

## 编程练习

### 补充 pub 关键字

补充下面代码中缺少的 `pub` 关键字，使得所有调用都能编译通过。

```rust editable
mod library {
    struct Book {
        title: String,
        isbn: String,  // 私有
    }

    impl Book {
        fn new(title: &str, isbn: &str) -> Self {
            Book {
                title: title.to_string(),
                isbn: isbn.to_string(),
            }
        }
    }

    fn add_book(title: &str) {
        println!("书籍已添加：{}", title);
    }

    mod storage {
        fn store(title: &str) {
            println!("已存储书籍：{}", title);
        }
    }

    fn list_books() {
        println!("列出所有书籍");
    }
}

fn main() {
    let book = library::Book::new("Rust 圣经", "123-456");
    println!("书名：{}", book.title);

    // 调用公开函数
    library::add_book("深入浅出 Rust");
    library::list_books();

    // 这些无法访问（预期）
    // println!("ISBN: {}", book.isbn);
    // library::storage::store("某本书");
}
```

```expected
书名：Rust 圣经
书籍已添加：深入浅出 Rust
列出所有书籍
```
