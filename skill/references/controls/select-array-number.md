# select-array-number

多选下拉框（数字值）。

## 字段定义

```json
{
  "key": "levels",
  "type": "array",
  "controlType": "select-array-number",
  "title": "级别",
  "enum": [10, 20, 30, 40],
  "enumNames": ["十", "二十", "三十", "四十"]
}
```

## 记录值示例

```json
{ "levels": [10, 30] }
```

## 说明

- 与 `select-array-string` 结构一致，区别是 `enum` 值为数字
- 记录值为数字数组
