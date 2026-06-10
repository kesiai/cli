# relate

单选关联（关联其他表的记录）。

## 字段定义

```json
{
  "key": "deviceId",
  "type": "string",
  "controlType": "relate",
  "title": "关联设备",
  "relate": {
    "id": "iot_devices",
    "title": "设备管理",
    "fields": ["name", "status"]
  }
}
```

## 记录值示例

```json
{ "deviceId": "6a1929c183773d111a4feb51" }
```

## 说明

- `relate.id` 指定关联的目标表 ID
- `relate.fields` 指定关联时显示的目标表字段
- 记录值为目标表某条记录的 ID（字符串）
- 前端渲染为下拉框，选项来自目标表的记录
