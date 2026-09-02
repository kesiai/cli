# 用户管理

用户与角色是平台资源（非数据表），专用命令操作，不走 record-*。

---

## 命令

| 命令 | 说明 |
|------|------|
| `$K user [id]` | 用户详情（无 id = 当前用户，可能为空） |
| `$K users [-f filter] [-l limit]` | 用户列表 |
| `$K user-create -n <名> -p <密码> [--nick-name <昵称>] [--roles <角色...>] [--json <json>]` | 创建用户 |
| `$K user-update <id> [--nick-name] [-p <密码>] [--disabled true/false] [--roles <角色...>] [--clear-roles]` | 更新用户 |
| `$K user-delete <id>` | 删除用户（⚠️ 破坏性；`admin` 拒删） |

---

## 关键语义

| 语义 | 说明 |
|------|------|
| 密码 | `--password` **明文**传入，服务端负责哈希存储；查询永不返回密码字段 |
| 角色绑定 | `--roles` 收**角色 id 或角色名**（可多个/逗号分隔），CLI 解析后提交；**整体替换**语义，不传则不动；全部解绑用 `--clear-roles` |
| 用户名唯一 | 重名平台拒建；CLI 预检会直接报出已存在用户的 id |
| `users` 列表是稀疏投影 | 只有 id/name 等少数字段，**看不到角色绑定**——用 `user <id>` 查详情 |
| 停用 | `--disabled true`（不删数据，账号不可登录） |
| 长尾字段 | 组织字段等通过 `user-create --json '<json>'` 深合并传入 |

---

## 动态组织字段（部门数据权限）

平台每个 `department`（组织）表会在用户上映射一个**同名字段**（字段名 = 组织表 id），值为该组织记录的数组：

```json
{
  "dept_003": [{ "id": "dept_003_r1", "name": "客服部" }]
}
```

- 查组织表：`$K tables` 找 department 类型表 → `$K records <表id>` 取记录 id
- 创建带组织的用户：`$K user-create -n 张三 -p *** --json '{"dept_003":[{"id":"<记录id>","name":"客服部"}]}'`
- 组织字段值里的 id 必须是组织表里真实存在的记录

---

## 常见错误

| 错误 | 原因 | 处理 |
|------|------|------|
| `用户名已存在` | name 重复 | CLI 预检会报出已有用户 id，需要改用 user-update |
| `角色 "X" 不存在` | --roles 传了不存在的角色 | 报错信息附现有角色清单，用其中的 id 或名称 |
| `拒绝删除 admin` | 平台内置管理员 | 不可删 |

---

## 关联文档

- 角色管理：[role.md](role.md)
- 组织表：[../table-guides/department-table-guide.md](../table-guides/department-table-guide.md)
