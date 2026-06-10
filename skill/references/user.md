# 用户管理

查询平台用户信息。

## 命令

### 当前用户

```bash
kesi user
```

返回当前登录用户的信息（ID、用户名、角色、权限等）。

### 用户列表

```bash
kesi users [-f filter] [-l limit]
```

## 用户数据结构

```json
{
  "id": "user-001",
  "username": "admin",
  "isSuper": true,
  "permissions": ["*"],
  "roles": ["admin"]
}
```

## 关联

- 用户字段控件 `user-role` 详见 [controls/user-role.md](table/controls/user-role.md)
- 登录认证见主 Skill 的"通用命令"部分
