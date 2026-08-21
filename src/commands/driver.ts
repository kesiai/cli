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
      description: options.description || '',
      state: 'none',
      device: { tags: [], commands: [], events: [], settings: {} },
    };
    if (options.json) {
      payload = deepMerge(payload, JSON.parse(options.json));
    } else if (options.file) {
      payload = deepMerge(payload, JSON.parse(readFileSync(options.file, 'utf-8')));
    }

    if (!payload.name?.trim()) throw new Error('请提供驱动名称 (-n)');
    if (!payload.driverType) throw new Error('请提供驱动类型 key (-t，即 driver-catalog 输出的 name 字段)');

    const client = getApiClient();

    // 名称唯一性预检：重名直接报已有实例，避免服务端 400 + 半创建状态
    const instances = await client.getDriverInstances({ limit: 1000 });
    const existed = instances.find((i: any) => i.name === payload.name);
    if (existed) {
      throw new Error(`驱动名称已存在: ${payload.name}（实例ID: ${existed.id}），如需复用请直接使用该实例`);
    }

    // 版本未指定时从目录解析
    if (!payload.driverVersion) {
      const catalog = await client.getDriverCatalog();
      const entry = catalog.find((c: any) => c.name === payload.driverType);
      if (entry?.version) payload.driverVersion = entry.version;
    }

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

    // change/config 端点按 groupId 路由（真机验证：实例 id 报 400"未查到对应的驱动实例"，groupId 正常）
    const instance = await client.getDriverInstanceById(id);
    if (!instance) throw new Error(`驱动实例 '${id}' 不存在`);
    const groupId: string = instance.groupId || id;

    await client.restartDriver(groupId);

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
