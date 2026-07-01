---
title: "实现命令"
description: "把 add、list、done、remove、search 五个命令逐一实现，把前两章写好的数据结构和持久化层连接成一个完整可用的 CLI 工具"
difficulty: intermediate
estimatedTime: 50
keywords: ["命令实现", "CRUD", "搜索", "迭代器", "错误处理", "CLI", "结构体方法"]
---

# 给 TodoStore 添加方法

## 设计思路

每条命令对应 `TodoStore` 的一个方法：

| 命令 | 方法 | 说明 |
|------|------|------|
| `add "内容"` | `add_todo(title)` | 新建任务，分配 ID |
| `list` | `all()` | 已在上一章实现 |
| `done <id>` | `mark_done(id)` | 找到并标记完成 |
| `remove <id>` | `remove_todo(id)` | 找到并删除 |
| `search "词"` | `search(query)` | 按关键词过滤标题 |

方法签名统一返回 `Result<返回值, String>`，让调用方统一处理错误。

## add_todo

```rust runnable
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Todo { pub id: u32, pub title: String, pub completed: bool }

struct TodoStore { todos: Vec<Todo> }

impl TodoStore {
    fn new() -> Self { TodoStore { todos: Vec::new() } }

    fn next_id(&self) -> u32 {
        self.todos.iter().map(|t| t.id).max().unwrap_or(0) + 1
    }

    pub fn add_todo(&mut self, title: String) -> &Todo {
        let id = self.next_id();
        self.todos.push(Todo { id, title, completed: false });
        // 返回刚刚添加的那条（Vec 末尾）
        self.todos.last().unwrap()
    }
}

fn main() {
    let mut store = TodoStore::new();
    let t1 = store.add_todo("写第一章".into());
    println!("添加：[{}] {}", t1.id, t1.title);

    let t2 = store.add_todo("写第二章".into());
    println!("添加：[{}] {}", t2.id, t2.title);

    println!("共 {} 条任务", store.todos.len());
}
```

`next_id()` 用迭代器找出当前最大 ID，加 1 作为新 ID。`unwrap_or(0)` 处理列表为空的情况（空列表没有最大值，从 1 开始）。

## mark_done

```rust runnable
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Todo { pub id: u32, pub title: String, pub completed: bool }

struct TodoStore { todos: Vec<Todo> }

impl TodoStore {
    fn new_with(todos: Vec<Todo>) -> Self { TodoStore { todos } }

    pub fn mark_done(&mut self, id: u32) -> Result<&Todo, String> {
        // 找到对应 ID 的任务（可变引用）
        let todo = self.todos.iter_mut()
            .find(|t| t.id == id)
            .ok_or_else(|| format!("找不到 ID 为 {} 的任务", id))?;

        if todo.completed {
            return Err(format!("任务 [{}] 已经完成了", id));
        }

        todo.completed = true;

        // 返回不可变引用（需要重新查找，因为上面的可变借用已经结束）
        Ok(self.todos.iter().find(|t| t.id == id).unwrap())
    }
}

fn main() {
    let mut store = TodoStore::new_with(vec![
        Todo { id: 1, title: "写代码".into(), completed: false },
        Todo { id: 2, title: "写文档".into(), completed: false },
    ]);

    match store.mark_done(1) {
        Ok(t)  => println!("已完成：[{}] {}", t.id, t.title),
        Err(e) => eprintln!("错误：{}", e),
    }

    match store.mark_done(99) {  // 不存在的 ID
        Ok(_)  => println!("完成"),
        Err(e) => eprintln!("错误：{}", e),  // 找不到 ID 为 99 的任务
    }

    match store.mark_done(1) {   // 重复完成
        Ok(_)  => println!("完成"),
        Err(e) => eprintln!("错误：{}", e),  // 任务 [1] 已经完成了
    }
}
```

`.ok_or_else(|| ...)` 把 `Option<T>` 转成 `Result<T, String>`——找不到就返回错误，`?` 自动传播。这是 `Option` → `Result` 转换的标准写法。

## remove_todo

```rust runnable
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Todo { pub id: u32, pub title: String, pub completed: bool }

struct TodoStore { todos: Vec<Todo> }

impl TodoStore {
    fn new_with(todos: Vec<Todo>) -> Self { TodoStore { todos } }

    pub fn remove_todo(&mut self, id: u32) -> Result<Todo, String> {
        // 找到对应 ID 的下标
        let pos = self.todos.iter()
            .position(|t| t.id == id)
            .ok_or_else(|| format!("找不到 ID 为 {} 的任务", id))?;

        // remove 通过下标删除并返回被删除的元素
        Ok(self.todos.remove(pos))
    }
}

fn main() {
    let mut store = TodoStore::new_with(vec![
        Todo { id: 1, title: "写代码".into(), completed: true },
        Todo { id: 2, title: "写文档".into(), completed: false },
    ]);

    match store.remove_todo(1) {
        Ok(t)  => println!("已删除：[{}] {}", t.id, t.title),
        Err(e) => eprintln!("错误：{}", e),
    }

    println!("剩余 {} 条任务", store.todos.len());
}
```

`Vec::position()` 返回满足条件的**下标**（而不是元素本身），`Vec::remove(pos)` 通过下标删除并把元素**移出**。注意 `remove_todo` 返回 `Todo`（所有权），让调用方能打印被删除的任务名。

## search

搜索是迭代器的典型用途——用 `.filter()` 筛选出标题包含关键词的任务：

```rust runnable
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Todo { pub id: u32, pub title: String, pub completed: bool }

struct TodoStore { todos: Vec<Todo> }

impl TodoStore {
    fn new_with(todos: Vec<Todo>) -> Self { TodoStore { todos } }

    /// 返回所有标题包含 query 的任务（大小写不敏感）
    pub fn search(&self, query: &str) -> Vec<&Todo> {
        let query_lower = query.to_lowercase();
        self.todos.iter()
            .filter(|t| t.title.to_lowercase().contains(&query_lower))
            .collect()
    }
}

fn main() {
    let store = TodoStore::new_with(vec![
        Todo { id: 1, title: "学习 Rust 所有权".into(), completed: false },
        Todo { id: 2, title: "写单元测试".into(), completed: true },
        Todo { id: 3, title: "复习 Rust 生命周期".into(), completed: false },
        Todo { id: 4, title: "阅读文档".into(), completed: false },
    ]);

    let results = store.search("rust");
    println!("搜索 \"rust\"，找到 {} 条：", results.len());
    for t in &results {
        println!("  [{}] {}", t.id, t.title);
    }
    // 找到 2 条（大小写不敏感）：
    //   [1] 学习 Rust 所有权
    //   [3] 复习 Rust 生命周期
}
```

**三个关键点：**

- `query.to_lowercase()` 先把关键词转小写，`t.title.to_lowercase()` 再把标题转小写，这样 `"rust"` 和 `"Rust"` 都能搜到
- `.filter(|t| ...)` 只保留条件为真的元素，不修改原列表
- 返回 `Vec<&Todo>` 而非 `Vec<Todo>`——不复制数据，只返回对原列表元素的引用

# 完整的命令分发

## 把 parse_args + TodoStore 接在一起

```rust
fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let command = parse_args(&args)?;

    let path = data_path();
    let mut store = TodoStore::load(path)?;

    match command {
        Command::Add(title) => {
            let todo = store.add_todo(title);
            println!("✓ 已添加：[{}] {}", todo.id, todo.title);
        }

        Command::List => {
            let todos = store.all();
            if todos.is_empty() {
                println!("暂无任务。使用 `rtodo add \"任务内容\"` 添加。");
            } else {
                println!("{:>4}  {:4}  {}", "ID", "状态", "任务");
                println!("{}", "─".repeat(40));
                for todo in todos {
                    let status = if todo.completed { "[✓]" } else { "[ ]" };
                    println!("{:>4}  {}   {}", todo.id, status, todo.title);
                }
            }
        }

        Command::Done(id) => {
            let todo = store.mark_done(id)?;
            println!("✓ 已完成：[{}] {}", todo.id, todo.title);
        }

        Command::Remove(id) => {
            let todo = store.remove_todo(id)?;
            println!("✓ 已删除：[{}] {}", todo.id, todo.title);
        }

        Command::Search(query) => {
            let results = store.search(&query);
            if results.is_empty() {
                println!("没有找到包含 \"{}\" 的任务。", query);
            } else {
                println!("搜索 \"{}\"，找到 {} 条：", query, results.len());
                println!("{}", "─".repeat(40));
                for todo in results {
                    let status = if todo.completed { "[✓]" } else { "[ ]" };
                    println!("{:>4}  {}   {}", todo.id, status, todo.title);
                }
            }
        }

        Command::Help => print_help(),
    }

    store.save()?;
    Ok(())
}

fn main() {
    if let Err(e) = run() {
        eprintln!("错误：{}", e);
        std::process::exit(1);
    }
}
```

**`run()` 函数的设计模式**：把所有逻辑放进 `run() -> Result<(), String>`，`main` 只负责处理最外层的错误。这样 `run` 内部可以大量使用 `?` 而不用每次都写 `match`，代码更简洁。

## 帮助信息

```rust
fn print_help() {
    println!(
        "rtodo — 命令行任务管理器\n\
        \n\
        用法：\n\
        \n\
        rtodo add \"任务内容\"    添加新任务\n\
        rtodo list               列出所有任务\n\
        rtodo done <id>          标记任务完成\n\
        rtodo remove <id>        删除任务\n\
        rtodo search \"关键词\"   搜索标题包含关键词的任务\n\
        rtodo help               显示本帮助"
    );
}
```

## 现在可以运行了

把以上所有代码整合到 `src/main.rs`，然后：

```bash
# 编译并运行
cargo run -- add "写完数据建模章节"
cargo run -- add "写完持久化章节"
cargo run -- list
cargo run -- search "持久"
cargo run -- done 1
cargo run -- remove 1

# 安装到系统（编译 release 版本，放到 PATH）
cargo install --path .
rtodo add "现在用原生命令了！"
```

第一次运行后，`~/.rtodo.json` 文件就出现了，任务在其中持久保留。

## 本章小结与练习

**本章完成的事：**
- 为 `TodoStore` 实现了 `add_todo`、`mark_done`、`remove_todo`
- 用 `.find()` + `.ok_or_else()` 做"查找或报错"的标准模式
- 用 `run() -> Result` + `main` 处理错误的分层设计
- 整合三章的代码，得到一个可以实际安装使用的工具

**练习：**

添加 `clear` 命令，删除所有已完成的任务：

1. 在 `TodoStore` 里实现 `clear_completed(&mut self) -> usize`，返回被删除的数量
2. 提示：用 `Vec::retain(|t| !t.completed)` 保留未完成的，删除其余的
3. 在命令分发里加上 `Command::Clear` 分支，打印"已清除 N 条已完成任务"
