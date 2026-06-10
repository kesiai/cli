# select-string

单选下拉框（字符串值）。

## 字段定义

```json
{
  "key": "status",
  "type": "string",
  "controlType": "select-string",
  "title": "状态",
  "enum": ["running", "stopped", "maintenance", "fault"],
  "enumNames": ["运行中", "已停机", "维护中", "故障"]
}
```

## 记录值示例

```json
{ "status": "running" }
```

## 说明

- `enum` 定义可选值数组，`enumNames` 定义对应显示文本，两个数组长度必须一致
- 记录值为 `enum` 中的单个字符串
- 前端根据 `enum`/`enumNames` 渲染下拉选项
