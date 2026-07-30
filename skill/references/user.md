# 用户管理

用户管理涉及用户、角色、组织三个实体的关联操作。

---

## 命令

| 命令 | 说明 |
|------|------|
| `$K user` | 查看当前登录用户信息 |
| `$K users [-f filter] [-l limit]` | 查询用户列表 |

---

## 用户创建完整流程

用户创建涉及多个前置查询，按以下顺序执行：

### 流程图

```
1. 查询角色列表 → 获取可用角色
  ↓
2. 查询组织表 → 获取所有 department 类型表
  ↓
3. 组装用户数据 → 包含 roles 和动态组织字段
  ↓
4. 执行创建 → $K record-create core/user
```

---

## 部分 1/3：查询角色列表

### 执行命令

```bash
$K query core/role -l 100
```

### 返回数据（示例）

```json
[
  {
    "id": "63bbe63057ed18243e9d9d02",
    "name": "超级管理员",
    "examineType": "",
    "examineStatus": "",
    "examineObj": null,
    "examineFinal": ""
  },
  {
    "id": "74acc74168fe29354f0e13e13",
    "name": "普通管理员",
    "examineType": "",
    "examineStatus": "",
    "examineObj": null,
    "examineFinal": ""
  }
]
```

### 用途

用户创建时，`roles` 字段需要从这里选择角色 ID。

---

## 部分 2/3：查询组织表（动态字段来源）

### ⚠️ 动态字段机制

用户表中包含**动态组织字段**，字段名直接使用**组织表 ID**。

这些字段来源于平台中所有 `template: "department"` 的组织表。

### 执行命令

```bash
# 方法 1：查询所有 department 类型表
$K query core/t/schema -f 'function=["dataAuth"]'

# 方法 2：通过 scan 查看
$K scan | grep "tableMajorType.*dataAuth"
```

### 返回数据（示例）

假设平台有 2 个组织表：

| 组织表 ID | 组织表名称 | 对应用户字段 |
|-----------|-----------|-------------|
| `dept_003` | 客服部 | `dept_003` |
| `dept_004` | 技术部 | `dept_004` |

**用户表中会自动生成对应的字段：**

```json
{
  "dept_003": [/* 客服部关联数据 */],
  "dept_004": [/* 技术部关联数据 */]
}
```

### 组织字段数据结构

每个组织字段（字段名 = 组织表 ID）的值为数组：

```json
{
  "dept_003": [
    {
      "id": "dept_003",
      "name": "客服部"
    }
  ]
}
```

---

## 部分 3/3：用户数据结构

### 完整用户创建 JSON

```json
{
  "name": "yht",
  "password": "admin123",
  "password2": "admin123",
  "roles": [
    {
      "id": "63bbe63057ed18243e9d9d02",
      "name": "超级管理员"
    }
  ],
  "remark": "备注说明",
  "startTime": {
    "type": "createTime"
  },
  "status": "active",
  "binddingtalk": false,
  "bindwechatee": false,
  "identity": false,
  "dept_003": [
    {
      "id": "dept_003",
      "name": "客服部"
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 用户名 |
| `password` | string | ✅ | 密码 |
| `password2` | string | ✅ | 确认密码（需与 password 相同） |
| `roles` | array | ✅ | 角色关联数组，从 `core/role` 查询 |
| `remark` | string | | 备注说明 |
| `startTime` | object | | 开始时间配置 `{ "type": "createTime" }` |
| `status` | string | | 状态，如 `active` / `inactive` |
| `binddingtalk` | boolean | | 是否绑定钉钉 |
| `bindwechatee` | boolean | | 是否绑定企业微信 |
| `identity` | boolean | | 身份验证 |
| `<组织表ID>` | array | | 动态组织字段，字段名 = 组织表 ID，数量取决于 department 表数量 |

---

## 执行创建

### 命令

```bash
# 方法 1：使用 --json 参数
$K record-create core/user --json '<完整 JSON>'

# 方法 2：使用临时文件
TMPFILE=$(mktemp)
cat > $TMPFILE << 'EOF'
{
  "name": "yht",
  "password": "admin123",
  "password2": "admin123",
  "roles": [...],
  "dept_003": [...]
}
EOF

$K record-create core/user --file $TMPFILE
rm -f $TMPFILE
```

---

## 校验规则

创建用户前必须校验：

| 校验项 | 规则 |
|--------|------|
| `password` 和 `password2` | 必须相同 |
| `roles` | 必须从 `core/role` 中存在的角色选择 |
| `<组织表ID>` | ID 必须在对应组织表中存在 |
| 动态组织字段 | 字段数量必须与 department 表数量一致 |

---

## 常见错误

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `密码不一致` | password ≠ password2 | 确保两次密码相同 |
| `角色不存在` | roles 中的 ID 在 core/role 中不存在 | 先查询 `$K query core/role` |
| `组织字段缺失` | 未包含某个组织表 ID 字段 | 先查询所有 department 表 |
| `组织 ID 不存在` | 组织字段中的 ID 不存在 | 先查询对应组织表的记录 |

---

## 关联文档

- 角色管理：[role.md](role.md)
- 组织表：[../table-guides/department-table-guide.md](../table-guides/department-table-guide.md)
- 记录管理：[record.md](record.md)
