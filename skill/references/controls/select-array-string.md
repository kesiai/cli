# select-array-string

多选下拉框（字符串值）。

## 字段定义

```json
{
  "key": "tags",
  "type": "array",
  "controlType": "select-array-string",
  "title": "标签",
  "enum": ["tag1", "tag2", "tag3", "tag4"],
  "enumNames": ["标签1", "标签2", "标签3", "标签4"]
}
```

## 记录值示例

```json
{ "tags": ["tag1", "tag3"] }
```

## 说明

- `type` 为 `"array"`，记录值是 `enum` 中的字符串数组
- 空选择为 `[]`
- 前端通常渲染为多选下拉框或标签选择器
