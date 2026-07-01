---
title: "标准库类型"
description: "掌握 Rust 最常用的集合类型：Vec<T>、String 和 HashMap，学会安全高效地处理动态数据结构。"
difficulty: beginner
estimatedTime: 5
keywords: ["向量", "字符串", "哈希表", "集合", "所有权"]
---

有了基础类型和自定义类型，实际开发中你还会频繁需要**集合**——存储一组数据而非单个值。Rust 标准库提供了三种最常用的集合类型，几乎出现在每一个 Rust 程序中：动态数组 `Vec<T>`、可变字符串 `String`，以及键值对集合 `HashMap<K, V>`。

## 本章目录

| 文章 | 主要内容 |
| --- | --- |
| [向量 Vec\<T\>](./01-vectors) | 可动态增长的数组：创建、读取、增删改与遍历 |
| [字符串 String](./02-strings) | `String` 与 `&str` 的区别，字符串操作与 UTF-8 编码 |
| [哈希表 HashMap](./03-hashmaps) | 键值对集合：创建、查找、更新与迭代 |
| [综合练习](./04-practice) | 综合运用三种集合类型解决实际问题 |
