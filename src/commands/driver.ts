import { readFileSync } from 'node:fs';
import { getApiClient, executeCommand, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';

export async function driversList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const list = await client.getDriverInstances();
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(list, format));
  });
}

export async function driverGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const detail = await client.getDriverInstanceById(id);
    if (!detail) throw new Error(`驱动实例 '${id}' 不存在`);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(detail, format));
  });
}

/**
 * 创建驱动实例
 * - --type 填驱动 key（driver-catalog 输出的 name 字段），不是分类路径
 * - 驱动目录前置校验：平台目录里没有的驱动 key 直接拒绝创建（附相近候选提示）
 * - --run-mode node（集群节点）必须配 --cluster <集群实例id>：继承该集群的 driverType，并把集群的 groupId 存上
 * - 创建前预检名称唯一性，重名直接报已有实例 id（不发 POST）
 * - 创建成功必须记录返回 id，后续保存走 driver-update-config（PATCH），禁止重复创建
 */
export async function driverCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    // flag 构建 payload；--json/--file 作为完整 payload 逃生舱，深合并覆盖
    let payload: any = {
      name: options.name,
      driverType: options.type,
      driverVersion: options.version,
      runMode: options.runMode || 'one',
      distributed: options.distributed || 'all',
      disable: false,
      stopAcquisition: false,
      autoUpdateConfig: false,
      debug: false,
      state: 'none',
      device: { tags: [], commands: [], events: [], settings: {} },
    };
    if (options.json) {
      payload = deepMerge(payload, JSON.parse(options.json));
    } else if (options.file) {
      payload = deepMerge(payload, JSON.parse(readFileSync(options.file, 'utf-8')));
    }

    if (!payload.name?.trim()) throw new Error('请提供驱动名称 (-n)');

    const client = getApiClient();

    // 集群节点（runMode=node）：选择一个已创建的【集群】驱动，相当于选择与其相同的驱动类型（同样走安装），
    // 并把该集群的 groupId 存上（普通模式下 groupId 由后端创建时生成，前端/CLI 不传）
    if (payload.runMode === 'node') {
      if (!options.cluster) {
        throw new Error('集群节点模式必须提供 --cluster <集群实例id>（runMode=cluster 的驱动实例，先用 drivers 命令查询）');
      }
      const cluster = await client.getDriverInstanceById(options.cluster);
      if (!cluster) throw new Error(`集群实例 '${options.cluster}' 不存在`);
      if (cluster.runMode !== 'cluster') {
        throw new Error(`实例 '${options.cluster}' 的 runMode 为 '${cluster.runMode}'，--cluster 必须指向 runMode=cluster 的集群驱动`);
      }
      if (!cluster.groupId) throw new Error(`集群实例 '${options.cluster}' 缺少 groupId，无法创建集群节点`);
      // 集群节点继承所选集群的驱动类型；显式 -t 与集群不一致时以报错拦截（防止挂错类型）
      if (payload.driverType && payload.driverType !== cluster.driverType) {
        throw new Error(`-t "${payload.driverType}" 与集群实例的 driverType "${cluster.driverType}" 不一致，集群节点必须使用与集群相同的驱动类型（可省略 -t）`);
      }
      payload.driverType = cluster.driverType;
      payload.groupId = cluster.groupId;
    } else if (options.cluster) {
      throw new Error('--cluster 仅在 --run-mode node（集群节点）时使用');
    }

    if (!payload.driverType) throw new Error('请提供驱动类型 key (-t，即 driver-catalog 输出的 name 字段)');

    // 名称唯一性预检：重名直接报已有实例，避免服务端 400 + 半创建状态
    const instances = await client.getDriverInstances({ limit: 1000 });
    const existed = instances.find((i: any) => i.name === payload.name);
    if (existed) {
      throw new Error(`驱动名称已存在: ${payload.name}（实例ID: ${existed.id}），如需复用请直接使用该实例`);
    }

    // 驱动目录前置校验：平台目录里没有的驱动禁止创建（没有可安装的驱动包，创建了也无法安装运行）
    const catalog = await client.getDriverCatalog();
    const entry = catalog.find((c: any) => c.name === payload.driverType);
    if (!entry) {
      const kw = String(payload.driverType).toLowerCase();
      const similar = catalog
        .filter((c: any) => [c.name, c.description, c.driverType].some((v: any) => String(v || '').toLowerCase().includes(kw)))
        .slice(0, 3)
        .map((c: any) => c.name);
      throw new Error(
        `平台驱动目录中没有 "${payload.driverType}"，禁止创建（平台内没有的驱动无法安装运行）。`
        + `请先用 driver-catalog 查看可安装的驱动`
        + (similar.length ? `，相近的有: ${similar.join('、')}` : '')
      );
    }

    // 版本未指定时取目录版本
    if (!payload.driverVersion && entry.version) payload.driverVersion = entry.version;

    let id = await client.createDriverInstance(payload);

    // 兜底：响应未返回 id 时按名称回查（前端已验证的做法）
    if (!id) {
      const after = await client.getDriverInstances({ limit: 1000 });
      id = after.find((i: any) => i.name === payload.name)?.id;
    }
    if (!id) throw new Error('创建结果异常：响应无 id 且按名称回查失败，请用 drivers 命令确认后再操作');

    console.log(formatSuccess(`驱动实例创建成功`));
    console.log(formatOutput(
      {
        id,
        name: payload.name,
        driverType: payload.driverType,
        driverVersion: payload.driverVersion,
        runMode: payload.runMode,
        // 集群节点才有值（= 所选集群的 groupId），其余模式由后端生成、不传
        ...(payload.groupId ? { groupId: payload.groupId } : {}),
        distributed: payload.distributed,
        hint: `下一步: driver-install -i ${id}`,
      },
      resolveOutputFormat(options.output),
    ));
  });
}

/** 重启驱动（配置变更后生效），默认轮询 state 到 running（60s） */
export async function driverRestart(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();

    // change/config 端点只按 groupId 路由（真机验证：实例 id 报 400"未查到对应的驱动实例"）；没有 groupId 禁止重启
    const instance = await client.getDriverInstanceById(id);
    if (!instance) throw new Error(`驱动实例 '${id}' 不存在`);
    if (!instance.groupId) throw new Error(`驱动实例 '${id}' 缺少 groupId，无法重启`);

    await client.restartDriver(instance.groupId);

    let state = '';
    if (options.wait !== false) {
      for (let i = 0; i < 30; i++) {
        // state 在实例列表里（详情接口不返回该字段）
        state = await client.getDriverInstanceState(id) || '';
        if (state === 'running') break;
        await new Promise((r) => setTimeout(r, 2000));
      }
    } else {
      state = await client.getDriverInstanceState(id) || '';
    }

    console.log(formatOutput({ ok: true, instanceId: id, state }, resolveOutputFormat(options.output)));
    if (options.wait !== false && state !== 'running') process.exitCode = 1;
  });
}

/** 删除驱动实例（⚠️ 会使其绑定的设备表失效；删除确认门在 skill 层做） */
export async function driverDelete(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteDriverInstance(id);
    console.log(formatSuccess(`驱动实例已删除: ${id}`));
    console.log(formatOutput({ ok: true, id }, resolveOutputFormat(options.output)));
  });
}
