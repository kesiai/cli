# 数据操作模式 · 工作流（场景一）

> 适用于中台数据管理：对内置表、自定义表及记录做增删改查、查询统计、表结构管理。**按需操作，完成后即结束，不创建前端项目。**

---

## Phase 0: 认证

凭据经 params/env 提供（详见 [workflow-full.md](workflow-full.md) 的 Phase 0: 认证）。服务器端 agent 由后端注入 `KESI_TOKEN` 环境变量。

---

## Phase 1: 查看现状

```bash
$K tables                      # 列出所有表
$K scan --with-sample          # 全库概览（表结构 + 样本数据）
$K describe <tableId>          # 某张表的字段级 schema
$K sample <tableId>            # 预览某张表的数据
```

---

## Phase 2: 按需操作数据

### 记录增删改查

```bash
$K records <table> [-f filter] [-l limit] [--with-count]   # 查询列表
$K record  <table> <id>                                     # 查单条
$K record-create <table> --data k=v ...                     # 新增（支持 --json / --file / --upsert）
$K record-update <table> <id> --data k=v                    # (⚠️ 是完全替换操作，不是合并)
$K record-delete <table> <id>                               # 删除
$K records-batch-delete <table> <id1> <id2>                 # 批量删除
```

### 表结构管理（自定义表）

```bash
$K table-create --file schema.json      # 建表（⚠️ 必须遵循 template+function 映射）
$K table-update <id> --file schema.json # 改表 (⚠️ 是完全替换操作，不是合并)
$K table-delete <id>                    # 删表（⚠️ 连带删除全部记录，不可恢复）
```

### 批量建表 + 灌种子数据（可选）

用 `$K seed --file seed.json`，seed.json 结构参考 [workflow-full.md](workflow-full.md) 的 Phase 3.1。

### 通用资源查询（内置表 / 系统资源）

```bash
$K query <resource> [-f filter] [-l limit]    # 如 core/user、core/department、warning/warning
$K query-get <resource> <id>
```

> 记录命令详细参数见 [record.md](record.md)，表命令见 [table-management.md](table-management.md)，内置资源路径见主文档「命令速查 → 通用资源查询」，查询/过滤语法见 [query-syntax.md](query-syntax.md)。

---

## Phase 3: 报告结果，结束

向用户报告本次操作结果（新建/修改/删除了哪些表或记录、查询返回了什么、受影响行数），然后**结束任务**。

> ⚠️ **不要**引导「下一步创建前端项目」。若用户后续明确提出前端需求，再切换为数据+前端模式。
