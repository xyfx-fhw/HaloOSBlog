---
title: "生成文档"
description: "用 /// 文档注释为公开 API 写说明，用 cargo doc 生成可浏览的 HTML 文档"
difficulty: intermediate
estimatedTime: 20
keywords: ["文档注释", "cargo doc", "doc comment", "///", "//!", "文档测试"]
---

# 文档注释

还记得哦文档注释吗？我们再回顾一下，Rust 有两种注释：

- `//` 普通注释，只给阅读源码的人看，不会出现在生成的文档里
- `///` 文档注释，会被 `cargo doc` 提取成 HTML 文档，供使用这个库的人查阅

`///` 写在**紧接着**的那个公开条目（函数、结构体、字段、枚举变体）之前，内容支持 Markdown 格式。

还有一种 `//!`，写在**文件或模块内部**，用来描述这个模块本身，而不是某个具体条目。

# 给 rtodo-core 写文档

## 模块级注释

打开 `rtodo-core/src/lib.rs`，在文件**最顶部**（所有 `use` 之前）加上模块说明：

```rust
// rtodo-core/src/lib.rs — 文件最顶部添加
//! `rtodo-core` 提供 rtodo 的核心数据结构和业务逻辑。
//!
//! 主要类型：
//! - [`Todo`]：单条任务
//! - [`TodoList`]：任务列表，支持增删改查和 JSON 持久化
```

`//!` 描述的是当前文件/模块本身。`[`Todo`]` 是文档链接语法，生成文档后会变成可点击的跳转链接。

## 给 Todo 加注释

在 `Todo` 结构体定义前加文档注释：

```rust
// rtodo-core/src/lib.rs — Todo 定义之前添加
/// 一条待办任务。
///
/// 每条任务有唯一的自增 ID、标题和完成状态。
/// 新建任务时 `completed` 总是 `false`，通过 [`TodoList::mark_done`] 标记完成。
#[derive(Serialize, Deserialize, Clone)]
pub struct Todo {
    /// 任务的唯一标识符，从 1 开始自增
    pub id: u32,
    /// 任务标题
    pub title: String,
    /// 是否已完成
    pub completed: bool,
}
```

字段注释写在字段**前**一行，和结构体注释格式相同。

## 给 TodoList 的方法加注释

`impl TodoList` 里的公开方法都加上说明。重点写**输入输出**和**可能的错误**：

```rust
// rtodo-core/src/lib.rs — impl TodoList 内，各方法之前添加
/// 从 JSON 文件加载任务列表。
///
/// 文件不存在时返回空列表（视为第一次运行）。
///
/// # 错误
///
/// 文件存在但读取失败，或内容不是合法 JSON 时，返回错误描述。
pub fn load(path: PathBuf) -> Result<Self, String> { ... }

/// 把当前任务列表序列化并写回文件。
///
/// # 错误
///
/// 序列化失败或写入文件失败时返回错误描述。
pub fn save(&self) -> Result<(), String> { ... }

/// 返回所有任务的只读切片。
pub fn all(&self) -> &[Todo] { ... }

/// 添加新任务，返回刚添加那条的引用。
pub fn add(&mut self, title: String) -> &Todo { ... }

/// 将指定 ID 的任务标记为完成，返回任务标题。
///
/// # 错误
///
/// ID 不存在，或任务已经完成时，返回错误描述。
pub fn mark_done(&mut self, id: u32) -> Result<String, String> { ... }

/// 删除指定 ID 的任务并返回它。
///
/// # 错误
///
/// ID 不存在时返回错误描述。
pub fn remove(&mut self, id: u32) -> Result<Todo, String> { ... }

/// 搜索标题包含 `query` 的任务（大小写不敏感），返回引用列表。
pub fn search(&self, query: &str) -> Vec<&Todo> { ... }
```

## 给 parse_args 和 run 加注释

把 `{ ... }` 替换成对应方法的实际实现——这里只展示注释部分，函数体保持不变。

# 给 rtodo 写文档

## rtodo 的模块级注释

打开 `rtodo/src/lib.rs`，同样在文件**最顶部**加上模块说明：

```rust
// rtodo/src/lib.rs — 文件最顶部添加
//! `rtodo` 的命令行入口层。
//!
//! 定义 [`Command`] 枚举，提供参数解析（[`parse_args`]）和程序主逻辑（[`run`]）。
```

## 给公开函数加注释

在 `parse_args` 和 `run` 前加说明：

```rust
// rtodo/src/lib.rs — parse_args 和 run 之前添加
/// 把命令行参数切片解析成 [`Command`]。
///
/// 空参数列表返回 `Ok(Command::Help)`。
///
/// # 错误
///
/// 命令名未知，或必要参数缺失、格式错误时，返回错误描述。
///
/// # 示例
///
/// ```
/// use rtodo::parse_args;
/// use rtodo::Command;
///
/// let cmd = parse_args(&["add".to_string(), "写代码".to_string()]).unwrap();
/// assert!(matches!(cmd, Command::Add(t) if t == "写代码"));
/// ```
pub fn parse_args(args: &[String]) -> Result<Command, String> { ... }

/// 程序主逻辑：读取参数、解析命令、执行操作、持久化数据。
///
/// # 错误
///
/// 参数解析失败、文件读写失败或命令执行失败时，返回错误描述，由调用方打印。
pub fn run() -> Result<(), String> { ... }
```

`# 示例` 里的代码块会被 `cargo test` 当作测试用例自动执行，称为**文档测试**。写示例时要确保代码确实能跑通。

# 生成并查看文档

在 workspace 根目录运行：

```bash
cargo doc --open
```

`cargo doc` 编译所有文档注释并生成 HTML，`--open` 在浏览器里自动打开。左侧是 crate 和模块的导航，点进 `rtodo_core` 能看到 `Todo`、`TodoList` 的完整 API 说明，包括参数、返回值、错误和示例。

只生成不打开：

```bash
cargo doc
# 输出在 target/doc/rtodo_core/index.html
```

运行文档测试（验证 `# 示例` 里的代码）：

```bash
cargo test --doc
```
