# 角色管理

角色与用户是平台资源（非数据表），专用命令操作，不走 record-*。

---

## 命令

| 命令 | 说明 |
|------|------|
| `$K roles [-f filter] [-l limit]` | 角色列表 |
| `$K role <id>` | 角色详情（看 permission 明细） |
| `$K role-create -n <名> [-d <描述>] [--permission <权限...>]` | 创建角色 |
| `$K role-update <id> [-n <名>] [-d <描述>] [--permission <权限...>]` | 更新角色 |
| `$K role-delete <id>` | 删除角色（⚠️ 破坏性） |

---

## 关键语义

| 语义 | 说明 |
|------|------|
| permission | `"<资源>.<动作>"` 字符串数组（如 `apps.view`）；`--permission` 可多个/逗号分隔，**整体替换**，不传则不动 |
| **角色引用一律用 id** | `name` 是 i18n 字段（返回值随语言变，CLI 已固定 zh-CN），按名做后续匹配不可靠 |
| 重名 | 角色重名**平台不拦**（可建出同名角色）；CLI 预检会拒并报出同名角色 id |
| 删除守卫 | ① 内置「超级管理员」拒删；② 角色仍被用户引用时拒删（报出引用用户，先 user-update 解绑，全部解绑 `--clear-roles`） |
| isBlackList | `true` 时 permission 列表变为**排除**语义（黑名单模式），默认 false |
| 无 permission 的内置角色 | 超级管理员没有 permission 列表 = 全权限 |

---

## 权限词表（`<资源>.<动作>`）

> 以平台前端权限树为准，常用资源如下：

| 资源 | 动作示例 |
|------|---------|
| 日志 | log.view, log.export |
| 系统设置 | setting.view, setting.edit |
| 用户 / 角色 | user.view/add/edit/delete, role.view/add/edit/delete |
| 表 / 数据 | table.view/add/edit/delete, data.view |
| 报警 | warning.view/add/edit/delete, warning.ack |
| 设备 / 驱动 | device.view/add/edit/delete, driverInstance.view/add/edit/delete/reload |
| 报表 / 工作流 | report.view/add/edit/delete, flow.view/add/edit/delete |
| 备份 | backup.view/add/delete |
| 视频 | camera.view/add, ptz.add, playback.view |
| 审批 | examinecenter.user, examinecenter.role |

```json
// 运维管理员
["log.view","log.export","setting.view","setting.edit","user.view","user.add","user.edit"]
// 设备管理员
["device.view","device.add","device.edit","device.delete","warning.view","warning.ack"]
```

---

## 常见错误

| 错误 | 原因 | 处理 |
|------|------|------|
| `permission 格式非法` | 不是 `<资源>.<动作>` 两段式 | 改成如 apps.view |
| `已存在同名角色` | name 重复（平台不拦，CLI 拒） | 换名，或直接用已有角色 id |
| `仍被 N 个用户引用` | 有用户绑着该角色 | 先 user-update <用户id> --roles <保留角色>（全解绑 --clear-roles），再删 |

---

## 关联文档

- 用户管理：[user.md](user.md)
