# 组织表创建指南（Department）

> **执行流程：每个部分独立完成「读文档 → 写数据 → 校验」，所有部分完成后统一执行指令**

组织表（`template: "department"`）用于组织架构、权限分组，如物业部门、管理组等。

---

## 部分 1/3：基础信息

### 写数据

```json
{
  "id": "departments",
  "title": "部门信息",
  "template": "department",
  "function": ["dataAuth"]
}
```

### 校验规则

- `template`：必填，固定值 `"department"`
- `function`：必填，必须为 `["dataAuth"]`

---

## 部分 2/3：表字段（schema.properties）

### 写数据

**预设字段（必须包含）：**

```json
{
  "id": { "key": "id", "type": "string", "controlType": "text", "title": "部门编号", "need": true },
  "name": { "key": "name", "type": "string", "controlType": "text", "title": "部门名称", "need": true }
}
```

**可选预设字段：**

```json
{
  "tableSetting": { "key": "tableSetting", "type": "array", "controlType": "array", "title": "管理表", "need": false },
  "tableDataSetting": { "key": "tableDataSetting", "type": "array", "controlType": "array", "title": "管理表记录", "need": false },
  "users": { "key": "users", "type": "array", "controlType": "relate-multiple", "title": "用户列表", "need": false, "relateTo": "User" }
}
```

---

## 部分 3/3：权限配置

组织表的 `function: ["dataAuth"]` 会自动启用权限管理，无需额外配置。

---

## 最终：组装与执行

```json
{
  "id": "departments",
  "title": "部门信息",
  "template": "department",
  "function": ["dataAuth"],
  "schema": {
    "type": "object",
    "name": "departments",
    "title": "部门信息",
    "properties": {
      "id": { "key": "id", "type": "string", "controlType": "text", "title": "部门编号", "need": true },
      "name": { "key": "name", "type": "string", "controlType": "text", "title": "部门名称", "need": true },
      "users": { "key": "users", "type": "array", "controlType": "relate-multiple", "title": "用户列表", "need": false, "relateTo": "User" }
    },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [
      { "key": "id", "colSpan": 1 },
      { "key": "name", "colSpan": 2 }
    ],
    "tableSchema": [
      { "key": "id" },
      { "key": "name" }
    ]
  }
}
```

### 验证要点

- `tableMajorType` 是否为 `dataAuth`

---

## 关联文档

- 表结构完整：[../references/table-schema.md](../references/table-schema.md)
