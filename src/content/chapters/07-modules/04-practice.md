---
title: "综合练习"
description: "综合运用模块、可见性、路径和 use，实现完整的库结构。包含单元测试和多模块设计。"
difficulty: intermediate
estimatedTime: 50
keywords: ["模块", "可见性", "路径", "use", "重导出", "综合项目"]
---

# 模块系统综合练习

## 练习 1：设计一个虚拟餐厅库

设计一个 `restaurant` 库，包含以下要求：

**模块结构：**

```text
restaurant/
├── front_of_house/
│   ├── hosting (模块)
│   │   ├── add_to_waitlist() - 添加到等待列表
│   │   └── seat_at_table() - 安排座位
│   └── serving (模块)
│       ├── take_order() - 接单
│       └── serve_meal() - 上菜
└── back_of_house/
    ├── cook_order() - 私有，只在后台使用
    └── fix_incorrect_order() - 修正订单
```

**要求：**
1. `front_of_house` 模块应该是公开的
2. `hosting` 和 `serving` 子模块应该是公开的
3. `back_of_house` 模块应该是私有的（内部实现）
4. 用 `pub use` 将常用函数重导出到库顶层
5. 在库中提供一个公开的 `eat_at_restaurant()` 函数

```rust editable
// TODO: 实现模块结构
pub mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {
            println!("已添加到等待列表");
        }

        pub fn seat_at_table() {
            println!("已安排座位");
        }
    }

    pub mod serving {
        pub fn take_order() {
            println!("接单");
        }

        pub fn serve_meal() {
            println!("上菜");
        }
    }
}

// TODO: 实现私有的后台模块
mod back_of_house {
    pub fn cook_order() {
        println!("厨师准备餐食...");
    }

    pub fn fix_incorrect_order() {
        cook_order();
        println!("纠正错误订单");
    }
}

// TODO: 使用 pub use 重导出常用函数
pub use front_of_house::hosting;

// TODO: 提供公开 API 函数
pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
    hosting::seat_at_table();
    front_of_house::serving::take_order();
    back_of_house::cook_order();
    front_of_house::serving::serve_meal();
}
```

**用户如何使用这个库（在 main.rs）：**

```rust
use restaurant::{hosting, eat_at_restaurant};

fn main() {
    eat_at_restaurant();
    hosting::add_to_waitlist();
}
```

```expected
已添加到等待列表
已安排座位
接单
厨师准备餐食...
上菜
```

---

## 练习 2：综合模块设计项目

创建一个完整的图书管理系统库，包含模块、可见性控制、路径和 use 的综合使用。

**目标：**
- 创建多层模块结构
- 使用可见性来隐藏实现细节
- 通过 pub use 简化公开 API
- 在模块之间使用相对路径和 super

**项目结构：**

```text
library/
├── catalog (公开)
│   ├── Book (结构体)
│   └── search() - 搜索书籍
├── storage (私有)
│   └── store_book() - 内部存储
├── users (公开)
│   ├── User (结构体)
│   └── register_user()
└── lib.rs 中的重导出
```

```rust editable
// 模块定义
pub mod catalog {
    #[derive(Debug)]
    pub struct Book {
        pub title: String,
        pub author: String,
    }

    pub fn search(title: &str) {
        println!("搜索书籍: {}", title);
    }
}

pub mod users {
    #[derive(Debug)]
    pub struct User {
        pub name: String,
    }

    pub fn register_user(name: &str) {
        println!("用户注册: {}", name);
    }
}

mod storage {
    use super::catalog::Book;

    pub fn store_book(book: &Book) {
        println!("存储书籍: {} - {}", book.title, book.author);
    }
}

// TODO: 使用 pub use 重导出主要项
pub use catalog::Book;
pub use users::User;

// 提供高层 API
pub fn check_out_book(user: &User, book: &Book) {
    println!("{} 借出 {}", user.name, book.title);
    storage::store_book(book);
}
```

**预期的库使用方式：**

```rust
use library::{Book, User, check_out_book};

fn main() {
    let book = Book { title: "Rust Book".to_string(), author: "官方".to_string() };
    let user = User { name: "Alice".to_string() };

    check_out_book(&user, &book);
}
```

```expected
Alice 借出 Rust Book
存储书籍: Rust Book - 官方
```

---

## 练习 3：处理路径冲突

有两个不同的模块定义了相同名称的类型。练习如何使用 use 和 as 来处理冲突。

```rust editable
mod graphics {
    pub struct Point {
        pub x: f64,
        pub y: f64,
    }
}

mod database {
    pub struct Point {
        pub id: i32,
        pub name: String,
    }
}

// TODO: 导入两个 Point 类型，处理名称冲突
// 方式 1: 使用父模块区分
use graphics::Point as GraphicsPoint;
use database::Point as DatabasePoint;

fn main() {
    let _gp = GraphicsPoint { x: 1.0, y: 2.0 };
    let _dp = DatabasePoint { id: 1, name: "Point A".to_string() };

    println!("图形点: ({}, {})", _gp.x, _gp.y);
    println!("数据点: ID {} - {}", _dp.id, _dp.name);
}
```

```expected
图形点: (1, 2)
数据点: ID 1 - Point A
```

---

## 知识检查

完成下列代码，使其正确编译并输出期望结果：

```rust editable
// 模块定义
mod utils {
    pub mod string_utils {
        pub fn capitalize(s: &str) -> String {
            // TODO: 首字母大写
            let mut chars = s.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        }
    }

    pub mod math_utils {
        pub fn add(a: i32, b: i32) -> i32 {
            a + b
        }
    }
}

// TODO: 使用 pub use 和 use 简化 API
pub use utils::string_utils;
pub use utils::math_utils;

fn main() {
    // TODO: 使用导入的函数
    let result = string_utils::capitalize("hello");
    let sum = math_utils::add(2, 3);

    println!("大写: {}", result);
    println!("求和: {}", sum);
}
```

```expected
大写: Hello
求和: 5
```
