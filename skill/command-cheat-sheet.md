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
| 文件/媒体库 | 4 | 上传（--catalog 定目录）、目录树、目录列表、建目录 | [references/file.md](references/file.md) |
| 数据接口 | 12 | 分组/接口 CRUD、执行 | [references/ds.md](references/ds.md) |
| 报表管理 | 6 | 报表 CRUD、执行、导出 | [references/report.md](references/report.md) |
| 用户/角色 | 10 | 用户 CRUD、角色 CRUD、角色绑定 | [references/user.md](references/user.md) · [references/role.md](references/role.md) |
| 数据字典 | 5 | 字典项 CRUD（全局键值对） | [references/dict.md](references/dict.md) |
| 系统设置 | 3 | 全局配置读、局部更新、字段类型 | [references/setting.md](references/setting.md) |

---

## 表管理

| 命令 | 说明 |
|------|------|
| `$K tables` | 列出所有表 |
| `$K table <id>` | 查看表详情（schema） |
| `$K table-create --file schema.json` | 创建表 |
| `$K table-update <id> --file schema.json` | 修改表（深合并，未传字段保持原值） |
| `$K table-change-id <oldId> <newId>` | 修改表标识（⚠️ 表下记录将无法访问，引用不迁移，不可恢复） |
| `$K table-delete <id>` | 删除表（⚠️ 连带删除所有记录，不可恢复） |

---

## 记录管理

| 命令 | 说明 |
|------|------|
| `$K records <table> [-f filter] [-l limit] [--with-count]` | 查询列表 |
| `$K record <table> <id>` | 查单条 |
| `$K record-create <table> --data k=v ...` | 新增（支持 --json / --file / --upsert） |
| `$K record-update <table> <id> --data k=v` | 修改（深合并，未传字段保持原值） |
| `$K record-change-id <table> <oldId> <newId>` | 修改记录标识（⚠️ 引用/时序不迁移，不可恢复） |
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
| `$K control-send --table <t> --device <id> --command <name> [--params '{}']` | 单个控制（表单写入必带 --params） |
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
| `$K driver-create -n <名称> -t <驱动key>` | 创建驱动实例（名称唯一；-t 必须是 driver-catalog 目录内的 key，目录外禁止创建；集群节点：`--run-mode node --cluster <集群实例id>` 继承其驱动类型与 groupId） |
| `$K driver-install <instanceId>` | 安装驱动（默认阻塞等待到完成；--no-wait 只触发） |
| `$K driver-install-info <taskId>` | 查询安装进度（--no-wait/超时续查） |
| `$K driver-update-config <id> --file/--json` | 更新配置（device 块 settings/tags/commands/events） |
| `$K driver-restart <id>` | 重启驱动（配置变更后生效），轮询到 running |
| `$K driver-delete <id>` | 删除实例（绑定的设备表会失效，需用户确认） |

> 自动创建驱动的流程编排见 [references/workflow-driver-create.md](references/workflow-driver-create.md)，命令细节见 [references/driver-create.md](references/driver-create.md)

---

## 报警系统

> 表级报警规则（嵌在表 schema `warning.rules`）随表定义，详见 [references/device-warning-rule.md](references/device-warning-rule.md)；这里是独立规则与报警事件命令。

### 独立报警规则（warning/rule 集合）

| 命令 | 说明 |
|------|------|
| `$K rules list [-f filter] [-l limit]` | 规则列表 |
| `$K rules get <id>` | 规则详情 |
| `$K rules create -n <名> -l <1-4>` | 创建规则（level 数字 1提示/2一般/3重要/4严重） |
| `$K rules update <id> [-n] [-l]` | 更新规则 |
| `$K rules delete <id>` | 删除规则 |

### 报警事件（真机验证 2026-09-03）

| 命令 | 说明 |
|------|------|
| `$K warnings list [--level/--status/--processed/--table-id/--device-id/--keyword]` | 查询报警（中文枚举：低/中/高、未确认/已确认、未处理/已处理） |
| `$K warnings list --archived` | 查归档库 |
| `$K warnings get <id>` | 报警详情 |
| `$K warnings create -d <描述> -l <低/中/高> [--table --device]` | 手动创建报警 |
| `$K warnings confirm <id>` | 确认（status=已确认） |
| `$K warnings handle <id>` | 处理（processed=已处理） |
| `$K warnings batch-confirm <id...>` | 批量确认（逐条执行） |
| `$K warnings archive [--status --processed --table]` | 一键归档（移入归档库） |
| `$K warnings restore <id>` | 归档恢复（移回主列表） |
| `$K warnings stats` | 按表计数统计 |
| `$K warnings latest [-l 10]` | 最新报警 |

---

## 文件 / 媒体库

| 命令 | 说明 |
|------|------|
| `$K file-upload <路径> [--name] [--mime] [--catalog <目录path>]` | 上传到媒体库，返回 {url}（⚠️ 无删除端点不可逆；不传 --catalog 落项目根，媒体库页不可见） |
| `$K media-dirs` | 媒体库全量目录树 |
| `$K media-ls [path]` | 目录内容（不传=根列表） |
| `$K media-mkdir <dirName> [--catalog <父目录>]` | 建目录（⚠️ 不可删除） |

## 数据接口（ds）

| 命令 | 说明 |
|------|------|
| `$K ds-groups` / `$K ds-group <idOrName>` | 数据源分组列表 / 详情 |
| `$K ds-group-create -n <名> -t <http\|db\|script\|internal> [--json setting]` | 建分组（db/http 型在 --json 配连接信息） |
| `$K ds-group-update <idOrName> [-n/-t/--json]` | 改分组（按键合并） |
| `$K ds-group-delete <idOrName> [--force]` | 删分组（有接口绑定拒删，先删接口；--force 强删留悬挂） |
| `$K ds-apis [-g <组>]` / `$K ds-api <idOrKey>` | 接口列表 / 详情 |
| `$K ds-api-create --group <组> --key <k> -n <名> [setting flags] [-p 名=类型...]` | 建接口（必须给 setting：internal/http 用 --method --url；db 用 --sql；脚本用 --script-file） |
| `$K ds-api-update <idOrKey> [-n] [--group] [-p ...] [--json]` | 改接口（自动补 dataGroup，平台缺它 500） |
| `$K ds-api-delete <idOrKey>` | 删接口 |
| `$K ds-api-exec <key> [-p k=v ...] [--json] [--debug]` | 执行接口返回结果 |

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

## 用户 / 角色管理

| 命令 | 说明 |
|------|------|
| `$K users` / `$K user <id>` | 用户列表（稀疏投影，看不到角色）/ 用户详情 |
| `$K user-create -n <名> -p <密码> [--nick-name] [--roles <角色...>] [--json]` | 创建用户（密码明文；角色收 id 或名） |
| `$K user-update <id> [--nick-name] [-p] [--disabled] [--roles <角色...>] [--clear-roles]` | 更新（roles 整体替换；--clear-roles 全解绑） |
| `$K user-delete <id>` | 删除（admin 拒删） |
| `$K roles` / `$K role <id>` | 角色列表 / 详情 |
| `$K role-create -n <名> [-d <描述>] [--permission <权限...>]` | 创建角色 |
| `$K role-update <id> [-n] [-d] [--permission <权限...>]` | 更新（permission 整体替换） |
| `$K role-delete <id>` | 删除（被用户引用时拒删，先解绑） |

---

## 数据字典

| 命令 | 说明 |
|------|------|
| `$K dicts` / `$K dict <idOrUid>` | 字典列表（不含 value）/ 详情（含 value，接受 id 或编号） |
| `$K dict-create -n <名> --uid <编号> --type <类型> --value <值>` | 创建（type: number/string/boolean/date/object/array；object/array 传 JSON 字符串） |
| `$K dict-update <idOrUid> [--name/--uid/--type/--value]` | 局部更新（value 按生效 type 校验） |
| `$K dict-delete <idOrUid>` | 删除 |

---

## 系统设置

| 命令 | 说明 |
|------|------|
| `$K setting` / `$K setting-fields` | 全量读 / 字段类型速查 |
| `$K setting-update --json '{"language":"zh-CN"}'` | 局部更新（⚠️ 即时影响全平台，按键合并，测完必须还原；CLI 拒改 dependencies 和空 name） |

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
| `core/user` | 用户（写操作用 user-* 命令，不用 query） |
| `core/role` | 角色（写操作用 role-* 命令，不用 query） |
| `core/department` | 组织架构 |
| `core/systemVariable` | 数据字典（字典项全局键值对；写操作用 dict-* 命令，不用 query） |
| `core/catalog` | 数据分组 |
| `core/log` | 用户界面个性化设置存储（**不是操作日志**） |
| `core/t/<tableId>/d` | 数据表记录（需替换 tableId） |
| `driver/driverInstance` | 驱动实例 |
| `driver/instruct` | 指令状态 |
| `driver/event` | 驱动事件 |
| `warning/warning` | 报警事件 |
| `warning/warning/archive` | 报警归档 |
| `warning/rule` | 报警规则 |
| `report/report` | 报表管理 |
| `ds/group` | 数据源分组（写操作用 ds-group-* 命令） |
| `ds/interface` | 数据接口定义（写操作用 ds-api-* 命令） |
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
