# date-range

日期范围选择器。

## 字段定义

```json
{
  "key": "projectPeriod",
  "type": "object",
  "controlType": "date-range",
  "title": "项目周期"
}
```

## 记录值示例

```json
{ "projectPeriod": { "start": "2024-01-01", "end": "2024-12-31" } }
```

## 说明

- `type` 为 `"object"`，包含 `start` 和 `end` 两个日期字符串
- 前端渲染为日期范围选择器
