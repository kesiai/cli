# 映射表创建指南（TableMapping）

> **执行流程：每个部分独立完成「读文档 → 写数据 → 校验」，所有部分完成后统一执行指令**

映射表（`template: "tableMapping"`）用于外部数据库同步，如 ERP/MES 映射。

---

## 部分 1/2：基础信息

### 写数据

```json
{
  "id": "erp_mapping",
  "title": "ERP 数据映射",
  "template": "tableMapping",
  "function": ["tableMapping"]
}
```

### 校验规则

- `template`：必填，固定值 `"tableMapping"`
- `function`：必填，必须为 `["tableMapping"]`

---

## 部分 2/2：表字段（schema.properties）

### 写数据

映射表通常不需要预定义字段，字段由外部数据库映射同步。

```json
{
  "schema": {
    "type": "object",
    "name": "erp_mapping",
    "title": "ERP 数据映射",
    "properties": {},
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [],
    "tableSchema": []
  }
}
```

---

## 最终：组装与执行

```json
{
  "id": "erp_mapping",
  "title": "ERP 数据映射",
  "template": "tableMapping",
  "function": ["tableMapping"],
  "schema": {
    "type": "object",
    "name": "erp_mapping",
    "title": "ERP 数据映射",
    "properties": {},
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [],
    "tableSchema": []
  }
}
```

### 验证要点

- `tableMajorType` 是否为 `tableMapping`

---

## 关联文档

- 表结构完整：[../references/table-schema.md](../references/table-schema.md)
