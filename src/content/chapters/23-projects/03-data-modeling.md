---
title: "数据建模"
description: "设计 Todo 结构体和任务列表，规划好所有操作方法的函数签名，再逐步填入实现"
difficulty: intermediate
estimatedTime: 30
keywords: ["数据建模", "结构体", "Vec", "TDD", "方法签名", "impl"]
---

# 设计 Todo 结构体

一条任务需要存储哪些数据？从上一章的命令设计反推：

- `done 1`、`remove 2` 需要通过 ID 找到任务 → 需要**唯一 ID**
- `add "写代码"` 需要存储标题 → 需要**标题**
- `list` 需要显示完成状态 → 需要**是否完成**

把这三个属性翻译成 Rust 结构体。打开 `rtodo-core/src/lib.rs`，把默认内容删掉，写入：

```rust
// rtodo-core/src/lib.rs — 把默认内容删掉，写入以下代码
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
}
```

`id` 用 `u32` 因为任务 ID 不会是负数。字段和结构体都加 `pub`，让 `rtodo` bin crate 能访问。

新建任务时 `completed` 总是 `false`，用一个关联函数封装这个约定，调用方就不需要每次手写 `completed: false`：

```rust
// rtodo-core/src/lib.rs — Todo 定义之后写入
impl Todo {
    pub fn new(id: u32, title: String) -> Self {
        Todo { id, title, completed: false }
    }
}
```

# 定义任务列表结构体

任务列表就是一组 `Todo`，用 `Vec<Todo>` 存储。把它封装进一个结构体 `TodoList`：

```rust
// rtodo-core/src/lib.rs — impl Todo 之后写入
pub struct TodoList {
    todos: Vec<Todo>,
}
```

`todos` 是私有字段，外部不能直接操作 Vec，只能通过方法访问。这样可以保证所有改动都经过我们定义的方法，不会绕过。

直接用 `Vec<Todo>` 完全可以跑通，但包一层结构体有好处：所有操作都挂在 `TodoList` 的方法上，调用方只和 `list` 打交道；下一章要加 `path` 字段时，也不需要改任何调用方的代码。

# 规划方法签名

在写具体实现之前，先把所有方法的签名（函数名、参数、返回值）规划好，填 `todo!()` 占位。这样可以先验证接口设计合不合理，再去填逻辑。

在 `rtodo-core/src/lib.rs` 里添加：

```rust
// rtodo-core/src/lib.rs — TodoList 定义之后写入（含全部 todo!() 占位）
impl TodoList {
    /// 创建空任务列表
    pub fn new() -> Self {
        TodoList { todos: Vec::new() }
    }

    /// 返回所有任务的只读切片
    pub fn all(&self) -> &[Todo] {
        todo!()
    }

    /// 添加新任务，返回刚添加那条的引用（用于打印确认信息）
    pub fn add(&mut self, title: String) -> &Todo {
        todo!()
    }

    /// 将指定 ID 的任务标记为完成；ID 不存在或已完成时返回错误
    pub fn mark_done(&mut self, id: u32) -> Result<(), String> {
        todo!()
    }

    /// 删除指定 ID 的任务并返回它；ID 不存在时返回错误
    pub fn remove(&mut self, id: u32) -> Result<Todo, String> {
        todo!()
    }

    /// 搜索标题包含 query 的任务（大小写不敏感），返回引用列表
    pub fn search(&self, query: &str) -> Vec<&Todo> {
        todo!()
    }

    /// 生成下一个可用 ID（当前最大 ID + 1，空列表时返回 1）
    fn next_id(&self) -> u32 {
        todo!()
    }
}
```

`todo!()` 是 Rust 内置宏，表示"这里还没实现"，编译能通过，运行时会 panic 并打印位置信息。先把骨架写出来，再逐个填逻辑，不会被细节打断思路。

每个方法的设计思路：

**`all()`**：返回 `&[Todo]` 切片引用，不是 `Vec<Todo>`。切片是对内部数据的只读视图，调用方能遍历，但不能直接增删元素。

**`add()`**：接受 `String`（拥有所有权），返回 `&Todo`（刚添加那条的引用）。返回引用而不是 `()` 是为了让调用方能打印"已添加：[1] 写代码"。

**`mark_done()`**：返回 `Result<(), String>`——标记完成后调用方只需要知道成功了，不需要拿到任务数据。

**`remove()`**：返回 `Result<Todo, String>`，而不是 `Result<&Todo, String>`——删除后元素从 Vec 里移出，所有权交给调用方，引用就无处指向了，所以必须返回所有权。

**`search()`**：返回 `Vec<&Todo>`，只传递引用，不复制数据。

**`next_id()`**：私有方法，只给 `add()` 内部用，不加 `pub`。

## 编译验证

```bash
cargo build
```

用 `todo!()` 占位后编译依然能通过，说明接口设计没有类型错误。下一章用 TDD 逐个填入实现。
