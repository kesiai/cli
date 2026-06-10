# date

日期选择器。

## 字段定义

```json
{
  "key": "birthDate",
  "type": "string",
  "controlType": "date",
  "title": "出生日期",
  "format": "date"
}
```

## 记录值示例

```json
{ "birthDate": "2024-06-15" }
```

## 说明

- 值为 ISO 8601 日期字符串
- `format: "date"` 表示只取日期部分（不含时间）
- 查询返回时可能带时区偏移，如 `"2024-06-15T00:00:00+08:00"`
