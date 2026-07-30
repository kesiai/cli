# 集合表创建指南（Settable）

> **执行流程：每个部分独立完成「读文档 → 写数据 → 校验」，所有部分完成后统一执行指令**

集合表（`template: "settable"`）用于跨表数据聚合，如综合看板数据源。

---

## 部分 1/3：基础信息

### 写数据

```json
{
  "id": "dashboard_data",
  "title": "看板数据源",
  "template": "settable",
  "function": ["settable"]
}
```

### 校验规则

- `template`：必填，固定值 `"settable"`
- `function`：必填，必须为 `["settable"]`

---

## 部分 2/3：表字段（schema.properties）

### 写数据

```json
{
  "id": { "key": "id", "type": "string", "controlType": "text", "title": "编号", "need": true },
  "table": { "key": "table", "type": "string", "controlType": "text", "title": "被集合表", "need": true },
  "tabledata": { "key": "tabledata", "type": "string", "controlType": "text", "title": "被集合表记录编号", "need": true }
}
```

---

## 部分 3/3：集合配置

```json
{
  "settable": {
    "table": [
      { "id": "table1", "title": "设备表" },
      { "id": "table2", "title": "报警表" }
    ]
  }
}
```

---

## 最终：组装与执行

```json
{
  "id": "dashboard_data",
  "title": "看板数据源",
  "template": "settable",
  "function": ["settable"],
  "schema": {
    "type": "object",
    "name": "dashboard_data",
    "title": "看板数据源",
    "properties": {
      "id": { "key": "id", "type": "string", "controlType": "text", "title": "编号", "need": true },
      "table": { "key": "table", "type": "string", "controlType": "text", "title": "被集合表", "need": true },
      "tabledata": { "key": "tabledata", "type": "string", "controlType": "text", "title": "被集合表记录编号", "need": true }
    },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [
      { "key": "id", "colSpan": 1 },
      { "key": "table", "colSpan": 1 },
      { "key": "tabledata", "colSpan": 1 }
    ],
    "tableSchema": [
      { "key": "id" },
      { "key": "table" }
    ]
  },
  "settable": {
    "table": [
      { "id": "table1", "title": "设备表" },
      { "id": "table2", "title": "报警表" }
    ]
  }
}
```

### 验证要点

- `tableMajorType` 是否为 `settable`

---

## 关联文档

- 表结构完整：[../references/table-schema.md](../references/table-schema.md)
