# 查询语法参考

> KESI 平台所有查询接口使用统一的 JSON 查询格式。本参考适用于 CLI 命令和前端 HTTP 客户端。

## 核心格式

所有查询参数放在一个 JSON 对象中，URL 编码为 `?query=<encoded_json>`。

```
GET /core/t/{tableId}/d?query={"limit":20,"sort":{"name":1},"filter":{"status":{"$eq":"online"}}}
```

**关键规则：**
- 数据表记录：`core/t/{tableId}/d`（**必须加 `/d` 后缀**）
- 平台资源：`core/user`、`core/role` 等（**无 `/d` 后缀**）
- **所有字段都可用于过滤**，不受中台 filterSchema 配置限制

---

## 一、查询参数

### 1.1 分页

| 参数 | 类型 | 说明 |
|------|------|------|
| `skip` | number | 跳过记录数（偏移量） |
| `limit` | number | 返回记录数上限 |
| `withCount` | boolean | 是否返回总数（总数通过响应 header `count` 返回） |

```bash
# CLI
kesi records energy_meter --skip 20 --limit 10 --with-count
```

```json
// 查询 JSON
{ "skip": 20, "limit": 10, "withCount": true }
```

### 1.2 排序

`sort` 对象，字段名 → 方向值。

| 方向值 | 说明 |
|--------|------|
| `1` | 升序 (ASC) |
| `-1` | 降序 (DESC) |

```bash
# CLI：按创建时间降序
kesi records energy_meter -s '{"createTime":-1}'
```

```json
// 单字段排序
{ "sort": { "createTime": -1 } }

// 多字段排序（用 sorts 数组）
{ "sorts": [{ "name": 1 }, { "createTime": -1 }] }
```

### 1.3 字段投影

`project` 对象，控制返回哪些字段。`1` 表示包含。

```json
// 只返回 id、name、status
{ "project": { "id": 1, "name": 1, "status": 1 } }
```

也可用 `projectAll: true` 返回所有字段。

### 1.4 分组

```json
{ "groupBy": "building" }
```

---

## 二、过滤操作符

`filter` 对象放在查询 JSON 中。支持以下操作符：

### 2.1 比较操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `$eq` | 等于 | `{ "status": { "$eq": "online" } }` |
| `$ne` | 不等于 | `{ "disable": { "$ne": true } }` |
| `$gt` | 大于 | `{ "temperature": { "$gt": 30 } }` |
| `$gte` | 大于等于 | `{ "createTime": { "$gte": "2024-01-01" } }` |
| `$lt` | 小于 | `{ "temperature": { "$lt": 100 } }` |
| `$lte` | 小于等于 | `{ "count": { "$lte": 50 } }` |

**简写：** 直接写值等同于 `$eq`：

```json
{ "status": "online" }  // 等同于 { "status": { "$eq": "online" } }
```

### 2.2 集合操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `$in` | 在列表中 | `{ "type": { "$in": ["sensor", "gateway"] } }` |
| `$nin` | 不在列表中 | `{ "status": { "$nin": ["closed", "deleted"] } }` |

### 2.3 模糊匹配

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `$regex` | 正则匹配 | `{ "name": { "$regex": "空调" } }` |
| `$not` | 取反 | `{ "name": { "$not": { "$regex": "测试" } } }` |

### 2.4 逻辑操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `$and` | 与（所有条件都满足） | `{ "$and": [{ "online": true }, { "disable": { "$ne": true } }] }` |
| `$or` | 或（任一条件满足） | `{ "$or": [{ "status": "online" }, { "status": "idle" }] }` |

**注意：** 同一对象的多个字段默认是 AND 关系，不需要显式写 `$and`：

```json
// 这两个等价
{ "online": true, "building": "A栋" }
{ "$and": [{ "online": true }, { "building": "A栋" }] }
```

**需要 `$or` 或同一字段多个条件时才用逻辑操作符。**

---

## 三、完整查询示例

### 3.1 基础查询

```bash
# CLI：查询前 10 条记录
kesi records energy_meter --limit 10

# 对应的查询 JSON
{ "limit": 10, "withCount": true }
```

### 3.2 条件过滤

```bash
# CLI：按名称模糊查询
kesi records energy_meter -f '{"name":{"$regex":"空调"}}'

# CLI：按状态精确查询
kesi records energy_meter -f '{"status":{"$eq":"online"}}'

# CLI：多条件（逗号分隔的多个 -f 会合并）
kesi records energy_meter -f '{"online":true,"building":{"$eq":"A栋"}}'
```

```json
// 查询 JSON
{
  "filter": { "online": true, "building": { "$eq": "A栋" } },
  "limit": 50,
  "withCount": true
}
```

### 3.3 排序 + 分页

```bash
# CLI：按时间倒序，每页 20 条，第 2 页
kesi records energy_meter -s '{"createTime":-1}' -l 20 --skip 20
```

```json
{
  "sort": { "createTime": -1 },
  "skip": 20,
  "limit": 20,
  "withCount": true
}
```

### 3.4 组合查询

```bash
# CLI：在线 + 未禁用 + 按类型筛选
kesi records energy_meter -f '{"online":true,"disable":{"$ne":true},"type":{"$in":["sensor","gateway"]}}' -s '{"name":1}' -l 50
```

```json
{
  "filter": {
    "online": true,
    "disable": { "$ne": true },
    "type": { "$in": ["sensor", "gateway"] }
  },
  "sort": { "name": 1 },
  "limit": 50,
  "withCount": true
}
```

### 3.5 时间范围查询

```bash
# CLI：按创建时间范围
kesi records energy_meter -f '{"createTime":{"$gte":"2024-01-01","$lte":"2024-12-31"}}'
```

### 3.6 计数

```bash
# CLI：统计在线设备数
kesi records energy_meter -f '{"online":true}' --limit 1 --with-count
```

也可以用专用的 count 端点：

```
GET /core/t/{tableId}/d/count?query={"where":{"online":true}}
```

---

## 四、系统资源查询

平台内置资源使用相同语法，直接通过 CLI `query` 命令：

```bash
# 查询用户
kesi query core/user --limit 50

# 按用户名过滤用户
kesi query core/user -f '{"name":{"$regex":"admin"}}'

# 查询角色
kesi query core/role --limit 50

# 查询操作日志（按时间倒序）
kesi query core/log -s '{"time":-1}' -l 50

# 查询驱动实例
kesi query driver/driverInstance --limit 50
```

**常用系统资源端点：**

| 资源 | 端点 | 说明 |
|------|------|------|
| 用户 | `core/user` | 字段：id, name, email, phone, status, online, roles |
| 角色 | `core/role` | 字段：id, name, description, permission, disabled |
| 部门 | `core/department` | 字段：id, name, parentId, function |
| 日志 | `core/log` | 字段：id, time, user, type, level, status, message |
| 系统变量 | `core/systemVariable` | 字段：id, name, uid, type, value |
| 数据字典 | `core/catalog` | 字段：id, name, parentId, order |
| 表 Schema | `core/t/schema` | 字段：id, title, template, tableMajorType, recordCount |
| 驱动实例 | `driver/driverInstance` | 字段：id, name, driverType, state |
| 报警事件 | `warning/warning` | 字段：id, time, level, status, processed, desc |
| 报警规则 | `warning/rule` | 字段：id, name, level, enable |
| 报表 | `report/report` | 字段：id, name, reportType, type, interval |

详细字段定义和更多示例 → 见 client skill 的 `client-platform-resources.md`。

---

## 五、前端代码对照

前端项目使用 `createResourceClient` 时，查询参数对应关系：

```typescript
import { createHttpClient, createResourceClient } from '@kesi/client'

const client = createHttpClient({ resource: 'core/t/energy_meter/d' })
const meterApi = createResourceClient<EnergyMeter>({ client, resource: 'core/t/energy_meter/d' })

// CLI:  kesi records energy_meter --limit 10 -s '{"createTime":-1}'
// 前端:
const { items } = await meterApi.query(
  { limit: 10, order: { createTime: 'DESC' } }
)

// CLI:  kesi records energy_meter -f '{"name":{"$regex":"空调"}}'
// 前端:
const { items } = await meterApi.query(
  {},
  { name: { $regex: '空调' } }
)

// CLI:  kesi records energy_meter -f '{"online":true}' --limit 50
// 前端:
const { items, total } = await meterApi.query(
  { limit: 50 },
  { online: { $eq: true } }
)

// CLI:  kesi records energy_meter --limit 1 --with-count -f '{"online":true}'
// 前端:
const count = await meterApi.count({ online: { $eq: true } })
```

**参数映射：**

| CLI 参数 | 前端 QueryFilter | 前端 where |
|----------|-----------------|-----------|
| `--limit 10` | `{ limit: 10 }` | — |
| `--skip 20` | `{ skip: 20 }` | — |
| `-s '{"name":-1}'` | `{ order: { name: 'DESC' } }` | — |
| `-f '{"status":"online"}'` | — | `{ status: { $eq: 'online' } }` |
| `--with-count` | 自动（query 总是返回 total） | — |
