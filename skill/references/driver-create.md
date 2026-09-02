# 驱动创建与管理（driver-create）

> 驱动全生命周期命令参考：目录查询 → 创建实例 → 安装 → 配置 → 重启 → 验证 → 删除。
> AI 自动创建驱动的流程编排见 [workflow-driver-create.md](workflow-driver-create.md)。

## 命令总览

| 命令 | 说明 | 写操作 |
|------|------|--------|
| `$K driver-catalog [--search <kw>]` | **驱动目录**（平台可安装的驱动列表，含已安装注记） | ❌ |
| `$K drivers` | **驱动实例**列表（已创建/已安装的） | ❌ |
| `$K driver <id>` | 实例详情（含 `device.settings` 连接参数） | ❌ |
| `$K driver-schema <driverType>` | 驱动 schema（driver/model/device 三块字段定义，决定配置放哪层） | ❌ |
| `$K driver-create -n <名称> -t <驱动key>` | 创建驱动实例（集群节点加 `--run-mode node --cluster <集群实例id>`） | ✅ |
| `$K driver-install <instanceId>` | 安装驱动（默认阻塞等待到完成） | ✅ |
| `$K driver-install-info <taskId>` | 查询安装进度（`--no-wait`/超时后续查） | ❌ |
| `$K driver-update-config <instanceId> --file/--json` | 更新配置（device 块；校验 tags/commands/events 归属与必填 settings） | ✅ |
| `$K driver-restart <instanceId>` | 重启驱动（配置变更后生效） | ✅ |
| `$K driver-delete <instanceId>` | 删除实例 | ✅ |

⚠️ **`drivers`（实例）≠ `driver-catalog`（目录）**：目录是"平台上能装什么"，实例是"已经装了什么"。

## ⚠️ 字段名陷阱（最高优先级规则）

驱动目录条目中：

| 目录字段 | 含义 | 示例 |
|----------|------|------|
| `name` | **驱动 key**（创建实例用这个） | `"modbus-tcp-driver"` |
| `driverType` | **分类路径**（仅用于展示分组） | `"行业驱动/电力"` |

**`driver-create -t` 填目录的 `name`（驱动 key），绝对禁止填分类路径**（如"行业驱动/电力"）。
`driver-catalog` 输出已把分类改名为 `category`，直接用输出中的 `name` 字段即可。

## ⚠️ 目录外驱动禁止创建（硬规则）

**`-t` 的驱动 key 必须来自 `$K driver-catalog` 的输出；平台目录里没有的驱动，禁止调用 `driver-create`**（平台没有可安装的驱动包，创建了也无法安装运行）。

- CLI 已内置强制校验：目录中无此 key 直接报错 `平台驱动目录中没有 "xxx"，禁止创建`，并附相近候选
- 目录零匹配时的正确做法：**如实告知用户平台没有该驱动**（可列相近候选），换目录内驱动或联系平台管理员上架，**不得换名盲试、不得硬造 key**
- 测试驱动（`test`）不在目录中属预期——它不走 `driver-create`，用 [workflow-full.md](workflow-full.md#测试驱动配置) 的固定配置

## 驱动目录

```bash
$K driver-catalog                    # 全量
$K driver-catalog --search modbus    # 关键词过滤（匹配 key/描述/分类）
```

输出条目：

```json
{
  "name": "modbus-tcp-driver",     // 驱动 key（--type 用这个）
  "category": "通用驱动",           // 分类路径（勿当类型用）
  "order": 1,
  "description": "Modbus TCP 协议驱动",
  "version": "1.2.0",
  "localVersion": "1.1.0",          // 已安装的本地版本（可能缺失）
  "url": "https://.../driver.zip",  // 安装包地址（安装时自动解析）
  "installed": true,                // 是否已有实例
  "installedInstanceId": "69f1...",
  "installedState": "running"
}
```

`installed: true` 且 `installedState: "running"` 时优先建议复用现有实例，不要重复创建。

## 创建实例

```bash
$K driver-create -n "Modbus TCP 驱动-01" -t modbus-tcp-driver
$K driver-create -n "西门子 S7" -t s7-driver --run-mode one --distributed all
$K driver-create -n "..." -t ... --file payload.json   # 完整 payload 逃生舱（与 flags 深合并）
```

| 字段 | 默认 | 说明 |
|------|------|------|
| `-n, --name` | 必填 | 实例名称，**全局唯一** |
| `-t, --type` | 必填* | 驱动 key（目录的 `name`）；集群节点模式可省略（自动继承 `--cluster` 集群的驱动类型） |
| `--version` | 目录解析 | 驱动版本 |
| `--run-mode` | `one` | `one` / `cluster` / `node` |
| `--cluster` | - | 集群实例 id，**仅 `--run-mode node` 时必填**（见下方集群节点创建） |
| `--distributed` | `all` | `all` / `average` / `lazy` |

输出：`{id, name, driverType, driverVersion, runMode, groupId?, distributed, hint}`（`groupId` 仅集群节点返回，= 所选集群的 groupId）。

### 集群节点创建

`--run-mode node`（集群节点）表示把驱动挂到一个已存在的【集群】下运行，流程与前端一致：

1. `$K drivers` 找 `runMode: "cluster"` 的集群实例（没有就先创建一个 `--run-mode cluster` 的集群驱动）
2. `$K driver-create -n "<节点名称>" --run-mode node --cluster <集群实例id>`（`-t` 可省略）
3. 照常 `$K driver-install <instanceId>` 安装（集群节点安装与其集群相同的驱动类型）

CLI 内部处理（无需手工传 groupId）：

- 校验 `--cluster` 指向的实例 `runMode === "cluster"`，否则报错
- **driverType 继承集群实例的 `driverType`**（显式 `-t` 与集群不一致时报错拦截）
- **把集群实例的 `groupId` 随创建 payload 传递**（其余模式 groupId 由后端创建时生成，CLI/前端不传）

⚠️ **创建纪律**（防"名称已存在"错误，曾因违反此规则出过线上 bug）：

1. 创建前 CLI 自动预检名称唯一性，重名直接报已有实例 id —— **复用该实例，不要换名字盲试**
2. 创建前 CLI 自动校验驱动 key 在目录中存在，目录外驱动直接拒绝（见上方硬规则）
3. **创建成功后必须记录返回的 `id`**，后续所有保存走 `driver-update-config`（PATCH 更新）
4. 任何失败路径**禁止退回"重新创建"**——记录已存在，再 POST 必然重名报错
5. 重试 = 重试失败的那一步（如重跑 `driver-install` 复用同一 instanceId），不是重做整个创建

## 安装与进度

```bash
$K driver-install <instanceId>                    # 默认阻塞等待到完成（timeout 300s）
$K driver-install <instanceId> --no-wait          # 只触发，立即返回 taskId
$K driver-install <instanceId> --timeout 600      # 调整超时
$K driver-install-info <taskId>                   # 续查进度
```

安装包 url 自动从驱动目录解析，**允许为空**（后端按驱动 key 解析安装包，前端同样传空串）；仅安装外部/定制包时才需要 `--url`。

**安装状态机**：`download（下载）→ install（安装）→ run（启动）`，进度 0-100。

进度响应语义（`GET /driver/installInfo/{taskId}`）：

- 响应形如 `{download?: {progress, err}, install?: {progress, outInfo, err}, run?: {progress, outInfo, err}}`
- ⚠️ **阶段完成后对应字段会从响应中消失**——`download` 不见了不是错误，是下载完成了
- 完成判定：`run.progress === 100`
- 失败判定：任一**存在字段**的 `err` 非空
- `driver-install` 命令已内置以上判定，进度走 stderr，stdout 输出最终 JSON：

```json
{ "instanceId": "69f1...", "taskId": "t1...", "status": "completed", "stage": "run", "state": "running", "verify": "ok" }
```

- `status`: `completed` / `failed` / `timeout`（failed/timeout 时 exitCode=1，但仍输出 JSON）
- `verify`: `ok`（serviceList 中找到该实例）/ `service-missing`（安装完成但服务未起来 → 用 `driver-restart`）
- 超时输出 `taskId`，用 `driver-install-info <taskId>` 续查
- **失败重试：重跑 `driver-install -i <同一instanceId>`，绝不重新 create**

## 驱动 schema 与配置生成

⚠️ **schema 需安装完成后才能获取**（未安装时查询会 404/为空）——顺序固定为：install 完成 → `driver-schema`。

```bash
$K driver-schema modbus-tcp-driver
```

返回三个配置块（真机验证的实际结构，非标准 JSON Schema）：

```json
{
  "driver": { "settings": {...} },
  "model":  { "tags": {"required": [...], "fields": {...}}, "settings": {...}, "commands": {...} },
  "device": { "tags": {"required": [...], "fields": {...}}, "settings": {...}, "commands": {...} }
}
```

**⚠️ 三块的归属（平台语义，决定什么配置放哪一层）：**

| 块 | 归属 |
|----|------|
| `driver` | 驱动自身配置表单（UI 驱动配置页**只显示**这里定义的字段） |
| `model` | 模型（设备表）的表单——选完驱动建表时要加的配置 |
| `device` | 设备能拿到的配置（设备层默认值）；`driver-update-config` 的 settings 用这个 |

**⚠️ 点位（tags）属于模型/设备层，不属于驱动实例。** 主流协议驱动（modbus / siemens-s7 等）的 `driver` 块只有 settings、没有 tags——驱动实例上没有数据点配置能力。此时任务要求"配数据点"的正确做法：

1. 照常完成 创建 → 安装 → settings 配置 → 重启 → running
2. **不写实例 tags**（`device.tags` 是设备层默认值，不显示在驱动配置页，写了用户看不见）
3. **如实反馈**：「驱动已创建并启动；该驱动的配置没有数据点定义，未配置数据点——数据点属于模型/设备层，建设备表时定义」

CLI 已硬校验兜底：`driver-update-config` 会拒写 driver 块未定义的 tags/commands/events，也会拒绝缺失必填 settings（required 且无 default）的保存。

**settings 填充规则（优先级从高到低）：**

1. schema `required` 字段必须全填（`driver-schema` 输出的 settings 字段带 `required: true` 标记）——**required 留空 = 配置不完整，禁止**
2. 用户话中的事实按 `title`/`description` 映射到字段（"网关 192.168.1.10:502" → `ip/host=192.168.1.10`, `port=502`）
3. `enum` 字段必须取合法值（按 `enum_title`/`title` 匹配，匹配不上问用户）
4. schema 有 `default` 且用户未提 → 用 default
5. 任务说"用默认值"但字段 required 且无 default → **用行业通用默认填上并在报告注明假设**（如 S7 的 `localTsap=0100`/`remoteTsap=0200`、modbus 的 `port=502`），不要留空
6. 其余非 required 且无信息 → 不写（不要发明值）
7. **禁止发明 schema 之外的字段**；用户话里无处安放的事实要明示给用户

**点位草案**（**仅用于设备表/模型层**，见上表 `model.tags`）= [device-tag.md](device-tag.md) 基础字段（`id`/`name`/`policy`/`unit` 等）+ schema `tags.items.properties` 驱动字段（`required` 全填）。用户未给点位清单时起草 2-3 个代表点位并**明示假设**。

## 保存配置 + 重启 + 验证

```bash
# device 块：{settings, tags, commands, events}，与现有配置深合并（数组整体替换）
$K driver-update-config <instanceId> --file config.json
# 示例 config.json（驱动接入任务只写 settings）：
# { "settings": {"ip": "192.168.1.10", "port": 502} }
# tags 只在 schema driver 块定义了 tags 时才写（极罕见，CLI 会拒绝违规写入）

$K driver-restart <instanceId>        # 配置变更后重启生效（内部按 groupId 路由），轮询 state 到 running
$K driver <instanceId>                # 验证 device.settings 已持久化；state 在 $K drivers 列表中查
```

**实例 state 枚举**：

| state | 含义 |
|-------|------|
| `none` | 未创建/未安装 |
| `restarting` | 重启中（过渡态） |
| `running` | 运行中（目标状态） |
| `stop` | 停止 |

## 删除

```bash
$K driver-delete <instanceId>    # ⚠️ 会使其绑定的设备表失效，删除前必须用户确认
```

## 常见错误与处理

| 错误 | 处理 |
|------|------|
| `驱动名称已存在: xxx（实例ID: ...）` | 复用该实例，勿换名盲试 |
| `平台驱动目录中没有 "xxx"，禁止创建` | 平台没有该驱动；`driver-catalog` 查相近候选，换目录内驱动或联系管理员上架，勿硬造 key |
| `集群节点模式必须提供 --cluster ...` | 先 `$K drivers` 找 `runMode=cluster` 的实例，再带 `--cluster <id>` 重试 |
| `--cluster 必须指向 runMode=cluster 的集群驱动` | 所选实例不是集群，换正确的集群实例 |
| `-t "..." 与集群实例的 driverType "..." 不一致` | 集群节点必须用与集群相同的驱动类型，去掉 `-t` 或改为一致 |
| 安装 `err` 非空 | 读 err + outInfo 尾部定位；重跑 `driver-install` 复用同一实例 |
| `verify: "service-missing"` / state 卡 `none`/`stop` | 先 `driver-restart`；仍不行带 serviceList 证据上报人工 |
| schema 404 | 预期行为（未装完就查）；确认 install 完成后再查 |
| 安装超时 | `driver-install-info <taskId>` 续查，未失败则等完成后走后续步骤 |

## 关联

- [workflow-driver-create.md](workflow-driver-create.md) — AI 自动创建驱动的完整流程编排
- [device.md](device.md) — 设备表创建、驱动字段映射
- [device-tag.md](device-tag.md) — 点位基础字段与驱动字段
- [workflow-full.md](workflow-full.md) — 主工作流（Phase 2 无可用驱动时进入驱动创建子工作流）
