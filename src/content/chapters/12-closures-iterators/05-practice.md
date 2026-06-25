---
title: "综合练习"
description: "将一道 for 循环解法改写为闭包 + 迭代器风格，感受两种写法的差异"
difficulty: intermediate
estimatedTime: 15
keywords: ["Iterator", "闭包", "filter", "map", "collect", "综合练习"]
---

# 题目：筛词并转换

给定一段英文句子，找出所有长度**大于** `min_len` 的单词，转成大写后收集为 `Vec<String>`。

## 参考实现：for 循环版本

```rust runnable
fn long_words(text: &str, min_len: usize) -> Vec<String> {
    let mut result = Vec::new();
    for word in text.split_whitespace() {
        if word.len() > min_len {
            result.push(word.to_uppercase());
        }
    }
    result
}

fn main() {
    let sentence = "the quick brown fox jumps over the lazy dog";
    println!("{:?}", long_words(sentence, 3));
}
```

## 你的任务：改写为迭代器版本

用 `split_whitespace()`、`filter`、`map`、`collect` 以及闭包重写，结果与上面完全一致：

```rust editable
fn long_words_iter(text: &str, min_len: usize) -> Vec<String> {
    // TODO
    todo!()
}

fn main() {
    let sentence = "the quick brown fox jumps over the lazy dog";
    println!("{:?}", long_words_iter(sentence, 3));
}
```

```expected
["QUICK", "BROWN", "JUMPS", "OVER", "LAZY"]
```
