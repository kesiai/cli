# text

单行文本输入。

## 字段定义

```json
{
  "key": "fieldName",
  "type": "string",
  "controlType": "text",
  "title": "名称",
  "need": true,
  "unique": true
}
```

## 记录值示例

```json
{ "fieldName": "温湿度传感器-A01" }
```

## 说明

- 最基础的控件，适用于短文本（名称、地址、IP 等）
- `need: true` 表示必填，`unique: true` 表示值不可重复
