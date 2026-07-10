# 报表管理

报表是对表数据的统计分析视图，可定义查询条件和展示方式。

## 命令

### 列出报表

```bash
$K reports [-f filter] [-l limit]
```

### 获取报表详情

```bash
$K report <id>
```

### 创建报表

```bash
$K report-create -n "月度统计" -t "chart" -d "设备运行月度统计" -c '{"tableId":"iot_devices","type":"bar"}'
```

| 参数 | 说明 |
|------|------|
| `-n` / `--name` | 报表名称（必填） |
| `-t` / `--type` | 报表类型（必填），如 chart、table、pivot |
| `-d` / `--description` | 描述 |
| `-c` / `--config` | 报表配置 JSON |

### 更新报表

```bash
$K report-update <id> -n "新名称" -c '{"type":"line"}'
```

### 删除报表

```bash
$K report-delete <id>
```

### 执行报表

```bash
$K report-execute <id> --json '{"month":"2024-06"}'
$K report-execute <id> --file params.json
```

## 关联

- 报表通常基于表数据，表管理见 [table.md](table/table.md)
