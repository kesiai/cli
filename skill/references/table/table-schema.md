# 表 Schema 数据结构

## 创建表（POST /core/t/schema）

```json
{
  "id": "myTable",
  "title": "设备管理",
  "template": "device",
  "function": ["device", "warning", "computed"],
  "schema": {
    "type": "object",
    "name": "myTable",
    "title": "设备管理",
    "properties": {
      "fieldName": {
        "key": "fieldName",
        "type": "string",
        "controlType": "text",
        "title": "字段名",
        "need": true,
        "unique": false
      }
    },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [{ "key": "fieldName", "colSpan": 1 }],
    "tableSchema": [{ "key": "fieldName", "canOrder": true }],
    "filterSchema": [{ "key": "fieldName" }],
    "fieldRules": { "mutualRules": [], "validations": [] }
  }
}
```

### 顶层字段

| 字段 | 说明 |
|------|------|
| `id` | 表 ID（英文标识符） |
| `title` | 显示名称 |
| `description` | 描述（可选） |
| `template` | 表类型，见下方"表类型体系" |
| `function` | 功能模块数组，**决定后端 tableMajorType**（见下方映射表） |
| `schema` | 表结构定义 |
| `device` | 设备配置（仅 template=`device`，见 [device.md](../device.md)） |
| `computed` | 计算节点配置（见 [device.md](../device.md)） |
| `warning` | 报警规则配置（见 [warning.md](../warning.md)） |
| `showField` | 列表显示字段（可选） |
| `icon` | 图标（可选） |

### ⚠️ `function` 数组与表类型映射

`function` 数组中的值决定了后端的 `tableMajorType`，这是表类型识别的关键：

| template | function 数组 | tableMajorType |
|----------|--------------|----------------|
| `common` | `[]` | `normal` |
| `device` | `["device", "warning", "computed"]` | `device` |
| `department` | `["dataAuth"]` | `dataAuth` |
| `tableMapping` | `["tableMapping"]` | `tableMapping` |
| `tableClasses` | `["tableClasses"]` | `tableClasses` |
| `settable` | `["settable"]` | `settable` |

**设备表必须包含 `"device"` 在 function 数组中**，否则后端将识别为普通表。

### 模板预设字段

每种模板会自带预设字段，创建表时 `schema.properties` 中应包含这些字段（用户可在此基础上追加自定义字段）。

#### common（常规表）

| key | title | controlType | need | 备注 |
|-----|-------|-------------|------|------|
| `createTime` | 创建时间 | date | false | `dateType: "createTime", format: "datetime"` |
| `creator` | 创建人 | user-role | false | `userType: "creator"` |
| `text-{random}` | 记录名称 | text | false | `textContent: "text"` |
| `text-{random}` | 记录编号 | text | false | `textContent: "text"` |
| `upload-single-{random}` | 记录附件 | upload | false | |

#### device（设备表）

| key | title | controlType | need | 备注 |
|-----|-------|-------------|------|------|
| `id` | 设备编号 | text | true | `textContent: "text"` |
| `name` | 设备名称 | text | true | `textContent: "text"` |
| `connectTime` | 通信时间 | date | false | |
| `disable` | 是否禁用 | boolean | false | |
| `online` | 在线 | boolean | false | |
| `off` | 断电 | boolean | false | |
| `warnFlag` | 报警状态 | boolean | false | |

#### department（组织表）

| key | title | controlType | need | 备注 |
|-----|-------|-------------|------|------|
| `id` | 部门编号 | text | true | |
| `name` | 部门名称 | text | true | |
| `tableSetting` | 管理表 | array | false | `items: {}` |
| `tableDataSetting` | 管理表记录 | array | false | `items: {}` |
| `users` | 用户列表 | relate-multiple | false | `relateTo: "User"` |

#### tableClasses（班次表）

| key | title | controlType | need | 备注 |
|-----|-------|-------------|------|------|
| `classesID` | 班次编号 | text | true | `unique: true` |
| `classesName` | 班次 | text | true | `unique: true` |
| `endCycle` | 结束周期 | select-string | true | `enum: ["now","next"]`, `enumNames: ["当前周期","下一周期"]` |
| `endTime` | 结束时间 | time | true | `timeFormat: "HH:mm:ss"` |
| `startCycle` | 开始周期 | select-string | true | `enum: ["before","now","after"]`, `enumNames: ["前一日","当前日","后一日"]` |
| `startTime` | 开始时间 | time | true | `timeFormat: "HH:mm:ss"` |

#### settable（集合表）

| key | title | controlType | need | 备注 |
|-----|-------|-------------|------|------|
| `id` | 编号 | text | true | |
| `table` | 被集合表 | text | true | |
| `tabledata` | 被集合表记录编号 | text | true | |

#### tableMapping（映射表）

无预设字段。创建时 `properties: {}`，字段由外部数据库映射同步。

### schema.properties 字段属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `key` | string | 字段标识符 |
| `type` | string | JSON 类型：`string` / `number` / `boolean` / `object` / `array` |
| `controlType` | string | 控件类型，详见 [controls/](controls/) |
| `title` | string | 显示名称 |
| `need` | boolean | 是否必填 |
| `unique` | boolean | 是否唯一 |
| `disabled` | boolean | 是否禁用 |
| `enum` | array | 选项值列表（select 类型使用） |
| `enumNames` | array | 选项显示名列表（与 enum 一一对应） |
| `relate` | object | 关联配置（relate 类型使用） |
| `config` | object | 控件特殊配置 |
| `defaultVal` | any | 默认值 |

### schema 子结构

| 结构 | 用途 |
|------|------|
| `formLayout` | 表单整体布局：`{ cols, labelLayout, maxWidth }`（见下方详细说明） |
| `formSchema` | 表单字段布局，`key` 指定字段，`colSpan` 控制宽度（1-cols） |
| `tableSchema` | 列表表格列配置，`canOrder: true` 启用排序 |
| `filterSchema` | 筛选条件配置 |
| `fieldRules` | 字段规则：交互规则 `mutualRules`、校验规则 `validations`（见 [field-rules.md](field-rules.md)） |
| `orders` | 默认排序，如 `{ "name": "ASC" }` |

### formLayout（表单整体布局）

| 属性 | 类型 | 说明 |
|------|------|------|
| `cols` | number | 列数：`1`（单列）/ `2`（双列）/ `3`（三列，推荐） |
| `labelLayout` | string | **默认 `"vertical"`**（标题在输入框上方，换行显示） |
| `maxWidth` | string | 表单最大宽度：`"sm"`(480px) / `"md"`(640px) / `"lg"`(960px) / `"full"` |

### colSpan（字段宽度）

formSchema 每项可设 `colSpan`，值为 1 到 cols。

⚠️ **核心规则：**
1. **每行的 colSpan 之和必须等于 cols**，不允许出现空白区域
2. **以下控件 colSpan 必须等于 cols（始终独占一整行）**：`rich-text`、`editable-table`、`map`

```json
"formLayout": { "cols": 3, "labelLayout": "vertical" },
"formSchema": [
  { "key": "name", "colSpan": 1 },
  { "key": "status", "colSpan": 1 },
  { "key": "priority", "colSpan": 1 },
  { "key": "description", "colSpan": 3 }
]
```

**控件宽度推荐（与 cols 无关的通用规则）：**

| controlType | 推荐宽度 | 说明 |
|---|---|---|
| text, number, boolean, date, time, rate | 窄（1） | 短输入控件 |
| select-string, select-number, serial-number, link, area | 窄（1） | 紧凑选择控件 |
| user-role, bytes-array, reference, upload, upload-group | 窄（1） | 紧凑控件 / 文件选择按钮 |
| date-range, relate, relate-multiple | 中（2） | 中等宽度 |
| **rich-text, editable-table, map** | **全宽（=cols）** | **强制独占一整行，不可压缩** |

**排列规则**：每行 cols 格，用窄+窄+...、中+窄、全宽 三种组合填满。

**cols=3 时：`1+1+1`、`2+1`、`3`**
```
text(1)+number(1)+rate(1)=3
boolean(1)+date(1)+time(1)=3
date_range(2)+link(1)=3
select_string(1)+select_number(1)+serial_number(1)=3
select_array_string(1)+select_array_number(1)+area(1)=3
relate(2)+user_role(1)=3
relate_multiple(2)+bytes_array(1)=3
upload(1)+upload_group(1)+reference(1)=3
rich_text(3)
editable_table(3)
map(3)
```

**cols=2 时：`1+1`、`2`**
```
text(1)+number(1)=2
date_range(2)=2
select_string(1)+serial_number(1)=2
relate(2)=2
upload(1)+reference(1)=2
rich_text(2)
editable_table(2)
map(2)
```

### function 配置项总表

| function 值 | 配置键 | 说明 |
|---|---|---|
| `device` | `device` | 设备配置（见 [device.md](../device.md)） |
| `warning` | `warning` | 报警规则（见 [warning.md](../warning.md)） |
| `computed` | `computed` | 计算节点（见 [device.md](../device.md)） |
| `dataAuth` | — | 组织表功能（department 模板自带） |
| `tableMapping` | — | 映射表功能（见 [table.md](table.md) 映射表流程） |
| `tableClasses` | — | 班次表功能（tableClasses 模板自带） |
| `settable` | `settable` | 集合表配置：`{ table: [{ id, title }] }`（见 [table.md](table.md)） |
| `syncSettings` | `syncSettings` | 第三方数据同步（⚠️ 需在前端配置） |
| `dataSource` | `dataSource` | API 数据源（⚠️ 需在前端配置） |
| `tablePermission` | `tablePermission` | 记录级权限（⚠️ 需在前端配置） |
| `tableArchive` | `tableArchive` | 数据归档（⚠️ 需在前端配置） |
| `tableClear` | `tableClear` | 数据清理（⚠️ 需在前端配置） |
| `gis` | `gis` | 地理信息（⚠️ 需在前端配置） |

## 查询表返回（GET /core/t/schema/{id}）

创建时传入的内容 + 后端追加字段：

- `uid` — 同 id
- `tableMajorType` — 表类型（normal/device/dataAuth/settable/tableMapping/tableClasses）
- `fieldCount` / `recordCount` — 统计
- `device` — 设备表专属（tags, commands, events, driver 配置）
- `createTime` / `updateTime`

## 创建记录（POST /core/t/{tableId}/d）

只传 `schema.properties` 定义的字段值。设备表记录需两步：先 POST 记录数据，再 POST 设备元数据到 `/core/t/record`。

## 查询记录返回（GET /core/t/{tableId}/d）

记录数据 + 后端注入的系统字段：

- `_settings` — 设备配置、计算属性、报警规则（设备表）
- `_department` — 所属组织
- `_table` — 所属表 ID
- `_title` — 所属表标题
- `createTime` / `creator` / `updateTime` / `modifier`
- `editPermission` / `deletePermission` — 权限标记
