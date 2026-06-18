---
title: "综合练习"
description: "通过编程练习巩固错误处理全貌：panic!/Result/? 的综合运用，以及自定义错误类型的实践。"
difficulty: intermediate
estimatedTime: 30
keywords: ["错误处理", "练习", "Result", "panic", "?", "自定义错误"]
---

# 综合练习

## 编程练习

### 练习一：修复错误传播

下面这个函数尝试读取文件并把内容解析为整数，但代码无法编译。请修复它，使其能正确处理两种不同类型的错误。

提示：函数体内可能出现 `io::Error`（文件读取）和 `ParseIntError`（数字解析）两种不同类型，但目前返回类型只写了 `io::Error`。把返回类型改成能容纳任意错误的类型。

```rust editable
use std::fs;
use std::io;

fn read_number(path: &str) -> Result<i32, io::Error> {
    let content = fs::read_to_string(path)?;
    let n: i32 = content.trim().parse()?;
    Ok(n)
}

fn main() {
    match read_number("number.txt") {
        Ok(n)  => println!("数字是 {}", n),
        Err(e) => println!("出错了：{}", e),
    }
}
```

```expected
出错了：No such file or directory (os error 2)
```

### 练习二：从 panic 改为返回 Result

下面的函数使用 `panic!` 处理错误。请将它改为返回 `Result<u32, String>`——成功时返回年龄，失败时返回描述错误原因的字符串。

```rust editable
fn parse_age(s: &str) -> u32 {
    let n: i32 = match s.trim().parse() {
        Ok(n)  => n,
        Err(e) => panic!("解析失败：{}", e),
    };
    if n < 0 || n > 150 {
        panic!("年龄 {} 不在有效范围内", n);
    }
    n as u32
}

fn main() {
    println!("{}", parse_age("25"));
    // 下面这行目前会 panic，改好后应该打印错误信息
    // println!("{:?}", parse_age("abc"));
}
```

```expected
25
```

### 练习三：实现自定义错误类型

完善下面的代码：实现 `fmt::Display`、`std::error::Error`，以及 `From<ParseIntError>`，让函数可以用 `?` 正常传播错误。

```rust editable
use std::num::ParseIntError;
use std::fmt;

#[derive(Debug)]
enum CalcError {
    Parse(ParseIntError),
    DivisionByZero,
}

// TODO: 实现 fmt::Display for CalcError
// 提示：DivisionByZero 显示"除数不能为零"，Parse 显示底层错误
impl fmt::Display for CalcError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        todo!()
    }
}

// TODO: 实现 std::error::Error for CalcError（空实现即可）

// TODO: 实现 From<ParseIntError> for CalcError

fn divide(a_str: &str, b_str: &str) -> Result<i32, CalcError> {
    let a: i32 = a_str.trim().parse()?;
    let b: i32 = b_str.trim().parse()?;
    if b == 0 {
        return Err(CalcError::DivisionByZero);
    }
    Ok(a / b)
}

fn main() {
    match divide("10", "2") {
        Ok(n)  => println!("结果：{}", n),
        Err(e) => println!("错误：{}", e),
    }
    match divide("10", "0") {
        Ok(n)  => println!("结果：{}", n),
        Err(e) => println!("错误：{}", e),
    }
    match divide("10", "abc") {
        Ok(n)  => println!("结果：{}", n),
        Err(e) => println!("错误：{}", e),
    }
}
```

```expected
结果：5
错误：除数不能为零
错误：invalid digit found in string
```

### 练习四：用迭代器处理错误

下面的代码收集了一组字符串，需要把能转换成整数的保留下来，不能转换的跳过。请用 `filter_map` 补全代码。

```rust editable
fn main() {
    let inputs = vec!["1", "two", "3", "四", "5"];

    // 使用 filter_map 过滤掉无法解析的，只保留成功解析的整数
    let numbers: Vec<i32> = inputs.iter()
        .filter_map(|s| s.parse::<i32>().???)  // 提示：.ok() 把 Result 转成 Option
        .collect();

    println!("{:?}", numbers);
}
```

```expected
[1, 3, 5]
```
