---
title: "实现 TodoList"
description: "用 TDD 方式逐个实现 TodoList 的方法，再把数据层接入 run 函数完成命令分发"
difficulty: intermediate
estimatedTime: 35
keywords: ["TDD", "测试驱动", "impl", "迭代器", "命令分发", "run函数"]
---

# 先写测试

上一章用 `todo!()` 把方法签名占好了，但具体行为还没有定义。TDD 的做法是：先写测试描述每个方法**应该**有什么行为，再写实现让测试通过。

在 `rtodo-core/src/lib.rs` 末尾添加测试模块：

```rust
// rtodo-core/src/lib.rs — 文件末尾添加
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_stores_title_and_sets_id() {
        let mut list = TodoList::new();
        let todo = list.add("写代码".to_string());
        assert_eq!(todo.title, "写代码");
        assert_eq!(todo.id, 1);
        assert!(!todo.completed);
    }

    #[test]
    fn test_add_increments_id() {
        let mut list = TodoList::new();
        list.add("第一条".to_string());
        let todo = list.add("第二条".to_string());
        assert_eq!(todo.id, 2);
    }

    #[test]
    fn test_all_returns_all_todos() {
        let mut list = TodoList::new();
        list.add("任务一".to_string());
        list.add("任务二".to_string());
        assert_eq!(list.all().len(), 2);
    }

    #[test]
    fn test_mark_done_sets_completed() {
        let mut list = TodoList::new();
        list.add("任务".to_string());
        assert!(list.mark_done(1).is_ok());
        assert!(list.all()[0].completed);
    }

    #[test]
    fn test_mark_done_not_found() {
        let mut list = TodoList::new();
        assert!(list.mark_done(99).is_err());
    }

    #[test]
    fn test_remove_returns_todo_and_shrinks_list() {
        let mut list = TodoList::new();
        list.add("任务".to_string());
        let removed = list.remove(1).unwrap();
        assert_eq!(removed.title, "任务");
        assert_eq!(list.all().len(), 0);
    }

    #[test]
    fn test_remove_not_found() {
        let mut list = TodoList::new();
        assert!(list.remove(99).is_err());
    }

    #[test]
    fn test_search_case_insensitive() {
        let mut list = TodoList::new();
        list.add("学习 Rust 编程".to_string());
        assert_eq!(list.search("rust").len(), 1);
        assert_eq!(list.search("RUST").len(), 1);
        assert_eq!(list.search("Python").len(), 0);
    }
}
```

运行测试，所有用例都会因为 `todo!()` panic 而失败：

```bash
cargo test -p rtodo-core
```

先红后绿——这是正常的，下面逐个填实现。

# 逐个实现方法

## next_id

`add` 需要一个自增 ID，先实现私有的 `next_id`：找出当前所有任务里最大的 ID，加 1。

```rust
// rtodo-core/src/lib.rs — impl TodoList 内，替换 next_id 的 todo!()
fn next_id(&self) -> u32 {
    self.todos.iter().map(|t| t.id).max().unwrap_or(0) + 1
}
```

`.map(|t| t.id)` 把每条任务映射成 ID 值，`.max()` 返回 `Option<u32>`——列表为空时没有最大值，返回 `None`。`unwrap_or(0)` 在空列表时给出默认值 0，加 1 后第一个 ID 就是 1。

为什么不用 `len() + 1`？删除任务后 `len()` 减小，新 ID 可能和已有 ID 重复。比如添加两条再删第一条，`len() = 1`，`len() + 1 = 2`，而 id=2 的任务还在。`max() + 1` 只看当前最大值，不受删除影响。

## all

```rust
// rtodo-core/src/lib.rs — impl TodoList 内，替换 all 的 todo!()
pub fn all(&self) -> &[Todo] {
    &self.todos
}
```

`&self.todos` 把 `Vec<Todo>` 转成 `&[Todo]` 切片引用。`Vec` 实现了 `Deref<Target = [T]>`，加 `&` 会自动转换。调用方能遍历切片，但无法直接往里 push 或 remove，数据修改只能通过方法。

## add

```rust
// rtodo-core/src/lib.rs — impl TodoList 内，替换 add 的 todo!()
pub fn add(&mut self, title: String) -> &Todo {
    let id = self.next_id();
    self.todos.push(Todo::new(id, title));
    self.todos.last().unwrap()
}
```

`&mut self` 是因为要修改 `self.todos`——只要方法改变字段，就必须声明 `&mut self`，否则编译报错。

`push` 把新任务推入 Vec 末尾，`last()` 取末尾元素的引用。刚 push 进去所以一定存在，`unwrap()` 不会 panic。

## mark_done

```rust
// rtodo-core/src/lib.rs — impl TodoList 内，替换 mark_done 的 todo!()
pub fn mark_done(&mut self, id: u32) -> Result<(), String> {
    let todo = self.todos.iter_mut()
        .find(|t| t.id == id)
        .ok_or("找不到对应任务".to_string())?;

    if todo.completed {
        return Err("任务已经完成了".to_string());
    }

    todo.completed = true;
    Ok(())
}
```

`iter_mut()` 返回可变引用的迭代器，`.find()` 找到第一个满足条件的元素，返回 `Option<&mut Todo>`。`.ok_or_else(|| ...)` 把 `Option` 转成 `Result`——找不到时生成错误字符串，`?` 向上传播。

`if todo.completed` 提前检查重复标记，已完成的任务再次标记直接报错，而不是静默忽略。

## remove

```rust
// rtodo-core/src/lib.rs — impl TodoList 内，替换 remove 的 todo!()
pub fn remove(&mut self, id: u32) -> Result<Todo, String> {
    let pos = self.todos.iter()
        .position(|t| t.id == id)
        .ok_or("找不到对应任务".to_string())?;

    Ok(self.todos.remove(pos))
}
```

这里用 `.position()` 而不是 `.find()`，因为 `Vec::remove` 需要**下标**（`usize`），不是元素引用。`Vec::remove(pos)` 把元素从 Vec 里移出并返回所有权，其余元素向前填补空位。

## search

```rust
// rtodo-core/src/lib.rs — impl TodoList 内，替换 search 的 todo!()
pub fn search(&self, query: &str) -> Vec<&Todo> {
    let query_lower = query.to_lowercase();
    self.todos.iter()
        .filter(|t| t.title.to_lowercase().contains(&query_lower))
        .collect()
}
```

把 `query` 转小写存在闭包外，避免每次迭代都重复转换。每条任务的标题也转小写再比对，这样 `"rust"` 和 `"Rust"` 都能匹配到同一条任务。

## 确认测试全绿

所有 `todo!()` 替换完后运行：

```bash
cargo test -p rtodo-core
```

8 个测试全部通过，说明实现和签名完全吻合。下一章把数据层接入 `run()` 让程序真正可以运行。
