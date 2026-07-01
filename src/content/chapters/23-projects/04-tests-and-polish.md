---
title: "输出与测试"
description: "用 Display trait 规范化输出格式，用彩色终端提升体验，再为核心逻辑编写单元测试，确保 CRUD 操作的正确性"
difficulty: intermediate
estimatedTime: 40
keywords: ["Display", "单元测试", "彩色输出", "crossterm", "测试驱动", "格式化"]
---

# 规范化输出

## 为 Todo 实现 Display

目前打印任务用的是 `format!("[{}] {}", todo.id, todo.title)`，散落在各处。用 `fmt::Display` 把格式统一管理：

```rust runnable
use std::fmt;

#[derive(Debug)]
struct Todo { id: u32, title: String, completed: bool }

impl fmt::Display for Todo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let status = if self.completed { "[✓]" } else { "[ ]" };
        write!(f, "{:>4}  {}  {}", self.id, status, self.title)
    }
}

fn main() {
    let todos = vec![
        Todo { id: 1, title: "写完第一章".into(), completed: true },
        Todo { id: 2, title: "写完第二章".into(), completed: false },
        Todo { id: 10, title: "复习所有权".into(), completed: false },
    ];

    // 打印表头
    println!("{:>4}  {:3}  {}", "ID", "状态", "任务");
    println!("{}", "─".repeat(36));

    for todo in &todos {
        println!("{}", todo); // 直接用 Display
    }
}
```

实现了 `Display` 之后，所有打印任务的地方都变成了 `println!("{}", todo)`——一致且干净。

## 用 crossterm 添加颜色

让已完成的任务显示为绿色删除线效果，未完成的正常显示，错误信息显示为红色：

```rust
use crossterm::style::Colorize;

fn print_todo(todo: &Todo) {
    let id_str = format!("{:>4}", todo.id);
    if todo.completed {
        // 已完成：绿色显示
        println!("{}  [✓]  {}", id_str.green(), todo.title.dark_grey());
    } else {
        println!("{}  [ ]  {}", id_str, todo.title);
    }
}

fn print_success(msg: &str) {
    println!("{}", msg.green());
}

fn print_error(msg: &str) {
    eprintln!("{}", msg.red());
}
```

在 `run()` 函数里替换之前的 `println!` 为这些辅助函数，输出立刻变得更清晰。

## 完整的 list 输出

```rust
fn print_list(todos: &[Todo]) {
    if todos.is_empty() {
        println!("{}", "暂无任务。使用 `rtodo add \"任务内容\"` 开始吧。".dark_grey());
        return;
    }

    let total = todos.len();
    let done = todos.iter().filter(|t| t.completed).count();

    // 表头
    println!("{:>4}  {:3}  {}", "ID".bold(), "状态".bold(), "任务".bold());
    println!("{}", "─".repeat(40));

    // 任务行
    for todo in todos {
        print_todo(todo);
    }

    // 统计
    println!("{}", "─".repeat(40));
    println!(
        "共 {} 条，已完成 {}，未完成 {}",
        total.to_string().bold(),
        done.to_string().green(),
        (total - done).to_string().yellow()
    );
}
```

# 单元测试

## 为什么要测试

你已经手动运行过 `cargo run -- add ...`，看到了输出。但手动测试有局限：
- 每次修改代码都要重新手动验证
- 边界情况容易忽略（比如 `remove` 不存在的 ID）
- 难以测试所有组合

**单元测试**让你一次写好，之后每次 `cargo test` 都自动跑。

## 测试 add_todo

```rust
// 测试放在 src/main.rs 或 src/lib.rs 的末尾
#[cfg(test)]
mod tests {
    use super::*;

    fn empty_store() -> TodoStore {
        // 用一个不存在的路径初始化，避免测试读写真实文件
        TodoStore { path: "/tmp/test_rtodo_nonexistent.json".into(), todos: vec![] }
    }

    #[test]
    fn test_add_single_todo() {
        let mut store = empty_store();
        let todo = store.add_todo("第一条任务".into());
        assert_eq!(todo.id, 1);
        assert_eq!(todo.title, "第一条任务");
        assert!(!todo.completed);
    }

    #[test]
    fn test_add_multiple_todos_increments_id() {
        let mut store = empty_store();
        store.add_todo("任务A".into());
        store.add_todo("任务B".into());
        let t = store.add_todo("任务C".into());
        assert_eq!(t.id, 3); // ID 自增
    }

    #[test]
    fn test_add_returns_reference_to_added_todo() {
        let mut store = empty_store();
        store.add_todo("先有的任务".into());
        let new_todo = store.add_todo("新任务".into());
        assert_eq!(new_todo.title, "新任务");
        assert_eq!(store.all().len(), 2);
    }
}
```

## 测试 mark_done

```rust
    #[test]
    fn test_mark_done_existing_todo() {
        let mut store = empty_store();
        store.add_todo("待完成的任务".into());

        let result = store.mark_done(1);
        assert!(result.is_ok());
        assert!(store.all()[0].completed);
    }

    #[test]
    fn test_mark_done_nonexistent_id_returns_error() {
        let mut store = empty_store();
        store.add_todo("某任务".into());

        let result = store.mark_done(99); // 不存在的 ID
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("99"));
    }

    #[test]
    fn test_mark_done_already_completed_returns_error() {
        let mut store = empty_store();
        store.add_todo("任务".into());
        store.mark_done(1).unwrap();

        let second_done = store.mark_done(1); // 重复完成
        assert!(second_done.is_err());
    }
```

## 测试 remove_todo

```rust
    #[test]
    fn test_remove_existing_todo() {
        let mut store = empty_store();
        store.add_todo("要删除的任务".into());
        store.add_todo("保留的任务".into());

        let removed = store.remove_todo(1);
        assert!(removed.is_ok());
        assert_eq!(removed.unwrap().id, 1);
        assert_eq!(store.all().len(), 1);       // 剩下 1 条
        assert_eq!(store.all()[0].id, 2);       // 剩下的是 ID=2
    }

    #[test]
    fn test_remove_nonexistent_id_returns_error() {
        let mut store = empty_store();
        let result = store.remove_todo(42);
        assert!(result.is_err());
    }
```

## 测试 search

```rust
    #[test]
    fn test_search_case_insensitive() {
        let mut store = empty_store();
        store.add_todo("学习 Rust 所有权".into());
        store.add_todo("写单元测试".into());
        store.add_todo("复习 rust 生命周期".into());

        // "rust" 应该同时匹配 "Rust" 和 "rust"
        let results = store.search("rust");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_search_no_match_returns_empty() {
        let mut store = empty_store();
        store.add_todo("写代码".into());
        store.add_todo("写文档".into());

        let results = store.search("不存在的关键词");
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_returns_references_not_copies() {
        let mut store = empty_store();
        store.add_todo("Rust 编程".into());

        let results = store.search("Rust");
        // 返回的是引用，id 和 title 应该和原始数据一致
        assert_eq!(results[0].id, 1);
        assert_eq!(results[0].title, "Rust 编程");
    }
```

运行测试：

```bash
cargo test

# 只运行特定测试
cargo test test_mark_done

# 显示 println! 输出（默认被捕获）
cargo test -- --nocapture
```

# 可选扩展

完成以上 4 篇的内容后，`rtodo` 已经是一个完整可用的工具。如果你想继续深入，以下方向可以进一步扩展：

**功能扩展：**
- `rtodo clear` — 清除所有已完成的任务（上一章的练习）
- `rtodo list --all`/`--done`/`--pending` — 按完成状态过滤
- `rtodo edit <id> "新标题"` — 修改任务标题
- 支持任务优先级（给 `Todo` 加 `priority: u8` 字段）

**工程化扩展：**
- 把代码拆成模块（`src/todo.rs`、`src/store.rs`、`src/cli.rs`）
- 用 `clap` crate 替代手写参数解析，支持 `--help` 和更复杂的参数格式
- 添加集成测试（在 `tests/` 目录），模拟完整命令调用流程

## 本章总结

恭喜你完成了本章！回顾一下 `rtodo` 用到的 Rust 知识：

| 章节 | 用在了哪里 |
|------|-----------|
| 结构体与枚举 | `Todo`、`Command`、`TodoStore` |
| 所有权与借用 | `&Todo`（引用）vs `Todo`（所有权），`mark_done` 返回引用 |
| 错误处理 | `Result<_, String>`、`?`、`.map_err()` |
| 迭代器 | `.find()`、`.position()`、`.filter()`、`.count()`、`.max()` |
| `fmt::Display` | 统一的任务输出格式 |
| serde | `#[derive(Serialize, Deserialize)]` 自动生成 JSON 读写 |
| 文件 I/O | `fs::read_to_string`、`fs::write` |
| 单元测试 | `#[test]`、`assert_eq!`、`assert!` |

从空项目到可以 `cargo install` 安装的实用工具——这正是 Rust 的日常工程实践。
