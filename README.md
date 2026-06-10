# @kesi/cli

KESI IoT 平台命令行工具 — 通过命令行操作 KESI 平台的所有数据。

## 安装

```bash
npm install -g @kesi/cli
```

## 快速开始

### 1. 初始化配置

在项目目录下生成 `.kesirc.json` 配置文件：

```bash
kesi init --url http://your-server:3030/rest --project your-project -u admin -p password
```

或者直接登录保存全局配置：

```bash
kesi login --url http://your-server:3030/rest --project your-project -u admin -p password
```

> 💡 `init` 创建项目级 `.kesirc.json`，`login` 保存全局配置。二者选一即可。

### 2. 验证连接

```bash
# 查看当前配置
kesi config

# 查看当前用户
kesi user
```

### 3. 浏览数据

```bash
# 列出所有表
kesi tables

# 查看某张表的详情
kesi table <tableId>

# 预览某张表的数据
kesi sample <tableId>
```

## 输出格式

所有命令支持 `-o, --output <format>` 选项，默认 `json`（AI 友好）：

| 格式 | 说明 |
|------|------|
| `json` | JSON 格式（默认） |
| `table` | 表格格式 |
| `plain` | 纯文本格式 |

```bash
kesi tables -o table    # 表格输出
kesi tables -o plain    # 纯文本输出
```

---

## 命令总览

| 类别 | 命令 | 说明 |
|------|------|------|
| **通用** | `login` / `logout` / `config` / `init` | 认证与配置 |
| **AI** | `scan` / `describe` / `sample` / `seed` | AI 聚合命令 |
| **表管理** | `tables` / `table` / `table-create` / `table-update` / `table-delete` | 表 CRUD |
| **记录管理** | `records` / `record` / `record-create` / `record-update` / `record-delete` / `records-batch-delete` | 记录 CRUD |
| **属性点** | `tags` / `record-tags` | 数据点查询 |
| **时序数据** | `data-latest` / `data-history` | 时序数据查询 |
| **设备控制** | `control-send` / `control-batch` | 下发控制命令 |
| **统计** | `stats-online` | 设备在线统计 |
| **报警规则** | `rules list/get/create/update/delete` | 报警规则管理 |
| **报警事件** | `warnings list/get/confirm/resolve/stats/latest/batch-confirm` | 报警事件管理 |
| **文件** | `file-upload` / `file-info` / `file-delete` | 文件管理 |
| **报表** | `reports` / `report` / `report-create` / `report-update` / `report-delete` / `report-execute` | 报表管理 |
| **用户** | `user` / `users` | 用户查询 |
| **驱动** | `drivers` / `driver` / `driver-schema` | 驱动实例与 schema |
| **通用查询** | `query` / `query-get` | 任意资源查询 |

---

## 命令详解

### 认证与配置

#### `kesi login`

登录 KESI 平台，保存全局配置。

```bash
# 用户名密码登录
kesi login --url http://server:3030/rest --project my-project -u admin -p password

# 直接使用 token
kesi login --url http://server:3030/rest --project my-project -t <token>
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--url <url>` | ✅ | 平台地址 |
| `--project <id>` | ✅ | 项目 ID |
| `-u, --username <user>` | | 用户名 |
| `-p, --password <pass>` | | 密码 |
| `-t, --token <token>` | | 直接使用 token（与用户名二选一） |

#### `kesi logout`

清除全局配置。

#### `kesi config`

查看当前配置信息。

#### `kesi init`

在当前目录创建 `.kesirc.json` 项目级配置文件。

```bash
kesi init --url http://server:3030/rest --project my-project -u admin -p password
kesi init --force  # 覆盖已有配置
```

---

### AI 聚合命令

面向 AI Agent 设计的高层命令，一次获取完整信息。

#### `kesi scan`

导出全库 schema manifest，一次性了解整个数据库结构。

```bash
# 基础用法：仅 schema
kesi scan

# 附带样本数据
kesi scan --with-sample -l 5

# 输出到文件
kesi scan --with-sample --output-file manifest.json

# 跳过 count 查询（大数据量时加速）
kesi scan --with-sample --skip-count
```

| 参数 | 说明 |
|------|------|
| `--with-sample` | 附带每张表的样本数据 |
| `-l, --limit <number>` | 每张表样本数量，默认 3 |
| `--skip-count` | 跳过 count 查询，加速大数据量场景 |
| `--output-file <path>` | 输出到文件 |

**输出结构：**

```json
{
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "tableCount": 10,
  "tables": [
    {
      "id": "device_table",
      "title": "设备表",
      "template": "device",
      "fields": [...],
      "tags": [...],
      "sample": [...]
    }
  ]
}
```

#### `kesi describe <tableId>`

输出单张表的字段级 schema 详情。

```bash
kesi describe device_table
kesi describe device_table --with-tags
```

| 参数 | 说明 |
|------|------|
| `--with-tags` | 包含属性点（tags）信息 |

**输出包含：** 表元信息、字段列表（含 controlType、enum、relate 等）、formSchema、tableSchema、filterSchema、fieldRules、orders。

#### `kesi sample <tableId>`

快速预览表数据。

```bash
kesi sample device_table        # 默认 5 条
kesi sample device_table -l 10  # 取 10 条
```

| 参数 | 说明 |
|------|------|
| `-l, --limit <number>` | 样本数量，默认 5 |

#### `kesi seed`

批量建表 + 灌种子数据。

```bash
kesi seed --file seed.json
kesi seed --json '{"tables":[{"schema":{...},"records":[...]}]}'
```

**seed.json 结构：**

```json
{
  "tables": [
    {
      "schema": {
        "id": "my_table",
        "title": "我的表",
        "template": "common",
        "schema": {
          "properties": {
            "name": { "type": "string", "title": "名称", "controlType": "text", "need": true }
          }
        }
      },
      "records": [
        { "name": "示例数据1" }
      ]
    }
  ]
}
```

---

### 表管理

#### `kesi tables` / `kesi tbl`

查询表列表。

```bash
kesi tables
kesi tables -f '{"template":"device"}' -l 10
kesi tables --sort '{"createTime":-1}' --skip 10
```

| 参数 | 说明 |
|------|------|
| `-f, --filter <json>` | 过滤条件 |
| `-s, --sort <json>` | 排序 |
| `-l, --limit <number>` | 数量限制，默认 50 |
| `--skip <number>` | 跳过数量 |

#### `kesi table <id>`

获取单张表详情（含完整 schema）。

```bash
kesi table device_table
```

#### `kesi table-create`

创建表。

```bash
# 从 JSON 文件创建
kesi table-create --file table-definition.json

# 从命令行 JSON 创建
kesi table-create --json '{"id":"my_table","title":"我的表","template":"common","schema":{"properties":{...}}}'
```

#### `kesi table-update <id>`

更新表。

```bash
kesi table-update my_table --file updated-schema.json
kesi table-update my_table --json '{"title":"新名称"}'
```

#### `kesi table-delete <id>`

删除表。

```bash
kesi table-delete my_table
```

---

### 记录管理

#### `kesi records <table>` / `kesi rec <table>`

查询表记录。

```bash
kesi records my_table
kesi records my_table -f '{"name":"测试"}' -l 10 --with-count
kesi records my_table --sort '{"createTime":-1}' --skip 5
```

| 参数 | 说明 |
|------|------|
| `-f, --filter <json>` | 过滤条件 |
| `-s, --sort <json>` | 排序 |
| `-l, --limit <number>` | 数量限制，默认 50 |
| `--skip <number>` | 跳过数量 |
| `--with-count` | 返回总数 |

#### `kesi record <table> <id>`

获取单条记录。

```bash
kesi record my_table record_id_001
```

#### `kesi record-create <table>`

创建记录。

```bash
# 从文件
kesi record-create my_table --file record.json

# 从命令行 JSON
kesi record-create my_table --json '{"name":"测试"}'
kesi record-create my_table --data '{"name":"测试"}'

# Upsert（存在则更新）
kesi record-create my_table --json '{"id":"001","name":"测试"}' --upsert
```

| 参数 | 说明 |
|------|------|
| `--file <path>` | 从 JSON 文件读取 |
| `--json <json>` | JSON 数据 |
| `--data <json>` | JSON 数据（别名） |
| `--upsert` | 存在则更新 |

#### `kesi record-update <table> <id>`

更新记录。

```bash
kesi record-update my_table record_id --json '{"name":"新名称"}'
kesi record-update my_table record_id --file update.json
```

#### `kesi record-delete <table> <id>`

删除记录。

```bash
kesi record-delete my_table record_id
kesi record-delete my_table record_id --attachment  # 级联删除附件
```

| 参数 | 说明 |
|------|------|
| `--attachment` | 级联删除关联附件 |

#### `kesi records-batch-delete <table> <ids...>`

批量删除记录。

```bash
kesi records-batch-delete my_table id1 id2 id3
```

---

### 属性点（Tags）

> 仅设备表（`template: "device"`）有属性点。

#### `kesi tags <tableId>`

查询表属性点列表。

```bash
kesi tags device_table
```

#### `kesi record-tags <table> <recordId>`

查询某条记录的属性点数据。

```bash
kesi record-tags device_table record_id
```

---

### 时序数据

> 仅设备表有实时/历史时序数据。

#### `kesi data-latest`

查询最新数据。

```bash
# 单设备单属性点
kesi data-latest --device device_id --tag tag_id

# 从文件批量查询
kesi data-latest --file pairs.json

# JSON 直接传入
kesi data-latest --json '[{"deviceId":"d1","tagId":"t1"},{"deviceId":"d2","tagId":"t2"}]'
```

| 参数 | 说明 |
|------|------|
| `--device <id>` | 设备 ID |
| `--tag <id>` | 属性点 ID |
| `--file <path>` | 从文件读取 deviceTagPairs |
| `--json <json>` | JSON 格式的 deviceTagPairs |

#### `kesi data-history`

查询历史数据。

```bash
# 单设备单属性点
kesi data-history --device device_id --tag tag_id --start 1700000000000 --end 1700100000000

# 从文件
kesi data-history --file pairs.json --start 1700000000000 --end 1700100000000

# 限制数量
kesi data-history --device d1 --tag t1 --start 1700000000000 --end 1700100000000 -l 1000
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--start <timestamp>` | ✅ | 开始时间戳（毫秒） |
| `--end <timestamp>` | ✅ | 结束时间戳（毫秒） |
| `--device <id>` | | 设备 ID（与 `--tag` 配合使用） |
| `--tag <id>` | | 属性点 ID |
| `--file <path>` | | 从文件读取 |
| `--json <json>` | | JSON 格式 |
| `-l, --limit <number>` | | 数量限制 |

---

### 设备控制

#### `kesi control-send`

向设备发送控制命令。

```bash
kesi control-send --device device_id --tag tagName --value 1
kesi control-send --device device_id --tag tagName --value 50 --timeout 30
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--device <id>` | ✅ | 设备 ID |
| `--tag <name>` | ✅ | 属性点名称 |
| `--value <value>` | ✅ | 控制值 |
| `--timeout <seconds>` | | 超时时间（秒） |

#### `kesi control-batch`

批量发送控制命令。

```bash
kesi control-batch --file commands.json
kesi control-batch --json '[{"deviceId":"d1","tagName":"switch","value":1}]'
```

---

### 统计

#### `kesi stats-online <tableIds...>`

设备在线统计。

```bash
kesi stats-online device_table1 device_table2
```

---

### 报警系统

报警系统分为**报警规则**和**报警事件**两部分。

#### 报警规则

```bash
# 列表
kesi rules list
kesi rules list -l 20 --with-count

# 详情
kesi rules get <ruleId>

# 创建
kesi rules create -n "温度报警" -l 3 -e true -d "温度超过阈值"

# 更新
kesi rules update <ruleId> -n "新名称" -l 2

# 删除
kesi rules delete <ruleId>
```

**规则参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `-n, --name <name>` | 创建时必填 | 规则名称 |
| `-l, --level <number>` | 创建时必填 | 报警级别 1-4（1=提示, 2=一般, 3=重要, 4=严重） |
| `-e, --enable <boolean>` | | 是否启用，默认 true |
| `-d, --description <text>` | | 描述 |

#### 报警事件

```bash
# 列表（支持多种过滤）
kesi warnings list
kesi warnings list --level 3 --status 0 --limit 20
kesi warnings list --rule-id <ruleId> --device-id <deviceId>
kesi warnings list --keyword "温度"

# 别名
kesi w list

# 详情
kesi warnings get <warningId>

# 确认报警
kesi warnings confirm <warningId>
kesi warnings confirm <warningId> -n "已确认处理" --user-id <userId>

# 标记恢复
kesi warnings resolve <warningId> -n "设备已恢复正常"
kesi warnings resolve <warningId>  # 别名: kesi w rv

# 批量确认
kesi warnings batch-confirm id1 id2 id3 -n "批量确认"

# 统计
kesi warnings stats

# 最新报警
kesi warnings latest
kesi warnings latest -l 20
```

**报警列表过滤参数：**

| 参数 | 说明 |
|------|------|
| `--level <number>` | 报警级别 1-4 |
| `--status <number>` | 状态：0=未处理, 1=已确认, 2=已解决, 3=已关闭 |
| `--rule-id <id>` | 按规则 ID 过滤 |
| `--device-id <id>` | 按设备 ID 过滤 |
| `--keyword <text>` | 关键词搜索 |

---

### 文件管理

```bash
# 上传文件
kesi file-upload ./photo.jpg
kesi file-upload ./doc.pdf --name "文档" --mime application/pdf

# 查看文件信息
kesi file-info <fileId>

# 删除文件
kesi file-delete <fileId>
```

**上传参数：**

| 参数 | 说明 |
|------|------|
| `--name <name>` | 自定义文件名 |
| `--mime <type>` | MIME 类型 |

> 💡 上传后返回文件 ID，可在创建记录时填入 `upload` 类型字段的值中。

---

### 报表管理

```bash
# 列表
kesi reports
kesi reports -l 20

# 详情
kesi report <reportId>

# 创建报表
kesi report-create -n "月度统计" -t chart -d "月度数据统计报表"
kesi report-create --file report-def.json

# 执行报表
kesi report-execute <reportId>
kesi report-execute <reportId> --json '{"month":"2026-01"}'
kesi report-execute <reportId> --file params.json

# 更新报表
kesi report-update <reportId> -n "新名称" -d "新描述"

# 删除报表
kesi report-delete <reportId>
```

**报表类型：** `chart`（图表）、`table`（表格）、`pivot`（透视表）。

---

### 用户管理

```bash
# 当前用户信息
kesi user

# 用户列表
kesi users
kesi users -f '{"isSuper":true}' -l 10
```

---

### 驱动管理

#### `kesi drivers`

列出所有驱动实例。

```bash
kesi drivers
```

#### `kesi driver <id>`

获取驱动实例详情（含 device.settings 连接参数）。

```bash
kesi driver <driverId>
```

#### `kesi driver-schema <driverType>`

获取驱动的 schema 定义（点位字段、settings 配置等）。

```bash
kesi driver-schema modbus
kesi driver-schema opcua
```

> ⚠️ **创建设备表前必须查询驱动 schema**，不同驱动的点位字段完全不同。

---

### 通用资源查询

KESI 平台内置 63 个 schema，每个都有 `resource` 字段（API 路径）。通过 `query` 命令可以查询任意资源。

#### `kesi query <resource>`

```bash
# 查询角色
kesi query core/role

# 带过滤和分页
kesi query core/user -f '{"isSuper":true}' -l 10 --with-count

# 带排序
kesi query core/log --sort '{"createTime":-1}' -l 20
```

| 参数 | 说明 |
|------|------|
| `-f, --filter <json>` | 过滤条件 |
| `-s, --sort <json>` | 排序 |
| `-l, --limit <number>` | 数量限制，默认 20 |
| `--skip <number>` | 跳过条数 |
| `--with-count` | 返回总数 |

#### `kesi query-get <resource> <id>`

```bash
kesi query-get core/role role_id
```

**常用资源路径：**

| resource | 说明 |
|----------|------|
| `core/t/schema` | 数据表 |
| `core/user` | 用户 |
| `core/role` | 角色 |
| `core/log` | 操作日志 |
| `core/systemVariable` | 系统变量 |
| `core/catalog` | 数据分组 |
| `driver/driverInstance` | 驱动实例 |
| `warning/warning` | 报警 |
| `report/report` | 报表 |

---

## 表类型体系

KESI 平台有 6 种表类型，通过 `template` 字段区分：

| template | 名称 | 特点 |
|----------|------|------|
| `common` | 常规表 | 通用数据表，最常用 |
| `device` | 设备表 | 有属性点(tags)、时序数据、可远程控制 |
| `department` | 组织表 | 用于组织架构管理 |
| `settable` | 集合表 | 跨表整合多个表数据 |
| `tableMapping` | 映射表 | 同步外部数据库表到平台 |
| `tableClasses` | 班次表 | 内置班次编号、周期、时间 |

> ⚠️ 只有设备表（`device`）有 tags、时序数据和控制命令。

---

## 典型工作流

### 场景 1：浏览现有数据

```bash
kesi scan                    # 全库概览
kesi describe <tableId>      # 某张表详情
kesi sample <tableId>        # 预览数据
```

### 场景 2：管理记录

```bash
kesi records <table>         # 查看记录
kesi record-create <table> --json '{"name":"test"}'   # 创建
kesi record-update <table> <id> --json '{"name":"new"}'  # 更新
kesi record-delete <table> <id>   # 删除
```

### 场景 3：创建设备表

```bash
# 1. 查看可用驱动
kesi drivers

# 2. 查看驱动详情（获取连接参数）
kesi driver <driverId>

# 3. 查看驱动 schema（获取点位字段定义）
kesi driver-schema modbus

# 4. 组装 JSON 创建设备表
kesi table-create --file device-table.json

# 5. 验证
kesi table <newTableId>
kesi tags <newTableId>
```

### 场景 4：处理报警

```bash
kesi warnings latest              # 查看最新报警
kesi warnings list --status 0     # 未处理的报警
kesi warnings confirm <id> -n "已派人处理"  # 确认
kesi warnings resolve <id> -n "已修复"      # 标记恢复
kesi warnings stats                # 报警统计
```

---

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 单次运行测试
npm run test:run

# 测试覆盖率
npm run test:coverage
```

## License

MIT
