---
title: "结构体"
description: "学习 Rust 结构体的定义、实例化、字段访问与修改，理解结构体如何比元组提供更清晰的代码组织。"
difficulty: beginner
estimatedTime: 40
keywords: ["结构体", "struct", "字段", "实例化", "元组结构体", "类单元结构体"]
---

# 什么是结构体

**结构体**（struct）是 Rust 中最常用的自定义类型，允许你将多个相关的数据组织在一起，并给每个数据片段起一个有意义的名字。

想象你要存储一个矩形的尺寸。用普通变量，你可能这样写：

```rust runnable
fn main() {
    let width = 30;
    let height = 50;

    println!("矩形尺寸：宽 {}, 高 {}", width, height);
}
```

这样做的问题是：没有清晰表现出这两个数字是相关的（都属于同一个矩形）。用**元组**能改进一点：

```rust runnable
fn main() {
    let rect = (30, 50);

    println!("矩形尺寸：宽 {}, 高 {}", rect.0, rect.1);
}
```

但是代码读者仍然需要记住"第一个字段是宽，第二个是高"。如果用结构体：

```rust runnable
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect = Rectangle {
        width: 30,
        height: 50,
    };

    println!("矩形尺寸：宽 {}, 高 {}", rect.width, rect.height);
}
```

现在一切都清晰了：字段有名字，代码自解释。**这就是结构体的核心价值**——用有意义的名字让代码更易维护。

# 定义和实例化结构体

## 基本语法

定义结构体使用 `struct` 关键字，后跟结构体名和一对大括号，括号内列出**字段**（field）及其类型：

```rust runnable
struct User {
    name: String,
    email: String,
    age: u32,
    active: bool,
}

fn main() {
    // 创建一个实例
    let user1 = User {
        name: String::from("Alice"),
        email: String::from("alice@example.com"),
        age: 30,
        active: true,
    };

    println!("用户：{}, 邮箱：{}", user1.name, user1.email);
}
```

**几个要点：**
- 结构体名按惯例使用**大驼峰**（CapitalCase）
- 字段名按惯例使用**蛇形命名**（snake_case）
- 字段顺序在实例化时**可以不同**，因为用的是名字而不是位置
- 访问字段用**点号**（`.`）

## 修改字段值

只有当结构体实例是 `mut` 时，才能修改它的字段：

```rust runnable
struct User {
    name: String,
    email: String,
}

fn main() {
    let mut user1 = User {
        name: String::from("Alice"),
        email: String::from("alice@example.com"),
    };

    user1.email = String::from("newemail@example.com"); // ✓ 可以修改
    println!("新邮箱：{}", user1.email);
}
```

**重要：** Rust 不支持让结构体的部分字段可变，部分字段不可变。要么整个实例是 `mut`，要么都是不可变的。

### 嵌套结构体的可变性

`mut` 会沿路径**向下传递**，嵌套的字段也全部变为可变：

```rust runnable
struct Inner {
    value: i32,
}

struct Outer {
    inner: Inner,
    name: String,
}

fn main() {
    let mut outer = Outer {
        inner: Inner { value: 1 },
        name: String::from("test"),
    };

    outer.inner.value = 42;  // ✓ outer 是 mut，嵌套字段也可以改
    println!("inner.value = {}", outer.inner.value);
}
```

### 字段是 &mut 引用时

当字段本身是 `&mut T` 引用时，有一个微妙的区别——**通过引用修改数据**和**替换引用字段本身**是两回事：
（以下有一个'a 的语法，现在还没有学习过，这里可以暂时不用管它，后面会讲解，和现在讲解的内容无关）

<img src="/RustCourse/diagrams/data_ptr_mut.svg" alt="切片的原理" style="max-width:100%;margin:1rem 0;" />

```rust runnable
struct Wrapper<'a> {
    data_ptr: &'a mut i32,
}

fn main() {
    let mut x = 5;
    let w = Wrapper { data_ptr: &mut x };  // w 本身不是 mut

    *(w.data_ptr) = 10;  // ✓ 通过 &mut 引用修改数据，不需要 w 是 mut
    println!("x = {}", x);
}
```

<img src="/RustCourse/diagrams/w_mut.svg" alt="切片的原理" style="max-width:100%;margin:1rem 0;" />

```rust runnable expect-error
struct Wrapper<'a> {
    data_ptr: &'a mut i32,
}

fn main() {
    let mut x = 5;
    let mut y = 99;
    let w = Wrapper { data_ptr: &mut x };  // w 不是 mut

    w.data_ptr = &mut y;  // 错误！替换字段本身需要 w 是 mut
}
```

规律：
- w实例的`mut` 控制**能不能改这个字段引用的自身地址**
- data_ptr的`mut` 控制**能不能改这个字段引用指向的数据的值**

> 另外，这里 data_ptr 和 x、y 的可变性必须一致，也就是 data_ptr 如果是 mut，那么 x、y 也必须申请为 mut，不然会编译拦截

## 从函数返回结构体实例

结构体可以作为函数的返回值：

```rust runnable
struct User {
    name: String,
    email: String,
}

fn create_user(name: String, email: String) -> User {
    User {
        name: name,
        email: email,
    }
}

fn main() {
    let user = create_user(
        String::from("Bob"),
        String::from("bob@example.com"),
    );
    println!("用户 {} 已创建", user.name);
}
```

# 结构体的语法糖

## 字段初始化简写语法

当**函数参数名与结构体字段名相同**时，可以省略重复的 `field: field`：

```rust runnable
struct User {
    name: String,
    email: String,
}

// 普通写法
fn create_user_verbose(name: String, email: String) -> User {
    User {
        name: name,
        email: email,
    }
}

// 简写写法
fn create_user(name: String, email: String) -> User {
    User {
        name,     // 相当于 name: name
        email,    // 相当于 email: email
    }
}

fn main() {
    let user = create_user(
        String::from("Charlie"),
        String::from("charlie@example.com"),
    );
    println!("邮箱：{}", user.email);
}
```

这个简写在实际代码中非常常用。

## 结构体更新语法

有时你想基于一个已有的实例，创建一个新实例，但修改其中某些字段。**结构体更新语法**（`..`）让这个操作很简洁：

```rust runnable
struct User {
    name: String,
    email: String,
    age: u32,
}

fn main() {
    let user1 = User {
        name: String::from("Alice"),
        email: String::from("alice@example.com"),
        age: 30,
    };

    // 创建 user2，只改邮箱，其他字段复用 user1 的值
    let user2 = User {
        email: String::from("alice.new@example.com"),
        ..user1  // 用 user1 的其他字段填充
    };

    println!("user2 的名字：{}, 邮箱：{}", user2.name, user2.email);
}
```

**语法要点：**
- `..` 必须放在最后，表示"剩余字段用某个实例的对应字段填充"
- 可以显式指定某些字段，用 `..` 填充其他字段

> **关于所有权的警告**：结构体更新语法会转移没有被明确赋值的字段的所有权。在上面的例子中，`name` 是 `String`（非 Copy 类型），所以 `user1.name` 的所有权被转移到了 `user2`，之后不能再用 `user1.name`：
> ```rust runnable expect-error
> struct User {
>     name: String,
>     email: String,
> }
>
> fn main() {
>     let user1 = User {
>         name: String::from("Alice"),
>         email: String::from("alice@example.com"),
>     };
>
>     let user2 = User {
>         email: String::from("new@example.com"),
>         ..user1
>     };
>
>     println!("{}", user1.name);  // 错误！user1.name 已被转移
> }
> ```

有三种情况下，`user1` 的字段在更新语法后**仍然可用**：

```rust runnable
struct User {
    name: String,
    age: u32,
    email: String,
}

fn main() {
    let user1 = User {
        name: String::from("Alice"),
        age: 30,
        email: String::from("alice@example.com"),
    };

    // 情况一：字段被显式赋了新值，不会被转移
    let user2 = User {
        email: String::from("new@example.com"),
        ..user1
    };
    println!("{}", user1.email);  // ✓ email 被显式赋值了，不会转移

    // 情况二：字段是 Copy 类型，复制而非转移
    let user3 = User {
        name: String::from("Bob"),
        ..user2
    };
    println!("{}", user2.age);  // ✓ age 是 u32（Copy 类型），可以继续用

    // 情况三：对实例调用 clone，避免所有权转移
    let user4 = User {
        age: 35,
        ..user3.clone()  // 克隆整个实例，非 Copy 字段也被复制
    };
    println!("{}", user3.name);  // ✓ user3 已被 clone，原值仍可用
}
```

**关键点：**
1. **显式赋新值**——该字段不转移
2. **Copy 类型**（如 `u32`、`bool` 等）——自动复制，不转移
3. **`..user.clone()`**——克隆整个实例，所有字段都被复制

# 结构体与所有权

结构体是 **Copy** 还是 **Move** 类型，**完全取决于它的字段**：

- 如果**所有字段都是 Copy 类型**（如 `u32`、`bool`、`i32` 等），那么整个结构体自动是 Copy 类型
- 如果**任何一个字段是 Move 类型**（如 `String`），那么整个结构体就是 Move 类型

看一个对比：

```rust runnable
struct Point {
    x: i32,
    y: i32,  // 都是 Copy 类型
}

struct User {
    name: String,   // Move 类型
    age: u32,       // Copy 类型
}

fn main() {
    let p1 = Point { x: 10, y: 20 };
    let p2 = p1;  // ✓ Copy 结构体，p1 仍可用
    println!("{:?}", p1);

    let u1 = User {
        name: String::from("Alice"),
        age: 30,
    };
    let u2 = u1;  // Move 结构体，u1 的所有权转移到 u2
    // println!("{:?}", u1);  // ✗ 错误！u1 已被 move
}
```

**推论**：
- Copy 结构体赋值时复制所有数据，源变量仍可用
- Move 结构体赋值时转移所有权，源变量失效
- 这就是为什么在前面的例子中，`user1` 通过 `..user` 更新语法会失去 `name` 字段的所有权——因为 `User` 是 Move 类型（包含 String）

# 三种结构体形式

Rust 支持三种结构体定义方式。

## 1. 具名字段结构体（最常用）

就是我们一直在用的形式，字段都有名字：

```rust runnable
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 10, y: 20 };
    println!("点坐标：({}, {})", p.x, p.y);
}
```

## 2. 元组结构体

当你只关心字段**类型**而不需要给每个字段起名字时，可以用元组结构体。这在为了区分不同类型而创建"包装类型"时很有用：

```rust runnable
struct Color(u8, u8, u8);
struct Point(i32, i32, i32);

fn main() {
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);

    // 访问字段用索引（从 0 开始）
    println!("黑色的红通道：{}", black.0);
    println!("原点的 x 坐标：{}", origin.0);
}
```

**注意**：`Color` 和 `Point` 是**不同的类型**，即使它们的字段都是三个 `i32` 或 `u8`。这正是元组结构体的价值——让编译器区分具有不同语义的数据。

普通元组与元组结构体的区别：

- 普通元组：不用提前定义。属于“数据层面的临时拼凑”，追求的是快捷、高效。
- 元组结构体：必须提前定义。属于“面向对象/强类型的封装”，追求的是业务语义的明确、以及严苛的类型安全防线。

## 3. 类单元结构体（Unit-Like）

没有任何字段的结构体。看起来奇怪，但在与 trait 结合时很有用（后续章节会讲）：

```rust runnable
struct Marker;

fn main() {
    let m = Marker;
    println!("标记创建成功");
}
```

# 调试打印

在格式化输出一章我们讲解过自定义类型不能使用 `{}` 进行打印，现在我们再复习一下：默认 `println!` 用 `{}` 格式化器不支持结构体（因为如何显示没有统一的答案）。需要改用 `{:?}` 或 `{:#?}`：

```rust runnable expect-error
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect = Rectangle { width: 30, height: 50 };
    println!("{}", rect);  // 错误！无法用 {} 打印 Rectangle
}
```

解决办法是派生 `Debug` trait（目前你只需知道这个语法）：

```rust runnable
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect = Rectangle { width: 30, height: 50 };

    // 紧凑格式
    println!("矩形：{:?}", rect);

    // 漂亮打印（多行）
    println!("矩形：{:#?}", rect);
}
```

# 练习题

## 结构体基础测验

```rust
struct Book {
    title: String,
    author: String,
    pages: u32,
}
```

```quiz single
Q: 下列关于上面结构体定义的说法，正确的是？
- 结构体名应该用小驼峰，如 `book` 而不是 `Book`
+ 字段名按惯例用蛇形命名，如 `Book_Title`（虽然这里没用）
- 每个结构体定义必须有至少三个字段
- title 和 author 字段必须存储引用，不能存储 String
E: 结构体名遵循大驼峰惯例（Book），字段名遵循蛇形惯例。String 是拥有所有权的类型，完全可以作为结构体字段。
```

```quiz multi
Q: 下列哪些关于结构体实例化的说法是正确的？（多选）
- 字段初始化顺序必须与结构体定义中的顺序相同
+ 字段初始化顺序可以与定义顺序不同，因为用的是字段名
+ 使用 `mut` 可以让所有字段都可修改
- 可以只让某个字段可修改，其他字段不可修改
E: 由于使用字段名而非位置，初始化顺序不受限制（第一个说法是错的，第二个正确）。可变性作用于整个实例，不能部分可变。
```

```rust
struct User {
    name: String,
    email: String,
}

fn main() {
    let user1 = User {
        name: String::from("Alice"),
        email: String::from("alice@example.com"),
    };
}
```

```quiz single
Q: 如果要创建 user2，只改邮箱其他复用 user1，下面哪种写法正确？
- let user2 = User { email: "new@example.com", user1 };
+ let user2 = User { email: String::from("new@example.com"), ..user1 };
- let user2 = User { ..user1, email: String::from("new@example.com") };
- let user2 = { ..user1, email: String::from("new@example.com") };
E: 结构体更新语法是 `..instance`，必须放在最后。第二和第三选项中，只有第二个把 `..user1` 放在正确位置。
```

## 编程练习

### 练习 1：创建和修改结构体

定义一个 `Person` 结构体，包含 `name`（String）、`age`（u32）、`email`（String）三个字段。创建两个实例，修改其中一个的邮箱并打印两个实例的信息。

```rust editable
struct Person {
    // TODO: 定义三个字段
}

fn main() {
    // TODO: 创建 person1，name="Alice", age=28, email="alice@example.com"

    // TODO: 创建 person2，name="Bob", age=35, email="bob@example.com"

    // TODO: 修改 person2 的 email 为 "bob.new@example.com"

    // TODO: 打印两个实例（需要使用 {:?} 和 derive Debug）
}
```

```expected
Person { name: "Alice", age: 28, email: "alice@example.com" }
Person { name: "Bob", age: 35, email: "bob.new@example.com" }
```

### 练习 2：使用结构体更新语法

定义一个 `Config` 结构体，包含 `host`、`port` 和 `debug` 三个字段。创建一个默认配置，然后基于它创建两个变体（只改某个字段）。

```rust editable
struct Config {
    host: String,
    port: u16,
    debug: bool,
}

fn main() {
    let default_config = Config {
        host: String::from("localhost"),
        port: 8080,
        debug: false,
    };

    // TODO: 创建 dev_config，基于 default_config 但改 port 为 3000

    // TODO: 创建 prod_config，基于 default_config 但改 host 为 "0.0.0.0" 和 debug 为 true

    // TODO: 打印三个配置（需要派生 Debug）
}
```

```expected
Config { host: "localhost", port: 8080, debug: false }
Config { host: "localhost", port: 3000, debug: false }
Config { host: "0.0.0.0", port: 8080, debug: true }
```
