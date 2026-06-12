# KESI CLI 参考文档索引

> AI Agent 先读本索引定位文档，再按需 Read 对应文件。不要一次性读取所有文件。

---

## 核心资源（references/ 根目录）

| 文件 | 主题 | 说明 |
|------|------|------|
| [device.md](device.md) | 设备管理 | 设备表核心：数据点、时序、远程控制、报警。区分设备表与普通表 |
| [file.md](file.md) | 文件管理 | 文件/媒体上传管理，上传后按 ID 引用 |
| [query-syntax.md](query-syntax.md) | 查询语法 | 统一 JSON 查询格式：filter、sort、limit、skip、操作符 |
| [record.md](record.md) | 记录管理 | 表记录 CRUD（业务数据行） |
| [report.md](report.md) | 报表管理 | 统计分析报表视图 |
| [user.md](user.md) | 用户管理 | 平台用户查询 |
| [warning.md](warning.md) | 报警系统 | 报警规则 + 报警事件两部分 |

## 设备子系统（references/device/）

| 文件 | 主题 | 说明 |
|------|------|------|
| [device/command.md](device/command.md) | 远程指令 | 设备控制指令（启停、阀门开度等） |
| [device/computed.md](device/computed.md) | 计算节点 | 原始数据点派生的计算值（露点、均值、运行时长） |
| [device/event.md](device/event.md) | 设备事件 | 生命周期事件（上线、离线、故障） |
| [device/tag.md](device/tag.md) | 数据点定义 | 核心：设备采集什么数据、如何采集和处理 |
| [device/warning-rule.md](device/warning-rule.md) | 报警规则 | 表级报警规则，支持 jsonlogic 跨数据点复杂逻辑 |

## 表系统（references/table/）

| 文件 | 主题 | 说明 |
|------|------|------|
| [table/table.md](table/table.md) | 表管理 | 表 CRUD、schema 查询 |
| [table/table-schema.md](table/table-schema.md) | 表 Schema 结构 | 创建/定义表的 JSON schema（POST 格式） |
| [table/field-rules.md](table/field-rules.md) | 字段规则 | 交互规则（mutualRules）+ 字段校验（validations） |

## 字段控件类型（references/table/controls/）

> 24 种控件类型，每个文件定义一种字段的 schema 格式。**按需读取**——只在规划表结构时查阅具体控件。

| 控件类型 | 文件 | 说明 |
|---------|------|------|
| text | [controls/text.md](table/controls/text.md) | 单行文本 |
| number | [controls/number.md](table/controls/number.md) | 数字输入 |
| boolean | [controls/boolean.md](table/controls/boolean.md) | 布尔开关 |
| date | [controls/date.md](table/controls/date.md) | 日期选择 |
| time | [controls/time.md](table/controls/time.md) | 时间选择 |
| date-range | [controls/date-range.md](table/controls/date-range.md) | 日期范围 |
| select-string | [controls/select-string.md](table/controls/select-string.md) | 单选下拉（字符串值） |
| select-number | [controls/select-number.md](table/controls/select-number.md) | 单选下拉（数值） |
| select-array-string | [controls/select-array-string.md](table/controls/select-array-string.md) | 多选下拉（字符串） |
| select-array-number | [controls/select-array-number.md](table/controls/select-array-number.md) | 多选下拉（数值） |
| relate | [controls/relate.md](table/controls/relate.md) | 单条关联 |
| relate-multiple | [controls/relate-multiple.md](table/controls/relate-multiple.md) | 多条关联 |
| reference | [controls/reference.md](table/controls/reference.md) | 跨表引用 |
| rich-text | [controls/rich-text.md](table/controls/rich-text.md) | 富文本编辑器（colSpan=cols） |
| editable-table | [controls/editable-table.md](table/controls/editable-table.md) | 可编辑子表（colSpan=cols） |
| map | [controls/map.md](table/controls/map.md) | 地图定位（colSpan=cols） |
| upload | [controls/upload.md](table/controls/upload.md) | 文件上传 |
| upload-group | [controls/upload-group.md](table/controls/upload-group.md) | 图片上传组 |
| area | [controls/area.md](table/controls/area.md) | 省市区选择 |
| link | [controls/link.md](table/controls/link.md) | 超链接 |
| rate | [controls/rate.md](table/controls/rate.md) | 星级评分 |
| serial-number | [controls/serial-number.md](table/controls/serial-number.md) | 自动编号 |
| bytes-array | [controls/bytes-array.md](table/controls/bytes-array.md) | 字节数组 |
| user-role | [controls/user-role.md](table/controls/user-role.md) | 用户选择 |

## 模板（references/templates/）

| 文件 | 说明 |
|------|------|
| [templates/seed-template.md](templates/seed-template.md) | seed.json 完整结构模板（common 表 + device 表） |

## 按场景速查

| 场景 | 推荐阅读顺序 |
|------|------------|
| 创建普通表 | table/table.md → table/table-schema.md → 查阅对应 controls/*.md → templates/seed-template.md |
| 创建设备表 | device.md → device/tag.md → table/table.md → 查阅 controls/*.md → templates/seed-template.md |
| 查询数据 | query-syntax.md → record.md |
| 报警配置 | warning.md → device/warning-rule.md |
| 文件上传 | file.md → controls/upload.md |
