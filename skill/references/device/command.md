# 指令（Commands）

指令是向设备发送远程控制的配置，如启动/停止设备、设置阀门开度等。

## 命令

```bash
# 发送单个控制指令
kesi control-send --device <deviceId> --tag <tagName> --value <value>

# 批量控制
kesi control-batch --file commands.json
kesi control-batch --json '[{"device":"id1","tag":"tag1","value":1}]'
```

## 指令数据结构（DeviceCommand）

指令定义在设备表的 `device.commands` 数组中。

```json
{
  "name": "启动设备",
  "showName": "启动",
  "retry": 3,
  "tag": { "id": "switch", "name": "设备开关" },
  "ops": [{ "param": "start" }],
  "writeIn": {
    "ioway": "single",
    "type": "select",
    "schema": {},
    "formValue": {}
  },
  "writeOut": {
    "type": "select",
    "schema": {},
    "formValue": {}
  }
}
```

### 基础字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 指令名称 |
| `showName` | string | | 显示名称（按钮文字） |
| `retry` | number | | 重试次数 |
| `tag` | {id, name} | | 关联的数据点 |
| `ops` | CommandOp[] | | 操作参数列表 |

### CommandOp

```json
{ "param": "start" }
```

| 字段 | 说明 |
|------|------|
| `param` | 操作参数值 |

### writeIn — 写入配置

控制指令发送到设备时的输入配置。

| 字段 | 类型 | 说明 |
|------|------|------|
| `ioway` | string | 写入方式：`"single"`(单值) / `"object"`(对象) / `"array"`(数组) |
| `type` | string | 值类型：`"select"`(选择) / `"input"`(输入) / `"tagValue"`(点位值) / `"object"` / `"array"` / `"table"` |
| `tag` | {id, name} | 当 type=tagValue 时的目标点位 |
| `select` | Array | select 类型的选项列表 |
| `schema` | object | 表单 schema 定义 |
| `formValue` | object | 表单默认值 |
| `mod` | number | 缩放比例 |
| `tagValue` | any | 点位值 |
| `objectValue` | any | 对象值 |
| `arrayValue` | any | 数组值 |
| `tableValue` | any | 表格值 |

### writeOut — 输出配置

控制指令的输出/回读配置，结构和 writeIn 类似。

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | 输出类型 |
| `schema` | object | 输出表单 schema |
| `formValue` | object | 输出默认值 |
| `select` | Array | 选择选项 |
| `tagValue` | any | 回读点位值 |
| `objectValue` | any | 对象值 |
| `arrayValue` | any | 数组值 |
| `tableValue` | any | 表格值 |

## 指令示例

### 简单开关指令

```json
{
  "name": "启动设备",
  "showName": "启动",
  "retry": 3,
  "tag": { "id": "switch", "name": "设备开关" },
  "ops": [{ "param": "start" }]
}
```

### 带选择参数的指令

```json
{
  "name": "设置阀门开度",
  "showName": "设阀",
  "retry": 3,
  "tag": { "id": "valve", "name": "阀门开度" },
  "writeIn": {
    "ioway": "single",
    "type": "input",
    "schema": {
      "type": "number",
      "title": "开度值",
      "min": 0,
      "max": 100
    },
    "formValue": { "value": 50 }
  }
}
```

## 关联

- 设备表总览：[device.md](../device.md)
- 数据点：[tag.md](tag.md)
- 事件：[event.md](event.md)
