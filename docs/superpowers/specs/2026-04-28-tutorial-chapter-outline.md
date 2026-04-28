# Rust 互动教程：完整章节目录设计

**日期**：2026-04-28
**状态**：已批准
**决策**：方案 A（渐进主题式）

---

## 设计原则

- **渐进式复杂度**：按认知难度编排，不拘泥于 The Book 原有顺序
- **概念单一**：每章主题聚焦，每篇文章只讲一个核心概念
- **练习驱动**：每章末有综合练习文章，每篇技术文章包含测验或编程练习
- **细分粒度**：每章 3–7 篇小文章 + 1 篇综合练习
- **目标读者**：零基础学习者，最终达到能够独立阅读官方文档、编写实用程序的水平

---

## 目录结构

共 **15 章**，**78 篇文章**（不含各章 `00-index.md`）。

---

### 第 01 章：入门基础 `01-rust-basics` ✅

| 文件 | 标题 | 状态 |
|------|------|------|
| `01-installation.md` | 安装 Rust | ✅ 已完成 |
| `02-hello-world.md` | Hello, World! | ✅ 已完成 |
| `03-hello-cargo.md` | 使用 Cargo | ✅ 已完成 |

---

### 第 02 章：基础语法 `02-basic-syntax`

| 文件 | 标题 |
|------|------|
| `01-variables.md` | 变量与可变性（let、mut、const、shadowing） |
| `02-data-types.md` | 基本数据类型（整数、浮点、布尔、字符） |
| `03-compound-types.md` | 复合类型（元组与数组） |
| `04-functions.md` | 函数（参数、返回值、表达式 vs 语句） |
| `05-control-flow.md` | 控制流（if/else、loop、while、for、range） |
| `06-formatted-output.md` | 格式化输出（println! 占位符、调试输出、格式规范） |
| `07-practice.md` | 综合练习 |

---

### 第 03 章：所有权系统 `03-ownership`

| 文件 | 标题 |
|------|------|
| `01-what-is-ownership.md` | 什么是所有权（所有权规则、栈与堆） |
| `02-move-copy.md` | 移动与复制（move 语义、Copy trait、clone） |
| `03-references-borrowing.md` | 引用与借用（&T、&mut T、借用规则） |
| `04-slices.md` | 切片（字符串切片、数组切片） |
| `05-practice.md` | 综合练习 |

---

### 第 04 章：复合数据类型 `04-compound-types`

| 文件 | 标题 |
|------|------|
| `01-structs.md` | 结构体（定义、实例化、更新语法） |
| `02-struct-methods.md` | 方法语法（impl 块、方法、关联函数） |
| `03-enums.md` | 枚举（定义、携带数据的变体） |
| `04-option.md` | Option\<T\>（Rust 的空值安全方案） |
| `05-match.md` | 模式匹配（match、解构、守卫） |
| `06-if-let.md` | if let 与 while let |
| `07-practice.md` | 综合练习 |

---

### 第 05 章：模块系统与工程化 `05-modules`

| 文件 | 标题 |
|------|------|
| `01-packages-crates.md` | 包与 Crate（package、lib crate、bin crate） |
| `02-modules.md` | 模块与可见性（mod、pub、私有性规则） |
| `03-paths-use.md` | 路径与 use（绝对/相对路径、as、re-export） |
| `04-workspace.md` | 工作空间（Workspace 多 crate 大工程结构） |
| `05-features.md` | Features 与条件编译（[features]、cfg 属性、可选依赖） |
| `06-build-scripts.md` | 构建脚本 build.rs（执行时机、链接系统库、代码生成） |
| `07-ffi-basics.md` | FFI 基础（extern "C"、C 类型映射、unsafe 调用 C） |
| `08-bindgen.md` | 自动生成绑定：bindgen（从 .h 头文件生成 Rust 绑定） |
| `09-cbindgen.md` | 暴露 Rust 给 C：cbindgen（#[no_mangle]、导出 .h） |
| `10-practice.md` | 综合练习 |

---

### 第 06 章：常用集合 `06-collections`

| 文件 | 标题 |
|------|------|
| `01-vectors.md` | Vec\<T\>（创建、修改、遍历、切片） |
| `02-strings.md` | String 与 &str（内部结构、UTF-8、常用操作） |
| `03-hashmaps.md` | HashMap\<K, V\>（创建、插入、查询、entry API） |
| `04-practice.md` | 综合练习 |

---

### 第 07 章：错误处理 `07-error-handling`

| 文件 | 标题 |
|------|------|
| `01-panic.md` | panic! 与不可恢复错误（unwrap、expect、backtrace） |
| `02-result.md` | Result\<T, E\>（map、and_then、or_else） |
| `03-question-mark.md` | ? 运算符（错误传播、From trait） |
| `04-when-to-panic.md` | 何时 panic，何时 Result |
| `05-practice.md` | 综合练习 |

---

### 第 08 章：泛型与 Trait `08-generics-traits`

| 文件 | 标题 |
|------|------|
| `01-generics.md` | 泛型数据类型（函数、结构体、枚举中的泛型） |
| `02-traits.md` | Trait：定义共享行为（定义、实现、默认方法） |
| `03-trait-bounds.md` | Trait 约束与 impl Trait（where 子句、动态分发 dyn） |
| `04-common-traits.md` | 常用标准 Trait（Display、Debug、Clone、From/Into、Iterator） |
| `05-practice.md` | 综合练习 |

---

### 第 09 章：生命周期 `09-lifetimes`

| 文件 | 标题 |
|------|------|
| `01-what-are-lifetimes.md` | 为什么需要生命周期（悬垂引用、借用检查器） |
| `02-lifetime-annotations.md` | 生命周期注解语法（函数中的 'a） |
| `03-struct-lifetimes.md` | 结构体中的生命周期 |
| `04-lifetime-elision.md` | 生命周期省略规则与 'static |
| `05-practice.md` | 综合练习 |

---

### 第 10 章：闭包与迭代器 `10-closures-iterators`

| 文件 | 标题 |
|------|------|
| `01-closures.md` | 闭包（语法、捕获环境、Fn/FnMut/FnOnce） |
| `02-iterators.md` | 迭代器（Iterator trait、next()、惰性求值） |
| `03-iterator-adapters.md` | 迭代器适配器（map、filter、chain、zip、enumerate、flat_map） |
| `04-consuming-iterators.md` | 消费迭代器（collect、sum、fold、any、all） |
| `05-practice.md` | 综合练习 |

---

### 第 11 章：智能指针 `11-smart-pointers`

| 文件 | 标题 |
|------|------|
| `01-box.md` | Box\<T\>（堆分配、递归类型） |
| `02-rc.md` | Rc\<T\> 引用计数（共享所有权、Weak 防循环） |
| `03-refcell.md` | RefCell\<T\> 内部可变性（运行时借用检查） |
| `04-arc-mutex.md` | Arc\<T\> 与 Mutex\<T\>（多线程安全共享） |
| `05-practice.md` | 综合练习 |

---

### 第 12 章：并发编程 `12-concurrency`

| 文件 | 标题 |
|------|------|
| `01-threads.md` | 线程（thread::spawn、join、move 闭包） |
| `02-channels.md` | 消息传递（mpsc::channel、send、recv） |
| `03-shared-state.md` | 共享状态（Mutex\<T\>、Arc\<Mutex\<T\>\>） |
| `04-sync-send.md` | Send 与 Sync Trait |
| `05-practice.md` | 综合练习 |

---

### 第 13 章：测试与文档 `13-testing-docs`

| 文件 | 标题 |
|------|------|
| `01-unit-tests.md` | 单元测试（#[test]、assert!、assert_eq!） |
| `02-integration-tests.md` | 集成测试（tests/ 目录、测试辅助代码） |
| `03-test-control.md` | 控制测试运行（cargo test 参数、忽略、并发） |
| `04-doc-comments.md` | 文档注释与 doctest（///、cargo doc、示例即测试） |
| `05-practice.md` | 综合练习 |

---

### 第 14 章：高级特性 `14-advanced`

| 文件 | 标题 |
|------|------|
| `01-unsafe.md` | unsafe Rust（裸指针、unsafe 块、FFI 安全封装） |
| `02-advanced-traits.md` | 高级 Trait（关联类型、运算符重载、newtype 模式） |
| `03-advanced-types.md` | 高级类型（类型别名、never 类型、动态大小类型） |
| `04-macros.md` | 宏（macro_rules!、derive 宏、属性宏） |
| `05-async-intro.md` | async/await 入门（Future、tokio 基础、异步模型） |
| `06-practice.md` | 综合练习 |

---

### 第 15 章：综合项目 `15-projects`

| 文件 | 标题 |
|------|------|
| `01-minigrep.md` | 命令行工具 minigrep（文件读取、迭代器、错误处理串联） |
| `02-web-server.md` | 简易 Web Server（TCP 监听、线程池、基础 HTTP 解析） |

---

## 统计

| 指标 | 数值 |
|------|------|
| 总章数 | 15 章 |
| 总文章数（不含 index） | 78 篇 |
| 已完成 | 3 篇（第 01 章） |
| 待编写 | 75 篇 |

## 文件命名约定

- `00-index.md`：章节首页，不出现在文章列表
- `NN-slug.md`：普通文章，按字母序决定侧边栏顺序
- 综合练习统一命名为该章最后一个编号

## 编写优先级建议

1. 第 02 章：基础语法（学习其他所有章的前提）
2. 第 03 章：所有权系统（Rust 核心，越早讲越好）
3. 第 04 章：复合数据类型（搭配所有权理解 struct/enum）
4. 后续章节按序推进
