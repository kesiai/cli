# 班次表创建指南（TableClasses）

> **执行流程：每个部分独立完成「读文档 → 写数据 → 校验」，所有部分完成后统一执行指令**

班次表（`template: "tableClasses"`）用于排班/值班管理。

---

## 部分 1/3：基础信息

### 写数据

```json
{
  "id": "shift_schedule",
  "title": "排班表",
  "template": "tableClasses",
  "function": ["tableClasses"]
}
```

### 校验规则

- `template`：必填，固定值 `"tableClasses"`
- `function`：必填，必须为 `["tableClasses"]`

---

## 部分 2/3：表字段（schema.properties）

### 写数据

**预设字段（必须包含）：**

```json
{
  "classesID": { "key": "classesID", "type": "string", "controlType": "text", "title": "班次编号", "need": true, "unique": true },
  "classesName": { "key": "classesName", "type": "string", "controlType": "text", "title": "班次", "need": true, "unique": true },
  "endCycle": { "key": "endCycle", "type": "string", "controlType": "select-string", "title": "结束周期", "need": true, "enum": ["now", "next"], "enumNames": ["当前周期", "下一周期"] },
  "endTime": { "key": "endTime", "type": "string", "controlType": "time", "title": "结束时间", "need": true, "timeFormat": "HH:mm:ss" },
  "startCycle": { "key": "startCycle", "type": "string", "controlType": "select-string", "title": "开始周期", "need": true, "enum": ["before", "now", "after"], "enumNames": ["前一日", "当前日", "后一日"] },
  "startTime": { "key": "startTime", "type": "string", "controlType": "time", "title": "开始时间", "need": true, "timeFormat": "HH:mm:ss" }
}
```

---

## 部分 3/3：班次配置

班次表的 `function: ["tableClasses"]` 会自动启用班次管理，无需额外配置。

---

## 最终：组装与执行

```json
{
  "id": "shift_schedule",
  "title": "排班表",
  "template": "tableClasses",
  "function": ["tableClasses"],
  "schema": {
    "type": "object",
    "name": "shift_schedule",
    "title": "排班表",
    "properties": {
      "classesID": { "key": "classesID", "type": "string", "controlType": "text", "title": "班次编号", "need": true, "unique": true },
      "classesName": { "key": "classesName", "type": "string", "controlType": "text", "title": "班次", "need": true, "unique": true },
      "startCycle": { "key": "startCycle", "type": "string", "controlType": "select-string", "title": "开始周期", "need": true, "enum": ["before", "now", "after"], "enumNames": ["前一日", "当前日", "后一日"] },
      "startTime": { "key": "startTime", "type": "string", "controlType": "time", "title": "开始时间", "need": true, "timeFormat": "HH:mm:ss" },
      "endCycle": { "key": "endCycle", "type": "string", "controlType": "select-string", "title": "结束周期", "need": true, "enum": ["now", "next"], "enumNames": ["当前周期", "下一周期"] },
      "endTime": { "key": "endTime", "type": "string", "controlType": "time", "title": "结束时间", "need": true, "timeFormat": "HH:mm:ss" }
    },
    "formLayout": { "cols": 3, "labelLayout": "vertical" },
    "formSchema": [
      { "key": "classesID", "colSpan": 1 },
      { "key": "classesName", "colSpan": 1 },
      { "key": "startTime", "colSpan": 1 },
      { "key": "startCycle", "colSpan": 1 },
      { "key": "endTime", "colSpan": 1 },
      { "key": "endCycle", "colSpan": 1 }
    ],
    "tableSchema": [
      { "key": "classesID" },
      { "key": "classesName" },
      { "key": "startTime" },
      { "key": "endTime" }
    ]
  }
}
```

### 验证要点

- `tableMajorType` 是否为 `tableClasses`

---

## 关联文档

- 表结构完整：[../references/table-schema.md](../references/table-schema.md)
