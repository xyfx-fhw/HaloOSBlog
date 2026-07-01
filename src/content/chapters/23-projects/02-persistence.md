---
title: "数据持久化"
description: "用 serde_json 把任务列表序列化到 JSON 文件，学会处理文件读写中的各种错误情况，让数据在程序重启后依然保留"
difficulty: intermediate
estimatedTime: 30
keywords: ["持久化", "serde_json", "文件读写", "JSON", "错误处理", "PathBuf"]
---

# 为什么需要持久化

## 内存数据不会自动保留

如果任务只存在内存里，每次运行 `rtodo` 都是一张白纸——上次加的任务全部消失。

我们需要把数据**写入文件**，下次启动时再读回来。最简单且最通用的格式是 **JSON**：

```json
[
  { "id": 1, "title": "写完 Rust 教程第三章", "completed": true },
  { "id": 2, "title": "复习生命周期", "completed": false }
]
```

`serde_json` 负责在 `Vec<Todo>` 和 JSON 字符串之间互转，`std::fs` 负责读写文件。

# 确定存储路径

## 存在哪里

常见的选择：
- **当前目录** `./todos.json`：简单，但每个目录都会有自己的任务列表，容易分散
- **用户主目录** `~/.rtodo.json`：全局共享，不管在哪个目录运行都是同一份数据

我们选**用户主目录**，这更符合任务管理工具的使用习惯。

```rust runnable
use std::path::PathBuf;

fn data_path() -> PathBuf {
    // dirs::home_dir() 需要 dirs crate，这里用标准库的方式
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))  // Windows 的主目录变量
        .unwrap_or_else(|_| ".".to_string());        // 实在找不到就用当前目录

    PathBuf::from(home).join(".rtodo.json")
}

fn main() {
    println!("数据文件路径：{}", data_path().display());
    // Unix:    /Users/yourname/.rtodo.json
    // Windows: C:\Users\yourname\.rtodo.json
}
```

**`PathBuf` vs `String`**：

路径在不同操作系统上分隔符不同（`/` vs `\`）。`PathBuf` 是 Rust 标准库提供的跨平台路径类型，`.join()` 方法会自动使用正确的分隔符。永远不要用字符串拼接路径。

# 读写 JSON

## 读取任务列表

```rust runnable
use std::path::PathBuf;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct Todo { id: u32, title: String, completed: bool }

fn load_todos(path: &PathBuf) -> Result<Vec<Todo>, String> {
    // 文件不存在：返回空列表（第一次运行时正常情况）
    if !path.exists() {
        return Ok(Vec::new());
    }

    // 读取文件内容
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("读取文件失败：{}", e))?;

    // 反序列化 JSON 字符串 → Vec<Todo>
    let todos: Vec<Todo> = serde_json::from_str(&content)
        .map_err(|e| format!("解析 JSON 失败：{}", e))?;

    Ok(todos)
}

fn main() {
    let path = PathBuf::from("todos.json");
    match load_todos(&path) {
        Ok(todos) => println!("加载了 {} 条任务", todos.len()),
        Err(e)    => eprintln!("错误：{}", e),
    }
}
```

**两个 `?` 运算符各自处理一种错误：**
- 第一个 `?`：文件读取失败（权限不足、路径错误等）
- 第二个 `?`：JSON 格式损坏（文件被手动编辑乱了）

用 `.map_err(|e| format!(...))` 把库的错误类型转成 `String`，这样整个函数的 `Err` 类型统一为 `String`，调用方不需要处理多种错误类型。

## 写入任务列表

```rust runnable
use std::path::PathBuf;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct Todo { id: u32, title: String, completed: bool }

fn save_todos(path: &PathBuf, todos: &[Todo]) -> Result<(), String> {
    // 序列化 Vec<Todo> → 格式化的 JSON 字符串
    let content = serde_json::to_string_pretty(todos)
        .map_err(|e| format!("序列化失败：{}", e))?;

    // 写入文件（如果不存在则创建，存在则覆盖）
    std::fs::write(path, content)
        .map_err(|e| format!("写入文件失败：{}", e))?;

    Ok(())
}

fn main() {
    let todos = vec![
        Todo { id: 1, title: "写代码".into(), completed: true },
        Todo { id: 2, title: "写文档".into(), completed: false },
    ];

    let path = PathBuf::from("/tmp/test_todos.json");
    match save_todos(&path, &todos) {
        Ok(_)  => println!("保存成功"),
        Err(e) => eprintln!("错误：{}", e),
    }

    // 验证读回来
    let content = std::fs::read_to_string(&path).unwrap();
    println!("{}", content);
}
```

`to_string_pretty` 生成带缩进的 JSON，比 `to_string` 更易读。

## 包装成 TodoStore

把加载和保存封装进一个结构体，让外部代码不用关心文件路径和序列化细节：

```rust
use std::path::PathBuf;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Todo {
    pub id: u32,
    pub title: String,
    pub completed: bool,
}

pub struct TodoStore {
    path: PathBuf,
    todos: Vec<Todo>,
}

impl TodoStore {
    /// 从文件加载，返回 TodoStore 实例
    pub fn load(path: PathBuf) -> Result<Self, String> {
        let todos = if path.exists() {
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("读取文件失败：{}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("解析 JSON 失败：{}", e))?
        } else {
            Vec::new()
        };

        Ok(TodoStore { path, todos })
    }

    /// 把当前状态写回文件
    pub fn save(&self) -> Result<(), String> {
        let content = serde_json::to_string_pretty(&self.todos)
            .map_err(|e| format!("序列化失败：{}", e))?;
        std::fs::write(&self.path, content)
            .map_err(|e| format!("写入文件失败：{}", e))?;
        Ok(())
    }

    /// 获取所有任务（只读引用）
    pub fn all(&self) -> &[Todo] {
        &self.todos
    }

    /// 生成下一个可用的 ID（最大 ID + 1，或 1）
    pub fn next_id(&self) -> u32 {
        self.todos.iter().map(|t| t.id).max().unwrap_or(0) + 1
    }
}
```

**设计决策**：`TodoStore` 持有任务列表，所有修改都通过它的方法进行，用完后调用 `save()` 写回文件。这样"读→改→写"的流程很清晰。

## 把存储路径整合进 main

```rust
fn main() {
    let path = data_path(); // 第一节写的函数

    let mut store = match TodoStore::load(path) {
        Ok(s)  => s,
        Err(e) => {
            eprintln!("初始化失败：{}", e);
            std::process::exit(1);
        }
    };

    // ... 处理命令 ...

    // 命令执行完后保存
    if let Err(e) = store.save() {
        eprintln!("保存失败：{}", e);
        std::process::exit(1);
    }
}
```

## 本章小结与练习

**本章完成的事：**
- 用 `PathBuf` 安全地处理跨平台路径
- 用 `serde_json::from_str` / `to_string_pretty` 读写 JSON
- 把持久化逻辑封装进 `TodoStore`，对外提供干净的接口
- 用 `.map_err(|e| format!(...))` 统一错误类型，配合 `?` 传播

**练习：**

为 `TodoStore` 添加一个方法 `find_by_id(&self, id: u32) -> Option<&Todo>`，通过 ID 查找任务，找不到时返回 `None`。

```rust
// 验证（在本地项目里运行）
let store = TodoStore::load(data_path()).unwrap();
match store.find_by_id(1) {
    Some(todo) => println!("找到：{}", todo.title),
    None       => println!("ID 1 不存在"),
}
```

提示：用迭代器的 `.find()` 方法，一行代码就能完成。
