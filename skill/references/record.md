# 记录管理

记录是表中存储的实际业务数据。每个记录包含 schema 中定义的字段值，以及后端注入的系统字段。

## 命令

### 查询记录列表

```bash
kesi records <table> [-f filter] [-s sort] [-l limit] [--skip skip] [--with-count]
```

参数说明：
- `-f` / `--filter` — 过滤条件 JSON，如 `'{"status":"running"}'`
- `-s` / `--sort` — 排序，如 `'{"name":1}'`（1=ASC，-1=DESC）
- `-l` / `--limit` — 返回条数，默认 20
- `--skip` — 跳过条数（分页）
- `--with-count` — 返回总记录数（在响应头 count 中）

### 获取单条记录

```bash
kesi record <table> <id>
```

### 创建记录

```bash
# 通过 JSON 文件
kesi record-create <table> --file data.json

# 通过命令行 JSON
kesi record-create <table> --json '{"name":"设备A","status":"running"}'

# 通过 --data 简写（key=value 格式）
kesi record-create <table> --data name=设备A --data status=running

# upsert 模式（存在则更新）
kesi record-create <table> --json '{"name":"设备A"}' --upsert
```

### 更新记录

```bash
kesi record-update <table> <id> --json '{"status":"stopped"}'
kesi record-update <table> <id> --data status=stopped
```

### 删除记录

```bash
kesi record-delete <table> <id>
kesi record-delete <table> <id> --attachment  # 同时删除关联附件
```

### 批量删除

```bash
kesi records-batch-delete <table> <id1> <id2> <id3>
```

## 记录值格式

每个控件的记录值格式不同，详见 [controls/](table/controls/) 目录。

常用类型快速参考：

| controlType | 记录值示例 |
|-------------|-----------|
| text | `"温湿度传感器-A01"` |
| number | `42` |
| boolean | `true` |
| rich-text | `"<p>内容</p>"` |
| select-string | `"running"` |
| select-array-string | `["tag1", "tag3"]` |
| date | `"2024-06-15"` |
| upload | `["file-id-001"]` |
| relate | `"record-id-string"` |

## 后端注入的系统字段

查询记录时后端会自动附加：

| 字段 | 说明 |
|------|------|
| `id` | 记录 ID |
| `_table` | 所属表 ID |
| `_title` | 所属表标题 |
| `_department` | 所属组织 |
| `_settings` | 设备配置（设备表） |
| `createTime` / `updateTime` | 时间戳 |
| `creator` / `modifier` | `{id, name}` |
| `editPermission` / `deletePermission` | 权限标记 |

## 关联

- 表管理见 [table.md](table/table.md)
- 设备表记录的额外操作见 [device.md](device.md)
