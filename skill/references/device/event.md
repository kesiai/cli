# 事件（Events）

设备事件定义了设备生命周期和状态变化事件，如上线、离线、故障等。

事件定义在设备表的 `device.events` 数组中。

## 事件数据结构（DeviceEvent）

```json
{
  "id": "device_online",
  "name": "设备上线",
  "writeOut": {
    "schema": {},
    "formValue": {}
  }
}
```

### 基础字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 事件标识 |
| `name` | string | ✅ | 事件名称 |
| `writeOut` | object | | 输出配置 |

### writeOut — 输出配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `schema` | object | 输出表单 schema 定义 |
| `formValue` | object | 输出默认值 |

## 事件示例

```json
[
  { "id": "device_online", "name": "设备上线" },
  { "id": "device_offline", "name": "设备离线" },
  { "id": "device_fault", "name": "设备故障" },
  { "id": "temp_warning", "name": "温度异常" }
]
```

## 关联

- 设备表总览：[device.md](../device.md)
- 数据点：[tag.md](tag.md)
- 指令：[command.md](command.md)
- 报警规则：[warning-rule.md](warning-rule.md)
