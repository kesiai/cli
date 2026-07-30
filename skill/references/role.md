# 角色管理

角色管理涉及角色的创建、权限配置和用户关联。

---

## 命令

| 命令 | 说明 |
|------|------|
| `$K query core/role [-l limit]` | 查询角色列表 |
| `$K query-get core/role <id>` | 查看单个角色详情 |

---

## 角色创建流程

### 流程图

```
1. 查询权限列表（可选）→ 获取所有可用权限
  ↓
2. 组装角色数据 → name, description, permission, disabled
  ↓
3. 执行创建 → $K record-create core/role
```

---

## 角色 JSON 结构

```json
{
  "name": "运维管理员",
  "description": "负责系统运维和配置管理",
  "users": [],
  "disabled": false,
  "permission": [
    "log.view",
    "log.export",
    "setting.view",
    "setting.edit",
    "user.view",
    "user.add",
    "user.edit",
    "role.view",
    "role.add",
    "role.edit"
  ],
  "isBlackList": false
}
```

---

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 角色名称 |
| `description` | string | | 角色描述 |
| `users` | array | | 关联的用户 ID 数组（创建时通常为空 `[]`） |
| `disabled` | boolean | | 是否禁用该角色 |
| `permission` | array | ✅ | 权限列表（字符串数组） |
| `isBlackList` | boolean | | 是否黑名单模式（true 表示 permission 中的权限被排除） |

---

## 权限列表（permission 字段）

权限遵循 `<模块>.<操作>` 的命名格式。

### 权限分类

| 模块 | 操作 | 说明 |
|------|------|------|
| **日志管理** | log.view, log.export | 日志查看、导出 |
| **系统设置** | setting.view, setting.edit | 系统设置查看、编辑 |
| **用户管理** | user.view, user.add, user.edit, user.delete | 用户 CRUD |
| **角色管理** | role.view, role.add, role.edit, role.delete | 角色 CRUD |
| **表管理** | table.view, table.add, table.edit, table.delete | 表 CRUD |
| **数据管理** | data.view | 数据查看 |
| **报警管理** | warning.view, warning.add, warning.edit, warning.delete, warning.ack | 报警 CRUD、确认 |
| **设备管理** | device.view, device.add, device.edit, device.delete | 设备 CRUD |
| **驱动管理** | driverInstance.view, driverInstance.add, driverInstance.edit, driverInstance.delete, driverInstance.reload | 驱动 CRUD、重载 |
| **备份管理** | backup.view, backup.add, backup.delete | 备份管理 |
| **报表管理** | report.view, report.add, report.edit, report.delete | 报表 CRUD |
| **工作流** | flow.view, flow.add, flow.edit, flow.delete | 工作流 CRUD |
| **视频监控** | camera.view, camera.add, ptz.add, playback.view | 摄像头、云台、回放 |
| **审批中心** | examinecenter.user, examinecenter.role | 审批相关 |

### 常用权限组合

```json
// 超级管理员（所有权限）
"permission": ["*"]

// 只读用户
"permission": ["*.view"]

// 运维管理员
"permission": [
  "log.view", "log.export",
  "setting.view", "setting.edit",
  "user.view", "user.add", "user.edit",
  "backup.view", "backup.add", "backup.delete"
]

// 设备管理员
"permission": [
  "device.view", "device.add", "device.edit", "device.delete",
  "driverInstance.view", "driverInstance.add", "driverInstance.edit",
  "warning.view", "warning.ack"
]

// 数据查看员
"permission": [
  "data.view",
  "table.view",
  "report.view"
]
```

---

## 执行创建

```bash
# 方法 1：使用 --json 参数
$K record-create core/role --json '{
  "name": "运维管理员",
  "description": "负责系统运维",
  "permission": ["log.view", "setting.view", "setting.edit"],
  "disabled": false,
  "isBlackList": false
}'

# 方法 2：使用临时文件
TMPFILE=$(mktemp)
cat > $TMPFILE << 'EOF'
{
  "name": "运维管理员",
  "description": "负责系统运维",
  "permission": ["log.view", "setting.view", "setting.edit"],
  "disabled": false,
  "isBlackList": false
}
EOF

$K record-create core/role --file $TMPFILE
rm -f $TMPFILE
```

---

## 校验规则

创建角色前必须校验：

| 校验项 | 规则 |
|--------|------|
| `name` | 必填，角色名称不能重复 |
| `permission` | 必填，权限数组，权限项必须是平台支持的权限 |
| `isBlackList` | 黑名单模式下，permission 表示排除的权限 |

---

## 常见错误

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `角色名称已存在` | name 与现有角色重复 | 修改为唯一名称 |
| `权限不存在` | permission 中有不支持的权限项 | 使用平台支持的权限项 |
| `黑名单配置错误` | isBlackList=true 但 permission 配置不当 | 确认黑名单模式的含义 |

---

## 关联文档

- 用户管理：[user.md](user.md)
- 记录管理：[record.md](record.md)
