---
title: "接入 run 函数"
description: "把 TodoList 和 parse_args 连接成完整的命令分发逻辑，用 TDD 驱动 execute 函数的实现"
difficulty: intermediate
estimatedTime: 20
keywords: ["命令分发", "run函数", "execute", "TDD", "cargo run"]
---

# 提取 execute 函数

`run()` 目前的结构是：读参数 → 解析 → 执行。"执行"这一步涉及所有业务逻辑，也是最需要测试的部分。但 `run()` 本身直接调用 `std::env::args()`，测试时无法控制输入，不能直接测试。

解决办法是把"执行"单独提取成一个函数：

```text
run()
  ├── 读取 args（std::env::args）
  ├── parse_args(&args)  ← 上一章已测过
  └── execute(command, &mut list)  ← 这里放分发逻辑，可以独立测试
```

`execute` 接受一个已经解析好的 `Command` 和一个可变的 `TodoList`，在 `rtodo/src/lib.rs` 里规划好签名，先用 `todo!()` 占位：

```rust
// rtodo/src/lib.rs — run() 定义之后添加
fn execute(command: Command, list: &mut TodoList) -> Result<(), String> {
    todo!()
}
```

同时把 `run()` 里的 `todo!()` 替换成调用结构，先只读参数：

```rust
// rtodo/src/lib.rs — 替换 run() 中的 todo!()
pub fn run() -> Result<(), String> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let command = parse_args(&args)?;
    let mut list = TodoList::new();
    execute(command, &mut list)
}
```

还需要在文件顶部引入 `TodoList`：

```rust
// rtodo/src/lib.rs — 文件顶部，替换原有 use
use rtodo_core::TodoList;
```

骨架建好后先编译，确认类型没问题：

```bash
cargo build
```

# 先写测试

在 `rtodo/src/lib.rs` 里已有一个 `mod tests`（上一章 `parse_args` 的测试在那里）。把 `execute` 的测试追加到**同一个** `mod tests` 里，不要新建：

```rust
// rtodo/src/lib.rs — 已有的 mod tests 内，追加以下测试函数
    #[test]
    fn test_execute_add() {
        let mut list = TodoList::new();
        execute(Command::Add("写代码".to_string()), &mut list).unwrap();
        assert_eq!(list.all().len(), 1);
        assert_eq!(list.all()[0].title, "写代码");
    }

    #[test]
    fn test_execute_done() {
        let mut list = TodoList::new();
        list.add("任务".to_string());
        execute(Command::Done(1), &mut list).unwrap();
        assert!(list.all()[0].completed);
    }

    #[test]
    fn test_execute_done_not_found() {
        let mut list = TodoList::new();
        assert!(execute(Command::Done(99), &mut list).is_err());
    }

    #[test]
    fn test_execute_remove() {
        let mut list = TodoList::new();
        list.add("任务".to_string());
        execute(Command::Remove(1), &mut list).unwrap();
        assert_eq!(list.all().len(), 0);
    }

    #[test]
    fn test_execute_remove_not_found() {
        let mut list = TodoList::new();
        assert!(execute(Command::Remove(99), &mut list).is_err());
    }

    #[test]
    fn test_execute_list_and_search_ok() {
        let mut list = TodoList::new();
        list.add("学习 Rust".to_string());
        assert!(execute(Command::List, &mut list).is_ok());
        assert!(execute(Command::Search("Rust".to_string()), &mut list).is_ok());
    }
```

把这六个测试函数写在已有 `mod tests` 的**闭合 `}` 之前**，不要在文件末尾再新建一个 `mod tests`——同一个文件里不能有两个同名模块。

运行，所有测试因 `todo!()` 而失败：

```bash
cargo test -p rtodo
```

先红后绿——下面填实现。

# 实现 execute

把 `execute` 里的 `todo!()` 替换成 `match command`。`match` 必须覆盖 `Command` 的**所有**变体，漏掉任何一个编译器都会报错——这是枚举的核心保障。

下面逐个分支填入，最后合并成完整函数。

## Add 分支

`Command::Add(title)` 解构出任务标题，调用 `list.add()` 添加，再打印确认信息：

```rust
Command::Add(title) => {
    let todo = list.add(title);
    println!("已添加：[{}] {}", todo.id, todo.title);
}
```

`list.add(title)` 返回 `&Todo`（刚添加那条的引用），直接用来打印 ID 和标题，调用方不需要再去列表里查一次。

## List 分支

`Command::List` 没有附带数据，直接取出所有任务打印：

```rust
Command::List => {
    let todos = list.all();
    if todos.is_empty() {
        println!("暂无任务");
    } else {
        for todo in todos {
            let status = if todo.completed { "[x]" } else { "[ ]" };
            println!("[{}] {} {}", todo.id, status, todo.title);
        }
    }
}
```

`list.all()` 返回 `&[Todo]` 切片，直接 `for todo in todos` 迭代。`completed` 用三元表达式转成字符标记：`[x]` 表示已完成，`[ ]` 表示未完成。空列表单独判断，避免打印什么都没有的情况。

## Done 分支

```rust
Command::Done(id) => {
    list.mark_done(id)?;
    println!("已完成 {}", id);
}
```

`mark_done` 返回 `Result<(), String>`，成功时得到 `()`，只需要打印 ID，不需要任务数据。`?` 把找不到任务或已经完成的错误直接传出 `execute`，最终由 `main()` 打印。

## Remove 分支

```rust
Command::Remove(id) => {
    let todo = list.remove(id)?;
    println!("已删除：[{}] {}", todo.id, todo.title);
}
```

`remove` 返回 `Result<Todo, String>`——把元素从 Vec 里移出，所有权交给 `todo`。删除后用 `todo` 打印确认信息，用户能看到删的是哪条，操作更直观。

## Search 分支

```rust
Command::Search(query) => {
    let results = list.search(&query);
    if results.is_empty() {
        println!("没有找到包含 \"{}\" 的任务", query);
    } else {
        for todo in results {
            let status = if todo.completed { "[x]" } else { "[ ]" };
            println!("[{}] {} {}", todo.id, status, todo.title);
        }
    }
}
```

`search` 返回 `Vec<&Todo>`，元素是对 `list` 内部数据的引用，不复制数据。搜索结果为空时把关键词也带进提示，用户知道搜的是什么。

## Help 分支

```rust
Command::Help => print_help(),
```

委托给独立函数，`execute` 本身不含帮助文本，便于日后单独修改。

## 合并写入

五个分支都理解清楚后，把 `execute` 完整写入文件：

```rust
// rtodo/src/lib.rs — 替换 execute() 中的 todo!()
fn execute(command: Command, list: &mut TodoList) -> Result<(), String> {
    match command {
        Command::Add(title) => {
            let todo = list.add(title);
            println!("已添加：[{}] {}", todo.id, todo.title);
        }

        Command::List => {
            let todos = list.all();
            if todos.is_empty() {
                println!("暂无任务");
            } else {
                for todo in todos {
                    let status = if todo.completed { "[x]" } else { "[ ]" };
                    println!("[{}] {} {}", todo.id, status, todo.title);
                }
            }
        }

        Command::Done(id) => {
            list.mark_done(id)?;
            println!("已完成 {}", id);
        }

        Command::Remove(id) => {
            let todo = list.remove(id)?;
            println!("已删除：[{}] {}", todo.id, todo.title);
        }

        Command::Search(query) => {
            let results = list.search(&query);
            if results.is_empty() {
                println!("没有找到包含 \"{}\" 的任务", query);
            } else {
                for todo in results {
                    let status = if todo.completed { "[x]" } else { "[ ]" };
                    println!("[{}] {} {}", todo.id, status, todo.title);
                }
            }
        }

        Command::Help => print_help(),
    }

    Ok(())
}
```

再跑一次测试，确认全绿：

```bash
cargo test -p rtodo
```

在 `execute` 之后添加 `print_help`：

```rust
// rtodo/src/lib.rs — execute() 之后添加
fn print_help() {
    println!("rtodo — 命令行任务管理器");
    println!();
    println!("用法：");
    println!("  rtodo add \"任务内容\"    添加新任务");
    println!("  rtodo list               列出所有任务");
    println!("  rtodo done <id>          标记任务完成");
    println!("  rtodo remove <id>        删除任务");
    println!("  rtodo search \"关键词\"   搜索任务");
    println!("  rtodo help               显示本帮助");
}
```

再跑测试，确认全绿：

```bash
cargo test -p rtodo
```

# 编译并运行

## cargo run 的指令格式

在 workspace 里运行某个 crate，需要这样写：

```bash
cargo run -p rtodo -- add "写完教程"
#          ↑           ↑   ↑
#          指定 crate   │   传给程序的参数
#                       │
#                      "--" 是分隔符
```

`-p rtodo` 告诉 cargo 运行哪个 crate（workspace 里可能有多个）。`--` 是 cargo 和程序参数之间的**分隔符**——`--` 左边的参数属于 cargo 自己，右边的参数原封不动传给程序。不写 `--` 的话，cargo 会把 `add` 当成 cargo 自己的子命令，运行会报错。

## 逐条试验

```bash
cargo run -p rtodo -- add "写完解析章节"
# 已添加：[1] 写完解析章节

cargo run -p rtodo -- add "写完数据建模章节"
# 已添加：[1] 写完数据建模章节
```

两次 `add` 打印的 ID 都是 1——每次运行都创建新的空列表，ID 从 1 重新开始。

```bash
cargo run -p rtodo -- list
# 暂无任务
```

刚才添加的任务也看不到，原因相同：内存不持久。

```bash
cargo run -p rtodo -- done 1      # 需要先在同一次运行里 add
cargo run -p rtodo -- search "章节"
cargo run -p rtodo -- remove 1
cargo run -p rtodo -- help
```

## 验证错误路径

```bash
cargo run -p rtodo -- done abc
# 错误: 任务 ID 无效

cargo run -p rtodo -- foobar
# 错误: 未知命令

cargo run -p rtodo -- done 99
# 错误: 找不到对应任务
```

错误信息从 `parse_args` 或 `execute` 产生，经 `?` 传回 `run()`，再由 `main()` 里的 `eprintln!` 打印到标准错误，进程以退出码 1 结束。

## 当前的局限

所有命令都能正常执行，但每次运行都从空列表开始——`TodoList::new()` 只在内存里建列表，进程退出后数据消失。下一章用文件读写解决这个问题。
