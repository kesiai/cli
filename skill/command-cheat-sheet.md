# 命令速查表

> 本文档包含所有 CLI 命令的分类说明。按需查阅，无需记忆。

---

## 快速开始

```bash
# 本 skill 自带 CLI（已打包到 cli/index.cjs）
K=node cli/index.cjs

$K config                 # 查看解析后的配置
$K tables                 # 列出所有表
```

---

## 通用命令

| 命令 | 说明 |
|------|------|
| `$K config` | 查看解析后的配置 |
| `$K help` | 显示帮助信息 |

**凭据优先级：** CLI 参数 > 环境变量

```bash
# 环境变量方式
KESI_BASE_URL=http://<平台>/rest KESI_PROJECT=<projectId> KESI_TOKEN=<token> $K tables

# CLI 参数方式（优先级更高）
$K tables --base-url http://<平台>/rest --project-id <projectId> --token <token>
```

---

## AI 聚合命令（推荐优先使用）

| 命令 | 用途 | 详细说明 |
|------|------|----------|
| `$K scan [--with-sample] [-o file]` | 全库 schema 导出 | AI 一次了解全局 |
| `$K describe <tableId> [--with-tags]` | 字段级 schema | AI 据此生成表单/表格 |
| `$K sample <tableId> [-l 5]` | 预览数据 | AI 理解数据长什么样 |
| `$K seed --file seed.json` | 批量建表+灌种子数据 | 一键创建表和数据 |

---

## 命令总览

| 领域 | 命令数 | 说明 | 详细文档 |
|------|--------|------|----------|
| 表管理 | 5 | 表 CRUD、schema 查询 | [references/table-management.md](references/table-management.md) |
| 记录管理 | 6 | 记录 CRUD、批量操作 | [references/record.md](references/record.md) |
| 设备/数据 | 10 | 数据点、时序数据、设备控制、在线统计、驱动管理 | [references/device.md](references/device.md) |
| 报警系统 | 12 | 报警规则、报警事件、报警归档 | [references/warning.md](references/warning.md) |
| 文件管理 | 3 | 文件上传、下载、删除 | [references/file.md](references/file.md) |
| 报表管理 | 6 | 报表 CRUD、执行、导出 | [references/report.md](references/report.md) |
| 用户管理 | 2 | 用户 CRUD、角色管理 | [references/user.md](references/user.md) |

---

## 表管理

| 命令 | 说明 |
|------|------|
| `$K tables` | 列出所有表 |
| `$K table <id>` | 查看表详情（schema） |
| `$K table-create --file schema.json` | 创建表 |
| `$K table-update <id> --file schema.json` | 修改表（⚠️ 完全替换，非合并） |
| `$K table-delete <id>` | 删除表（⚠️ 连带删除所有记录，不可恢复） |

---

## 记录管理

| 命令 | 说明 |
|------|------|
| `$K records <table> [-f filter] [-l limit] [--with-count]` | 查询列表 |
| `$K record <table> <id>` | 查单条 |
| `$K record-create <table> --data k=v ...` | 新增（支持 --json / --file / --upsert） |
| `$K record-update <table> <id> --data k=v` | 修改（⚠️ 完全替换，非合并） |
| `$K record-delete <table> <id>` | 删除 |
| `$K records-batch-delete <table> <id1> <id2>` | 批量删除 |

**查询过滤示例：**

```bash
$K records devices -f 'status="running" -online=true' -l 10
$K records devices -f 'name~空调' -l 5        # 模糊搜索
```

详见 [references/query-syntax.md](references/query-syntax.md)

---

## 设备与数据点

### 数据点查询

| 命令 | 说明 |
|------|------|
| `$K tags <tableId>` | 查看表的所有数据点定义 |
| `$K record-tags <table> <recordId>` | 查看记录的数据点值 |

### 时序数据

| 命令 | 说明 |
|------|------|
| `$K data-latest --device <id> --tag <tagId>` | 最新数据 |
| `$K data-history --device <id> --tag <tagId> --start <ms> --end <ms>` | 历史数据 |

### 设备控制

| 命令 | 说明 |
|------|------|
| `$K control-send --device <id> --tag <tag> --value <val>` | 单个控制 |
| `$K control-batch --file commands.json` | 批量控制 |

### 在线统计

| 命令 | 说明 |
|------|------|
| `$K stats-online <tableId1> <tableId2> ...` | 统计在线设备数 |

### 驱动管理

| 命令 | 说明 |
|------|------|
| `$K drivers` | 列出驱动实例 |
| `$K driver <id>` | 驱动详情（含 device.settings 连接参数） |
| `$K driver-schema <driverType>` | 驱动 schema（点位字段定义、枚举值） |
| `$K driver-catalog [--search <kw>]` | 驱动目录（可安装列表，含已安装注记） |
| `$K driver-create -n <名称> -t <驱动key>` | 创建驱动实例（名称唯一；-t 填目录 name 字段） |
| `$K driver-install <instanceId>` | 安装驱动（默认阻塞等待到完成；--no-wait 只触发） |
| `$K driver-install-info <taskId>` | 查询安装进度（--no-wait/超时续查） |
| `$K driver-update-config <id> --file/--json` | 更新配置（device 块 settings/tags/commands/events） |
| `$K driver-restart <id>` | 重启驱动（配置变更后生效），轮询到 running |
| `$K driver-delete <id>` | 删除实例（绑定的设备表会失效，需用户确认） |

> 自动创建驱动的流程编排见 [references/workflow-driver-create.md](references/workflow-driver-create.md)，命令细节见 [references/driver-create.md](references/driver-create.md)

---

## 报警系统

### 报警规则

| 命令 | 说明 |
|------|------|
| `$K warning-rules <tableId>` | 查看表的报警规则 |
| `$K warning-rule <tableId> <ruleId>` | 查看单条报警规则 |
| `$K warning-rule-create --file rule.json` | 创建报警规则 |
| `$K warning-rule-update <id> --file rule.json` | 修改报警规则 |
| `$K warning-rule-delete <id>` | 删除报警规则 |

### 报警事件

| 命令 | 说明 |
|------|------|
| `$K warnings [-f filter] [-l limit]` | 查询当前报警事件 |
| `$K warning <id>` | 查看单条报警事件 |
| `$K warning-handle <id> --handle-result <结果>` | 处理报警 |
| `$K warning-archive <id>` | 归档报警 |

### 报警统计

| 命令 | 说明 |
|------|------|
| `$K warning-stats --start <ms> --end <ms>` | 报警统计 |

---

## 文件管理

| 命令 | 说明 |
|------|------|
| `$K files [-f filter] [-l limit]` | 查询文件列表 |
| `$K file-upload --file <本地路径>` | 上传文件 |
| `$K file-delete <id>` | 删除文件 |

---

## 报表管理

| 命令 | 说明 |
|------|------|
| `$K reports` | 查询报表列表 |
| `$K report <id>` | 查看报表详情 |
| `$K report-create --file report.json` | 创建报表 |
| `$K report-update <id> --file report.json` | 修改报表 |
| `$K report-delete <id>` | 删除报表 |
| `$K report-execute <id> [--format pdf|excel|html]` | 执行报表并导出 |

---

## 用户管理

| 命令 | 说明 |
|------|------|
| `$K users` | 查询用户列表 |
| `$K user <id>` | 查看用户详情 |

---

## 通用资源查询

平台内置 63 个 schema，每个都有 `resource` 字段（API 路径）。

```bash
$K query <resource> [-f filter] [-s sort] [-l limit] [--with-count]
$K query-get <resource> <id>
```

**常用资源路径：**

| 资源路径 | 说明 |
|----------|------|
| `core/t/schema` | 数据表定义 |
| `core/setting` | 系统设置（包含报警类型 warningkind） |
| `core/user` | 用户管理 |
| `core/role` | 角色管理 |
| `core/department` | 组织架构 |
| `core/systemVariable` | 数据字典 |
| `core/catalog` | 数据分组 |
| `core/log` | 操作日志 |
| `syslog/log` | 系统日志 |
| `core/t/<tableId>/d` | 数据表记录（需替换 tableId） |
| `driver/driverInstance` | 驱动实例 |
| `driver/instruct` | 指令状态 |
| `driver/event` | 驱动事件 |
| `warning/warning` | 报警事件 |
| `warning/warning/archive` | 报警归档 |
| `warning/rule` | 报警规则 |
| `report/report` | 报表管理 |
| `ds/interface` | 数据接口定义 |
| `flow/flow` | 工作流 |
| `flow/flowTask/currentUser` | 我的任务 |

---

## 输出格式

所有命令支持 `-o json|table|plain`，默认 `json`（AI 友好）。

```bash
$K tables -o table       # 表格格式输出
$K tables -o plain       # 纯文本输出
$K tables -o json        # JSON 格式（默认）
```

---

## 关联文档

- 查询语法：[references/query-syntax.md](references/query-syntax.md)
- 表管理详细：[references/table-management.md](references/table-management.md)
- 记录管理详细：[references/record.md](references/record.md)
- 设备管理详细：[references/device.md](references/device.md)
- 报警管理详细：[references/warning.md](references/warning.md)
