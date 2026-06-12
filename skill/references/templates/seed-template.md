# seed.json 模板参考

> 本文档包含完整 seed.json 结构示例，供 Phase 3 建表时参考。

## common 表模板

```json
{
  "tables": [
    {
      "schema": {
        "id": "<表ID>",
        "title": "<表标题>",
        "template": "common",
        "function": [],
        "schema": {
          "type": "object",
          "name": "<表ID>",
          "title": "<表标题>",
          "properties": {
            "<fieldKey>": {
              "key": "<fieldKey>",
              "type": "<类型>",
              "controlType": "<控件类型>",
              "title": "<字段标题>",
              "need": true
            }
          },
          "formLayout": { "cols": 3, "labelLayout": "vertical" },
          "formSchema": [
            { "key": "<fieldKey>", "colSpan": 1 }
          ],
          "tableSchema": [
            { "key": "<fieldKey>", "canOrder": true }
          ]
        }
      },
      "records": [
        { "<fieldKey>": "<值>" }
      ]
    }
  ]
}
```

## device 表模板

```json
{
  "tables": [
    {
      "schema": {
        "id": "<表ID>",
        "title": "<表标题>",
        "template": "device",
        "function": ["device", "warning", "computed"],
        "schema": {
          "type": "object",
          "name": "<表ID>",
          "title": "<表标题>",
          "properties": {
            "id": { "key": "id", "type": "string", "controlType": "text", "textContent": "text", "title": "设备编号", "need": true },
            "name": { "key": "name", "type": "string", "controlType": "text", "textContent": "text", "title": "设备名称", "need": true },
            "connectTime": { "key": "connectTime", "type": "string", "controlType": "date", "title": "通信时间" },
            "disable": { "key": "disable", "type": "boolean", "controlType": "boolean", "title": "是否禁用" },
            "online": { "key": "online", "type": "boolean", "controlType": "boolean", "title": "在线" },
            "off": { "key": "off", "type": "boolean", "controlType": "boolean", "title": "断电" },
            "warnFlag": { "key": "warnFlag", "type": "boolean", "controlType": "boolean", "title": "报警状态" }
          },
          "formLayout": { "cols": 3, "labelLayout": "vertical" },
          "formSchema": [
            { "key": "id", "colSpan": 1 },
            { "key": "name", "colSpan": 1 },
            { "key": "connectTime", "colSpan": 1 },
            { "key": "disable", "colSpan": 1 },
            { "key": "online", "colSpan": 1 },
            { "key": "off", "colSpan": 1 },
            { "key": "warnFlag", "colSpan": 1 }
          ],
          "tableSchema": [
            { "key": "id" },
            { "key": "name" },
            { "key": "online" },
            { "key": "warnFlag" }
          ]
        },
        "device": {
          "driver": "<驱动名>",
          "driverType": "<驱动类型>",
          "driverName": "<驱动名称>",
          "driverExampleId": "<from kesi drivers>",
          "groupId": "<from kesi driver>",
          "driverGroupId": "<from kesi driver>",
          "emulator": false,
          "settings": { "<连接参数>": "<值>" },
          "tags": [
            { "id": "<tagId>", "name": "<tag名称>", "policy": "save", "<点位字段>": "<值>" }
          ]
        },
        "computed": { "tags": [] },
        "warning": { "rules": [] }
      },
      "records": [
        { "id": "<设备ID>", "name": "<设备名称>" }
      ]
    }
  ]
}
```

## 关键校验清单

- [ ] `template` 与 `function` 映射正确（device → `["device", "warning", "computed"]`）
- [ ] 设备表包含 7 个固定预设字段
- [ ] `formLayout.colSpan` 之和 = `cols`
- [ ] `rich-text`/`editable-table`/`map` 的 `colSpan = cols`
- [ ] `device.driverExampleId` 来自 `kesi drivers` 输出
- [ ] `device.tags` 字段符合 `kesi driver-schema <type>` 的必填要求
