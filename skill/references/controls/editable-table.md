# editable-table

可编辑子表格。

## 字段定义

```json
{
  "key": "items",
  "type": "array",
  "controlType": "editable-table",
  "title": "明细项"
}
```

## 记录值示例

```json
{
  "items": [
    { "name": "项目1", "qty": 10, "price": 99.5 },
    { "name": "项目2", "qty": 5, "price": 200 }
  ]
}
```

## 说明

- `type` 为 `"array"`，值为对象数组
- 每行是一个子记录，字段结构由 `config` 定义
- 前端渲染为可增删行的表格
