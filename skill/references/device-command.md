# 指令（Commands）

指令是向设备发送远程控制的配置，如启动/停止设备、设置阀门开度等。

## 命令

```bash
# 发送单条指令（--command 匹配指令的 name，不是 showName）
$K control-send --table <tableId> --device <deviceId> --command <指令name> [--params '{"key": value}']

# 批量控制（数组元素：table / device / command(名称) / params）
$K control-batch --file commands.json
$K control-batch --json '[{"table":"t1","device":"GM-001","command":"设置开关","params":{"value":1}}]'
```

- 指令名不存在时 CLI 报错并列出该表全部可用指令名。
- `--params` 是否必填由指令的写入方式决定（见下）。

## 写入方式（writeIn.ioway）——中文枚举

`writeIn.ioway` 只有两个合法值，**均为中文字符串**：

| ioway | 语义 | --params 行为 |
|-------|------|---------------|
| `默认写入`（或省略 ioway） | 固定数据下发，无需用户输入 | 可省略：CLI 自动取 schema 各字段 `default` 合成参数；传了则覆盖默认值 |
| `表单写入` | 执行时弹动态表单让用户填参数 | **必填**：缺失时 CLI 教学式报错，列出 schema 全部字段（类型/标题/默认值）和示例，补参重试即可 |

> ⚠️ 平台只认 `表单写入` 这一个字符串，其他任何值（如 `"single"`）都会被按默认写入处理。

## 指令数据结构（DeviceCommand）

指令定义在设备表的 `device.commands` 数组中。

```json
{
  "name": "设置开关",
  "showName": "设开关",
  "retry": 3,
  "tag": { "id": "switch", "name": "设备开关" },
  "ops": [{ "param": "start" }],
  "writeIn": {
    "ioway": "表单写入",
    "schema": {
      "value": { "type": "number", "title": "开关值", "default": 1 }
    },
    "formValue": { "value": 1 }
  }
}
```

### 基础字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 指令名称（`control-send --command` 匹配的就是它） |
| `showName` | string | | 显示名称（按钮文字），缺省用 name |
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

| 字段 | 类型 | 说明 |
|------|------|------|
| `ioway` | string | 写入方式：`"默认写入"` / `"表单写入"`（中文枚举，见上） |
| `schema` | object | **字段名 → 字段定义** 的映射（不是 JSON Schema 顶层结构），见下 |
| `formValue` | object | 表单默认值 `{字段名: 值}` |
| `tag` | {id, name} | 关联点位 |

### schema 字段定义（FieldSchema）

`schema` 的每个 value 是一个字段定义：

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | `"string"` / `"number"` / `"boolean"` / `"object"` / `"array"` |
| `title` | string | 字段标题（表单 label） |
| `default` | any | 默认值（默认写入的取值来源） |
| `enum` / `enumNames` | Array | 枚举可选值（等长配对） |
| `properties` | object | type=object 时的子字段（递归 FieldSchema） |
| `items` | FieldSchema | type=array 时的元素定义 |

### writeOut — 输出配置

结构与 writeIn 类似但**没有 `ioway` 字段**，仅 `schema` / `formValue`。

## 指令示例

### 简单开关指令（默认写入）

```json
{
  "name": "启动设备",
  "showName": "启动",
  "retry": 3,
  "tag": { "id": "switch", "name": "设备开关" },
  "ops": [{ "param": "start" }]
}
```

无 `writeIn`（或 `ioway: "默认写入"`）→ `control-send` 无需 `--params`，直接下发。

### 表单写入指令

```json
{
  "name": "设置开关",
  "showName": "设开关",
  "retry": 3,
  "tag": { "id": "switch", "name": "设备开关" },
  "writeIn": {
    "ioway": "表单写入",
    "schema": {
      "value": { "type": "number", "title": "开关值", "default": 1 }
    },
    "formValue": { "value": 1 }
  }
}
```

下发必须带参数：`$K control-send --table <t> --device GM-001 --command 设置开关 --params '{"value": 1}'`

## 下发失败语义

指令下发要求表绑定的驱动实例（`device.driver`/`groupId` 对应的实例）正在运行。平台无可用驱动服务时报 **130010037「未找到运行设备采集的驱动服务」**——这是环境性结果（没有可达设备），不是调用错误；如实汇报原始报错即可，不要试图通过改表结构或换驱动来"修复"。

## 关联

- 设备表总览：[device.md](../device.md)
- 数据点：[tag.md](tag.md)
- 事件：[event.md](event.md)
