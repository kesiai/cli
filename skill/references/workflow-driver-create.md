# 驱动创建 · 子工作流

> 适用于：用户要求**接入新驱动**（"帮我接一个 Modbus TCP 驱动"、"平台没有 OPC UA 驱动"），
> 或主工作流 [workflow-full.md](workflow-full.md) Phase 2 规划设备表时发现**无可用驱动**。
>
> 命令与 API 细节见 [driver-create.md](driver-create.md)。

以下流程**必须按 Phase 顺序执行，每个确认门都需要用户确认后才能继续。**

⚠️ **测试驱动例外**：测试驱动不在驱动目录中（schema 前端硬编码、实例 id 固定 `test`），
用户要"测试驱动/仿真驱动"时走 [workflow-full.md](workflow-full.md#测试驱动配置) 的固定配置，**跳过本工作流**。

---

## Phase 0: 认证

同 [workflow-full.md Phase 0](workflow-full.md#phase-0-认证)，不重复。

---

## Phase 1: 目录匹配（确认门 1：选定驱动 + 实例名）

### 1. 先查可复用实例

```bash
$K drivers
```

已存在同类型实例且 `state: "running"` → **建议复用该实例**（幂等，避免重复安装），用户同意即结束本工作流返回调用方。

复用判据只看**驱动类型 + state**，不看 settings：settings 为空的 running 实例是首选复用目标（后续直接 `driver-update-config` 配上网关即可，优于新建+安装）；settings 已绑**其它网关且在服役**的实例不要改配——另选空实例或新建。

### 2. 查驱动目录

```bash
$K driver-catalog --search <关键词>
```

**关键词提取**（从用户自然语言需求）：

| 用户话里的词 | 搜索词 |
|--------------|--------|
| 协议词：Modbus / OPC UA / MQTT / BACnet / SNMP… | 原词或小写 |
| 厂商词：西门子 / 三菱 / 汇川… | `siemens` / `mitsubishi` / `inovance`（转英文再搜一次） |
| 行业词：电力 / 水务 / 暖通… | 原词 |

### 3. 展示候选并推荐

以表格展示候选（`name` / `category` / `version` / `description` / `installed`）+ **推荐理由**：

- 唯一合理匹配 → 直接推荐，用户确认
- 多个合理候选 → 列 top 3 让用户选
- 零匹配 → 换关键词重试一次；仍无 → **如实告知**"平台目录没有该驱动"，**禁止调用 `driver-create`**（目录外驱动平台无法安装运行，CLI 也会直接拒绝），可列相近候选，由用户决定换驱动或联系管理员上架

⚠️ **确认门 1**：向用户确认「驱动 key + 实例名称 + 版本」后才进入 Phase 2。确认的驱动 key 必须来自目录输出。

---

## Phase 2: 创建 + 安装（确认门 2：展示确切 payload）

### 1. 展示创建 payload 并确认

```json
{ "name": "Modbus TCP 驱动-01", "driverType": "modbus-tcp-driver", "runMode": "one", "distributed": "all" }
```

**集群节点例外**（用户要求把驱动挂到某集群下时）：payload 增加 `runMode: "node"` + `groupId`（= 所选集群实例的 groupId），`driverType` 与集群相同。创建命令用 `--cluster`，CLI 自动校验集群并继承 driverType + groupId（见 [driver-create.md](driver-create.md#集群节点创建)）：

```bash
$K drivers                                  # 找 runMode=cluster 的集群实例
$K driver-create -n "<节点名称>" --run-mode node --cluster <集群实例id>
```

### 2. 创建

```bash
$K driver-create -n "<名称>" -t <驱动key>
```

**必须记录返回的 `id`**（instanceId），后续所有步骤用它。

⚠️ `-t` 只能填 Phase 1 目录匹配确认的驱动 key；目录外驱动 CLI 直接拒绝创建（`平台驱动目录中没有 "xxx"，禁止创建`）。
重名报错时**复用报错信息中的实例 ID**，禁止换名盲试、禁止重复创建。

### 3. 安装（阻塞等待）

```bash
$K driver-install <instanceId>
```

向用户汇报阶段进度（下载 → 安装 → 启动）。结果判定：

| status | 处理 |
|--------|------|
| `completed` + `verify: ok` | 进入 Phase 3 |
| `completed` + `verify: service-missing` | `$K driver-restart <id>` 后复查 state |
| `failed` | 展示 err + outInfo，问用户；**重试 = 重跑 `driver-install` 复用同一 instanceId，绝不重新 create** |
| `timeout` | `$K driver-install-info <taskId>` 续查，未失败则等完成后继续 |

---

## Phase 3: 读取 schema + 生成配置草案（确认门 3：配置草案）

⚠️ **必须安装完成后**才执行本阶段（schema 未安装时查询 404）。

### 1. 读 schema

```bash
$K driver-schema <驱动key>
```

### 2. 生成 settings 草案

按 [driver-create.md](driver-create.md#驱动-schema-与配置生成) 的填充规则（required → 用户事实映射 → enum 合法值 → default → 问用户；**禁止发明 schema 外字段**）。

用户话中无处安放的事实（如提到了 schema 里没有的参数）→ **明示给用户**，不猜。

### 3. 生成点位/指令草案（⚠️ 先过门控）

**门控：点位能否配在驱动实例 = schema `driver` 块是否定义了 `tags`。** 主流协议驱动没有——**跳过点位草案、不写实例 tags**，最终报告如实说明「未配置数据点及原因」（CLI 对违规写入也会直接拒绝，规则见 [driver-create.md](driver-create.md#驱动-schema-与配置生成) 三块归属表）。

只有 `driver` 块定义了 tags（极罕见）才继续：

- 点位 = [device-tag.md](device-tag.md) 基础字段（`id`/`name`/`policy`/`unit` 等）+ schema `tags.items` 驱动字段（`required` 全填、enum 取合法值）
- 用户给了点位清单 → 按清单生成；**没给 → 起草 2-3 个代表点位并明示假设**（地址/从站号等按序分配），用户可改
- 指令按 schema `commands.items` 生成；schema 无定义 → 留空并说明

### 4. 以表格展示草案（含每个值的来源：用户给定 / schema default / 假设）

⚠️ **确认门 3**：用户确认草案后才进入 Phase 4。

---

## Phase 4: 保存 + 重启 + 验证

```bash
# 临时文件放系统临时目录（mktemp），用完删除，不在 skill 目录留文件
$K driver-update-config <instanceId> --file <tmpfile>
$K driver-restart <instanceId>
$K driver <instanceId>                # 验证 state=running 且 device.settings 已持久化
```

**最终报告**：instanceId、名称、驱动 key、版本、state、settings 摘要、点位/指令数量（驱动无点位配置能力时如实说明"未配置数据点"及原因）。

失败处理：state 卡 `none`/`stop` → 再 `driver-restart` 一次；仍失败 → 带 serviceList 证据如实上报，建议人工排查。

---

## Phase 5: 回接（按进入来源）

| 来源 | 回接动作 |
|------|----------|
| workflow-full Phase 2（无可用驱动进入） | 带新实例回到主工作流继续表规划，按 [device.md](device.md#驱动字段映射) 填设备表驱动字段：`driver` = 实例的 `driverType`，`groupId` = 实例的 `groupId` 字段（仅此两个驱动关联字段，其余废弃） |
| 用户直接要求创建驱动 | 按 [workflow-data-ops.md](workflow-data-ops.md) 的收尾方式汇报后结束（不主动引导生成前端） |
