---
title: "闭包"
description: ""
difficulty: intermediate
estimatedTime: 10
keywords: []
---

闭包是 Rust 中一种特殊的函数——它可以**捕获所在作用域中的变量**，这是普通函数做不到的。

本章分两篇：第一篇讲闭包的语法和三种捕获方式，第二篇讲用来约束闭包行为的 `Fn`/`FnMut`/`FnOnce` 三个 trait，以及如何把闭包作为参数或返回值使用。
