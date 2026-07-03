---
title: "体验优化"
description: "改善错误信息、输出格式、Display trait 和彩色输出，让工具用起来更舒服"
difficulty: intermediate
estimatedTime: 30
keywords: ["体验优化", "错误信息", "format", "对齐", "Display", "crossterm", "彩色输出"]
---

# 改善错误信息

上一章的错误信息使用了固定字符串，比如：

```rust
.map_err(|_| "任务 ID 无效".to_string())?;
```

用户看到的错误是：

```text
错误: 任务 ID 无效
```

不知道是哪个输入出了问题。改用 `format!` 把具体的输入值显示出来，打开 `rtodo/src/lib.rs`，把 `parse_args` 里的错误信息更新：

```rust
// rtodo/src/lib.rs — parse_args() 内，替换 done/remove/_ 分支
[cmd, id] if cmd == "done" => {
    let id: u32 = id.parse()
        .map_err(|_| format!("'{}' 不是有效的任务 ID", id))?;
    Ok(Command::Done(id))
}

[cmd, id] if cmd == "remove" => {
    let id: u32 = id.parse()
        .map_err(|_| format!("'{}' 不是有效的任务 ID", id))?;
    Ok(Command::Remove(id))
}

_ => Err(format!("未知命令：{}", args.join(" "))),
```

现在用户看到的错误是：

```text
错误: 'abc' 不是有效的任务 ID
```

立刻知道是哪个输入出了问题。**把导致错误的具体值显示出来**，是写错误信息的基本原则。

同理在 `add` 分支里加上空标题检查：

```rust
// rtodo/src/lib.rs — parse_args() 内，替换 add 分支
[cmd, title] if cmd == "add" => {
    if title.is_empty() {
        Err("任务内容不能为空".to_string())
    } else {
        Ok(Command::Add(title.clone()))
    }
}
```

这里不需要 `format!`，因为空字符串本身就是问题，没有需要显示的"具体值"。

# 改善输出格式

## ID 对齐

当任务数量超过 9 条，ID 有 1 位和 2 位混用，列表看起来会错位。用 `{:>4}` 把 ID 右对齐到固定宽度 4。

在 `rtodo/src/lib.rs` 的 `execute` 函数里，更新 `Command::List` 分支：

```rust
// rtodo/src/lib.rs — execute() 内，替换 Command::List 分支
Command::List => {
    let todos = list.all();
    if todos.is_empty() {
        println!("暂无任务");
    } else {
        println!("{:>4}  {}  {}", "ID", "状态", "任务");
        println!("{}", "─".repeat(32));
        for todo in todos {
            let status = if todo.completed { "[x]" } else { "[ ]" };
            println!("{:>4}  {}  {}", todo.id, status, todo.title);
        }
    }
}
```

`{:>4}` 表示右对齐、宽度 4，无论 ID 是 1 位还是 2 位，都会填充空格到相同宽度，列表整齐对齐。

`Command::Search` 分支的打印做同样的更新：

```rust
// rtodo/src/lib.rs — execute() 内，替换 Command::Search 分支
Command::Search(query) => {
    let results = list.search(&query);
    if results.is_empty() {
        println!("没有找到包含 \"{}\" 的任务", query);
    } else {
        println!("搜索 \"{}\"，找到 {} 条：", query, results.len());
        println!("{}", "─".repeat(32));
        for todo in results {
            let status = if todo.completed { "[x]" } else { "[ ]" };
            println!("{:>4}  {}  {}", todo.id, status, todo.title);
        }
    }
}
```

## 完成的反馈

`Done` 分支目前只打印 ID，不够直观。更好的方式是同时显示任务标题。最简单的方案是修改 `mark_done` 的返回值，把完成后的标题一并返回。

打开 `rtodo-core/src/lib.rs`，把签名改成返回标题：

```rust
// rtodo-core/src/lib.rs — impl TodoList 内，替换 mark_done
pub fn mark_done(&mut self, id: u32) -> Result<String, String> {
    let todo = self.todos.iter_mut()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("找不到 ID {} 的任务", id))?;

    if todo.completed {
        return Err(format!("任务 [{}] 已经完成了", id));
    }

    todo.completed = true;
    Ok(todo.title.clone())
}
```

返回 `String`（标题的克隆），调用方就能打印出来。回到 `rtodo/src/lib.rs`，更新 `Done` 分支：

```rust
// rtodo/src/lib.rs — execute() 内，替换 Command::Done 分支
Command::Done(id) => {
    let title = list.mark_done(id)?;
    println!("已完成：[{}] {}", id, title);
}
```

## 编译验证

```bash
cargo build
cargo run -p rtodo -- add "测试对齐效果"
cargo run -p rtodo -- list
cargo run -p rtodo -- done abc
```

最后一条命令应该输出：`错误: 'abc' 不是有效的任务 ID`。

# 规范化输出

## 当前的问题

`list` 和 `search` 分支里打印任务的格式字符串各写了一份，将来如果要改格式（比如加创建时间），两处都要改，容易遗漏。

更好的做法是让 `Todo` 自己知道怎么打印自己——实现 `fmt::Display` trait。

## 为 Todo 实现 Display

`fmt::Display` 对应的是 `println!("{}", value)` 这种打印方式。在 `rtodo-core/src/lib.rs` 顶部加上 `use std::fmt`，然后在 `impl Todo` 后添加：

```rust
// rtodo-core/src/lib.rs — 文件顶部加 use std::fmt，impl Todo 之后添加
use std::fmt;

impl fmt::Display for Todo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let status = if self.completed { "[✓]" } else { "[ ]" };
        write!(f, "{:>4}  {}  {}", self.id, status, self.title)
    }
}
```

`fmt` 方法接收一个 `Formatter`，用 `write!(f, ...)` 向它写入格式化内容。`{:>4}` 右对齐 ID，格式集中在一处统一管理。

## 更新 execute 里的打印

回到 `rtodo/src/lib.rs`，把 `list` 和 `search` 分支里手写的格式字符串替换为直接打印 `todo`：

```rust
// rtodo/src/lib.rs — execute() 内，替换 Command::List 和 Command::Search 分支
Command::List => {
    let todos = list.all();
    if todos.is_empty() {
        println!("暂无任务。使用 `rtodo add \"任务内容\"` 添加。");
    } else {
        println!("{:>4}  {:3}  {}", "ID", "状态", "任务");
        println!("{}", "─".repeat(32));
        for todo in todos {
            println!("{}", todo);
        }
    }
}

Command::Search(query) => {
    let results = list.search(&query);
    if results.is_empty() {
        println!("没有找到包含 \"{}\" 的任务。", query);
    } else {
        println!("搜索 \"{}\"，找到 {} 条：", query, results.len());
        println!("{}", "─".repeat(32));
        for todo in results {
            println!("{}", todo);
        }
    }
}
```

打印逻辑从各分支里消失，格式改动只需要修改 `Display` 实现。

# 添加彩色输出

## 引入 crossterm

纯文字输出已经可用，但视觉上缺乏层次。让已完成的任务用绿色显示，能快速区分任务状态。

在 `rtodo/Cargo.toml` 的 `[dependencies]` 里添加：

```toml
# rtodo/Cargo.toml — [dependencies] 部分添加
[dependencies]
rtodo-core = { path = "../rtodo-core" }
crossterm = "0.28"
```

## 封装打印辅助函数

在 `rtodo/src/lib.rs` 顶部加上引入，再添加几个打印辅助函数：

```rust
// rtodo/src/lib.rs — 文件顶部添加
use crossterm::style::Stylize;
use rtodo_core::{Todo, TodoList, data_path};
```

```rust
// rtodo/src/lib.rs — execute() 之后添加
fn print_todo(todo: &Todo) {
    let id_str = format!("{:>4}", todo.id);
    if todo.completed {
        println!("{}  [✓]  {}", id_str.green(), todo.title.as_str().dark_grey());
    } else {
        println!("{}  [ ]  {}", id_str, todo.title);
    }
}
```

已完成的任务 ID 显示为绿色、标题显示为深灰，给人一种"已归档"的视觉感；未完成的正常显示。

## 更新 execute 使用颜色

把 `Command::List` 分支里的 `println!("{}", todo)` 替换为 `print_todo(todo)`，同时加一行统计信息：

```rust
// rtodo/src/lib.rs — execute() 内，替换 Command::List 分支（带颜色版本）
Command::List => {
    let todos = list.all();
    if todos.is_empty() {
        println!("{}", "暂无任务。使用 `rtodo add \"任务内容\"` 添加。".dark_grey());
    } else {
        let total = todos.len();
        let done = todos.iter().filter(|t| t.completed).count();

        println!("{:>4}  {:3}  {}", "ID".bold(), "状态".bold(), "任务".bold());
        println!("{}", "─".repeat(32));
        for todo in todos {
            print_todo(todo);
        }
        println!("{}", "─".repeat(32));
        println!(
            "共 {}，已完成 {}，未完成 {}",
            total.to_string().bold(),
            done.to_string().green(),
            (total - done).to_string().yellow()
        );
    }
}
```

# 可选扩展

`rtodo` 现在已经是一个完整可用的工具。如果想继续，以下方向可以进一步扩展：

**功能扩展：**
- `rtodo clear` — 清除所有已完成的任务
- `rtodo list --done` / `--pending` — 按状态过滤
- `rtodo edit <id> "新标题"` — 修改任务标题
- 给 `Todo` 加 `created_at` 字段，按创建时间排序

**工程化扩展：**
- 把代码拆成模块（`src/todo.rs`、`src/store.rs`、`src/cli.rs`）
- 用 `clap` crate 替代手写参数解析，自动生成 `--help` 和更复杂的参数格式
- 在 `tests/` 目录添加集成测试，模拟完整命令调用流程

## 本章总结

`rtodo` 用到的 Rust 知识汇总：

| 章节 | 用在了哪里 |
|------|-----------|
| 结构体与枚举 | `Todo`、`Command`、`TodoList` |
| 所有权与借用 | `&Todo`（只读引用）vs `Todo`（移交所有权），`&mut self` 修改方法 |
| 错误处理 | `Result<_, String>`、`?`、`.map_err()`、`.ok_or_else()` |
| 迭代器 | `.find()`、`.position()`、`.filter()`、`.count()`、`.max()` |
| `fmt::Display` | 统一的任务打印格式 |
| serde | `#[derive(Serialize, Deserialize)]` 自动生成 JSON 读写 |
| 文件 I/O | `fs::read_to_string`、`fs::write` |
| 单元测试 | `#[cfg(test)]`、`#[test]`、`assert_eq!`、`assert!`、`matches!` |
