# 数据接口（ds/*）

平台「业务模块-数据接口」的 CLI 面。模型是两层：**数据源分组**（ds/group，决定接口怎么取数：HTTP / 数据库 / 脚本 / 平台内部）→ **数据接口**（ds/interface，挂在分组下，有唯一 key）→ **执行**（`POST ds/p/<key>`，body 传参数）。

```
ds-group (分组: http/db/script/internal)
   └── ds-api (接口: key + setting 按分组类型 + variableSchema 参数)
          └── ds-api-exec (POST /ds/p/<key> {参数})
```

## 命令

### 分组

| 命令 | 说明 |
|------|------|
| `$K ds-groups` | 分组列表（id/name/type/remark/setting） |
| `$K ds-group <idOrName>` | 分组详情 |
| `$K ds-group-create -n <名> -t <类型> [--remark] [--json <setting>]` | 创建（类型四选一：http/db/script/internal） |
| `$K ds-group-update <idOrName> [-n] [-t] [--remark] [--json]` | 更新（按键合并） |
| `$K ds-group-delete <idOrName> [--force]` | 删除（**有接口绑定时拒删**，见守卫） |

### 接口

| 命令 | 说明 |
|------|------|
| `$K ds-apis [-g <组idOrName>]` | 接口列表（key/name/分组/是否有 setting/参数签名） |
| `$K ds-api <idOrKey>` | 接口详情（接受 id 或 key） |
| `$K ds-api-create --group <idOrName> --key <k> -n <名> [setting flags] [-p 参数...]` | 创建 |
| `$K ds-api-update <idOrKey> [-n] [--group] [-p 参数...] [--json]` | 更新（按键合并；--json 的键并入现有 setting，不会丢 method/url） |
| `$K ds-api-delete <idOrKey>` | 删除 |
| `$K ds-api-exec <key> [-p k=v ...] [--json {...}] [--debug]` | 执行并返回结果 |

## 创建接口的 setting（按分组类型给）

创建**必须提供 setting**（快捷 flags、`--json` 至少其一；两者同传时 **--json 的键合并覆盖** flags 生成的同名键，其余保留）——没有 setting 的接口能建成功但一执行就报 `Get "": unsupported protocol scheme ""`，CLI 直接拒绝这种半成品。

| 分组类型 | 快捷 flags | 生成的 setting |
|----------|-----------|---------------|
| `internal`（平台内部 REST） | `--method GET --url /core/role` | `{method, url}`；url 是平台相对路径 |
| `http`（外部 HTTP） | `--method GET --url /path` + 分组 setting.baseUrl | `{method, url}`；完整 URL = 分组 baseUrl + url |
| `db`（数据库） | `--sql "SELECT ..." [--send-type query] [--table t]` | `{sql, sendType, tableName?, rawMode:false, exOr:false, tags:[]}` |
| `script`（Node 脚本） | `--script-file 脚本.js` | `{type:"Node", content:<文件内容>}` |

复杂键（headers、body、authorization、params 等）用 `--json` 补充，与快捷 flags 组合使用（如 `--method GET --url /core/role --json '{"params":{...}}'`，method/url 来自 flags、params 来自 --json）；完整形状参考 `$K ds-api <现成接口id>`。

**参数**（variableSchema）：`-p 名称=类型`，可多个，类型五选一 string/number/boolean/object/array。http/internal 型参数要在 setting.params 里引用才会传给目标（如 `"params":{"query":[{"key":"limit","value":"{{limit}}"}]}`，`{{参数名}}` 是占位语法）。

## 常用套路

```bash
# 内部数据：查角色（可带 limit 参数）
$K ds-group-create -n "内部查询" -t internal
$K ds-api-create --group "内部查询" --key queryRoles -n "查角色" \
  --method GET --url /core/role -p limit=number \
  --json '{"params":{"query":[{"key":"limit","value":"{{limit}}"}]}}'
$K ds-api-exec queryRoles -p limit=2

# 清理（顺序：先接口后分组）
$K ds-api-delete queryRoles
$K ds-group-delete "内部查询"
```

## 关键语义（真机验证，2026-09-03）

- **key 全库唯一**（重复创建 → 400 标识重复）；执行 URL 就是 `ds/p/<key>`，key 会被 URL 编码（中文 key 平台收但别用）
- **dataGroup 服务端自动增富**：创建只需 `dataGroup:{id}`，服务端校验分组存在性（不存在 → 400 所属数据分组不存在）并存入整份分组文档
- **⚠️ PATCH 接口必须带 dataGroup**：不带直接 500「服务器发生错误」（带 id 或 key 都救不了）。`ds-api-update` 自动补当前分组，调用方无感
- **setting 是单个顶层键**：平台按键合并意味着裸 PATCH 传部分 setting 会静默丢掉其余键（只传 params → method/url 没了，执行报 unsupported protocol scheme）。CLI 创建/更新的 `--json` 都已做键级合并覆盖，部分传参安全
- **⚠️ 删分组不查接口绑定**：静默成功，组下接口全部悬挂（分组名变 undefined）且无法修复。`ds-group-delete` 有绑定先拒删并列出接口；确要强删用 `--force`
- **⚠️ GET 不存在的 id 返回空对象**（Go 零值，不 404）：`ds-group` / `ds-api` 详情已做判空提示
- 分组重名不拦：按名称解析时重名会报错，此时用 id
- `--force` 之外无逃生口：破坏性后果一律前置拦截

## 常见错误

| 报错 | 原因 | 处理 |
|------|------|------|
| `缺少接口配置 setting` | 创建时没给 --method/--url、--sql、--script-file 或 --json | 按分组类型补快捷 flags 或 --json |
| `API 错误 (400): 标识重复` | key 已被占用 | 换 key，或 ds-api-update 改已有接口 |
| `API 错误 (400): 所属数据分组不存在` | --group 指向已删除的分组 | ds-groups 确认后重建分组 |
| `API 错误 (400): 分组类型字段无效` | -t 不在四枚举内 | http/db/script/internal |
| `API 错误: 发送请求错误 … unsupported protocol scheme` | 接口 setting.url 为空或形态错 | 补 --url；http 型还要在分组 setting 配 baseUrl |
| `分组 … 下还有 N 个接口` | 删除守卫拦住 | 先 `ds-api-delete` 组内接口；或 `--force` 强删（接口悬挂不可修复，不推荐） |
