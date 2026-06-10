# select-number

单选下拉框（数字值）。

## 字段定义

```json
{
  "key": "priority",
  "type": "number",
  "controlType": "select-number",
  "title": "优先级",
  "enum": [1, 2, 3],
  "enumNames": ["低", "中", "高"]
}
```

## 记录值示例

```json
{ "priority": 3 }
```

## 说明

- 与 `select-string` 结构一致，区别是 `enum` 值为数字，`type` 为 `"number"`
- 记录值为 `enum` 中的单个数字
