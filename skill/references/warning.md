# 报警系统

KESI 报警系统分为两部分：**报警规则**（定义什么条件触发报警）和 **报警事件**（实际触发的报警记录）。

## 报警规则（Rules）

定义监控条件，当设备数据满足条件时自动产生报警。

### 命令

```bash
# 列出所有规则
$K rules list [-f filter] [-l limit] [--with-count]

# 获取规则详情
$K rules get <id>

# 创建规则
$K rules create -n "温度超限" -l 高 -d "温度超过80度触发"

# 更新规则
$K rules update <id> -n "新名称" -l 中

# 删除规则
$K rules delete <id>
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `-n` / `--name` | 规则名称（必填，重名 400 名称重复） |
| `-l` / `--level` | 报警级别：`低` / `中` / `高`（⚠️ 中文字符串——发数字 400 `RuleTableSchema.level string`，真机验证） |
| `-e` / `--enable` | 是否启用（默认 true；注意 GET 不回显该字段） |
| `-d` / `--description` | 描述 |

### ⚠️ 表级报警规则 vs 独立报警规则

有两种报警规则：

1. **独立报警规则**（`/warning/rule` API）：通过 `$K rules create` 管理
2. **表级报警规则**（嵌入表 schema 的 `warning` 字段）：在创建设备表时定义

### 表级报警规则结构

⚠️ **字段名是 `warningname`，不是 `name`**
⚠️ **`level` 是字符串类型（`"低"/"中"/"高"` 或 `"1"/"2"/"3"`），不是数字**

```json
{
  "warning": {
    "rules": [
      {
        "id": "temp_high",
        "warningname": "温度超限报警",
        "description": "当温度超过80℃时触发",
        "level": "高",
        "alert": true,
        "handle": true,
        "logic": {
          "logic": { ">": [{ "var": "temperature" }, 80] },
          "type": "jsonlogic"
        },
        "fieldName": ["temperature"],
        "disable": false
      }
    ]
  }
}
```

#### WarningRule 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 规则ID |
| `warningname` | string | ⚠️ 规则名称（不是 `name`） |
| `description` | string | 报警描述 |
| `level` | string | ⚠️ 报警级别：`"低"` / `"中"` / `"高"` 或 `"1"` / `"2"` / `"3"` |
| `alert` | boolean | 报警次数提醒 |
| `handle` | boolean | 报警处理 |
| `logic` | object | 报警逻辑 `{ logic, type: "jsonlogic"|"jsLogic" }` |
| `fieldName` | string[] | 关联字段名 |
| `disable` | boolean | 是否禁用 |
| `type` | string[] | 报警分类ID |
| `listType` | string | 范围限定：`"nolimit"` / `"black"` / `"white"` |
| `whiteList` | string[] | 白名单设备ID |
| `blackList` | string[] | 黑名单设备ID |
| `delayFull` | any | 报警触发周期 |
| `delay` | number | 延时提醒时长（秒） |
| `interval` | number | 报警合并间隔（秒） |
| `deadZone` | number | 报警死区 |
| `triggerLimit` | number | 报警次数上限 |
| `executionSetting` | object | 执行有效期设置 |

## 报警事件（Warnings）

设备数据触发规则后产生的报警记录；也支持手动创建（测试/补录场景）。

### ⚠️ 触发语义（真机验证 2026-09-03）

规则引擎**不消费 REST 写入的数据**：`core/data/save` 写入越限值（表级 jsonlogic 规则、点位级阈值规则均不触发）。报警只在驱动采集管线里自动产生——本部署无运行设备时，报警只能手动创建后走确认/处理/归档流程。

### ⚠️ 查询限制

**`warning/warning` 不支持 `projectAll`**，查询时必须用 `project` 指定返回字段（MongoDB 投影格式）。CLI 已内置处理，无需手动指定。归档库同理（不带 project 只返回 id）。

### 命令（真机验证 2026-09-03）

```bash
# 列出报警
$K warnings list [--level 低/中/高] [--status 未确认/已确认] [--processed 未处理/已处理] [--table-id <id>] [--device-id <id>] [--keyword <text>] [-l limit]

# 查归档库（一键归档/定时归档移入的报警，主列表不再可见）
$K warnings list --archived

# 获取报警详情
$K warnings get <id>

# 手动创建报警（level 是中文字符串，发数字直接 400）
$K warnings create -d "泵房温度超高" -l 高 --table <tableId> --device <recordId>

# 确认报警（status → 已确认，平台自动记录 confirmTime）
$K warnings confirm <id> [--user-id admin]

# 处理报警（processed → 已处理）
$K warnings handle <id> [--user-id admin]

# 批量确认（平台无批量端点，CLI 逐条执行）
$K warnings batch-confirm <id1> <id2>

# 一键归档：按条件移入归档库（无条件 = 归档全部）
$K warnings archive [--status 已确认] [--processed 已处理] [--table <tableId>]

# 归档恢复（把归档库的报警移回主列表）
$K warnings restore <id>

# 报警统计（按表计数数组；真路径 /stats）
$K warnings stats

# 最新报警（如后端不支持 /latest 端点，自动降级为 list + 时间倒序）
$K warnings latest [-l 10]
```

### 报警事件字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 报警 ID |
| `time` | string | 报警时间（ISO 8601） |
| `type` | string[] | 报警规则类型 ID 列表 |
| `level` | string | 级别：`"低"` / `"中"` / `"高"` |
| `status` | string | 确认状态：`"未确认"` / `"已确认"` |
| `processed` | string | 处理状态：`"未处理"` / `"已处理"` |
| `table` | object | ⚠️ 数据表（服务端增富为完整表文档，`table.id` 取表 ID；过滤必须用 `{table:{id}}` 嵌套对象等值，`table.id` 点路径 400） |
| `tableDataID` | string | ⚠️ 设备 ID（服务端从 `tableData` 对象派生，大写 D） |
| `desc` | string | 报警描述 |
| `remark` | string | 处理备注 |
| `fields` | WarningField[] | 触发报警的点位列表（完整 tag 对象） |
| `confirmUser` | {id, name} | 确认人（服务端增富为完整用户文档） |
| `confirmTime` | string | 确认时间 |

**创建时的关联字段用 `{id}` 对象形态**：`--table` → `table:{id}`、`--device` → `tableData:{id}`（服务端增富；发平铺 `tableId`/`tableDataId` 会被静默丢弃，真机验证）。

### 报警级别

全平台统一**中文字符串** `"低"` / `"中"` / `"高"`（独立规则集合与报警事件的 Go schema 都是 string，发数字一律 400——真机验证 2026-09-03；旧文档「CLI 独立规则用数字 1-4」是错的）。

### 报警状态流转（真机验证 2026-09-03）

`status`（确认）与 `processed`（处理）是**两个独立维度**，都是中文字符串，没有数字编码、没有「已解决」态：

```
status:    未确认 → 已确认            （warnings confirm）
processed: 未处理 → 已处理            （warnings handle）
任意状态   主列表 → 归档库 → 主列表    （warnings archive / restore）
```

⚠️ 平台没有「恢复/解决」状态——旧文档的 `resolve`（status:2）是错误描述，已移除；「恢复」只指归档恢复（`warnings restore`）。

## 关联

- 设备表通过 `function: ["device", "warning", "computed"]` 启用报警
- 设备管理见 [device.md](device.md)
