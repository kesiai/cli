# relate-multiple

多选关联（关联其他表的多条记录）。

## 字段定义

```json
{
  "key": "deviceIds",
  "type": "array",
  "controlType": "relate-multiple",
  "title": "关联设备（多选）",
  "relate": {
    "id": "iot_devices",
    "title": "设备管理",
    "fields": ["name", "status"]
  }
}
```

## 记录值示例

```json
{ "deviceIds": ["6a1929c183773d111a4feb51", "6a1929c183773d111a4feb54"] }
```

## 说明

- 与 `relate` 结构一致，区别是 `type` 为 `"array"`，值为目标表记录 ID 数组
- 前端渲染为多选下拉框
