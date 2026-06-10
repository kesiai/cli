# 表管理

表是 KESI 平台的核心数据结构，所有业务数据都存储在表中。

## 命令

### 列出所有表

```bash
kesi tables [-f filter] [-s sort] [-l limit] [--skip skip]
```

### 获取表详情

```bash
kesi table <id>
```

### 创建表

```bash
# 通过 JSON 文件
kesi table-create --file schema.json

# 通过命令行 JSON
kesi table-create --json '{"id":"myTable","title":"测试","template":"common","schema":{...}}'
```

### 更新表

```bash
kesi table-update <id> --file schema.json
kesi table-update <id> --json '{"title":"新标题"}'
```

### 删除表

```bash
kesi table-delete <id>
```

⚠️ 删除表会同时删除所有记录数据，不可恢复。

## 表类型（template）

| template | 说明 | function 数组 |
|----------|------|--------------|
| `common` | 常规数据表 | `[]` |
| `device` | 设备表（有属性点、时序数据） | `["device", "warning", "computed"]` |
| `department` | 组织表 | `["dataAuth"]` |
| `settable` | 集合表 | `["settable"]` |
| `tableMapping` | 映射表 | `["tableMapping"]` |
| `tableClasses` | 班次表 | `["tableClasses"]` |

## Schema 结构

详见 [table-schema.md](table-schema.md)，包含：
- 创建表的完整 JSON 结构
- formLayout + colSpan 布局系统
- function 配置项总表
- 字段属性说明

## 字段规则

详见 [field-rules.md](field-rules.md)，包含：
- 交互规则（mutualRules）：条件触发 show/hide/setRequire/setValue 等
- 字段校验（validations）：正则表达式校验

## 控件类型

24 种控件类型，每种都有字段定义和记录值示例：

详见 [controls/](controls/) 目录。

## 批量创建（seed）

```bash
kesi seed --file seed.json
```

seed.json 格式：
```json
{
  "tables": [
    {
      "schema": { /* 完整表定义 */ },
      "records": [ /* 种子记录数组 */ ]
    }
  ]
}
```

---

## 特殊表创建流程

### 映射表（tableMapping）

映射表用于同步外部数据库的表结构。创建流程：

**Step 1: 创建空映射表**

```bash
kesi table-create --json '{
  "id": "my_mapping",
  "title": "ERP物料映射",
  "template": "tableMapping",
  "function": ["tableMapping"],
  "schema": {
    "type": "object",
    "name": "my_mapping",
    "title": "ERP物料映射",
    "properties": {}
  }
}'
```

⚠️ 映射表初始无字段（`properties: {}`），字段来源于外部数据库映射。

**Step 2: 同步映射字段**

```bash
# 查看已有的表，确定要映射的源表
kesi tables

# 调用映射同步接口获取源表字段配置
# （需要后端配置了外部数据库连接）
```

映射字段同步通过 `GET /core/t/schema/mapping/{mappingTableId}` 接口获取，返回的 schema 包含：
- `properties` — 字段定义
- `formSchema` — 表单布局
- `tableSchema` — 列表配置

**Step 3: 更新映射表 schema**

```bash
# 将同步获取的字段写入映射表
kesi table-update my_mapping --json '{"schema":{"type":"object","name":"my_mapping","title":"ERP物料映射","properties":{ ... 同步的字段 ... }}}'
```

### 集合表（settable）

集合表用于跨表聚合数据。创建流程：

**Step 1: 查看已有表**

```bash
kesi tables
```

**Step 2: 创建集合表并指定聚合的表**

集合表有 3 个内置字段（id、table、tabledata），并通过 `settable` 配置指定要聚合的表：

```bash
kesi table-create --json '{
  "id": "my_collection",
  "title": "数据聚合表",
  "template": "settable",
  "function": ["settable"],
  "settable": {
    "table": [
      { "id": "demo_common", "title": "演示普通表" },
      { "id": "demo_device", "title": "演示设备表" }
    ]
  },
  "schema": {
    "type": "object",
    "name": "my_collection",
    "title": "数据聚合表",
    "properties": {
      "id": { "key": "id", "type": "string", "controlType": "text", "title": "编号", "need": true },
      "table": { "key": "table", "type": "string", "controlType": "text", "title": "被集合表", "need": true },
      "tabledata": { "key": "tabledata", "type": "string", "controlType": "text", "title": "被集合表记录编号", "need": true }
    },
    "formSchema": [
      { "key": "id" },
      { "key": "table" },
      { "key": "tabledata" }
    ],
    "tableSchema": [
      { "key": "id", "canOrder": false },
      { "key": "table", "canOrder": false }
    ],
    "filterSchema": []
  }
}'
```

**settable 配置结构：**

```json
{
  "settable": {
    "table": [
      { "id": "表ID", "title": "表名称" },
      ...
    ]
  }
}
```

⚠️ `settable.table` 中的 `id` 和 `title` 必须与实际表一致，可通过 `kesi tables` 查询获取。

### 设备表（device）

详见 [device.md](../device.md)，包含完整的驱动配置、点位、指令、事件、计算节点、报警规则结构。

---

## 关联

- 记录管理见 [record.md](../record.md)
- 设备表详细配置见 [device.md](../device.md)
- 报警规则见 [warning.md](../warning.md)
