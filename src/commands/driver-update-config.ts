import { readFileSync } from 'node:fs';
import { getApiClient, executeCommand, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';
import { normalizeSchemaBlock } from '../core/table-guard.js';

/**
 * 更新驱动实例配置（device 块）
 * - 输入接受 {settings, tags, commands, events} 或 {device: {...}} 两种形态，统一归一到 device
 * - 与现有 device deepMerge 后 PATCH（数组整体替换，tags/commands 全量覆盖是预期语义）
 * - 配置变更后需 driver-restart 生效（autoUpdateConfig=false 时）
 */
export async function driverUpdateConfig(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    let incoming: any;
    if (options.json) {
      incoming = JSON.parse(options.json);
    } else if (options.file) {
      incoming = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else {
      throw new Error('请提供 --json 或 --file 参数');
    }

    const incomingDevice = incoming.device ?? incoming;

    const client = getApiClient();
    const instance = await client.getDriverInstanceById(id);
    if (!instance) throw new Error(`驱动实例 '${id}' 不存在`);

    const mergedDevice = deepMerge(instance.device || {}, incomingDevice);

    // 门禁（schema 拉不到时放行，不阻塞正常流程）：
    // 1) tags/commands/events 只在 schema driver 块定义了对应块时才可写入——前端配置页同样按此门控，写了也不显示
    // 2) settings 必填项（driver 块 settings.required 且无 default）缺失 = 配置不完整，拒绝
    let schema: any;
    try {
      schema = await client.getDriverSchema(instance.driverType);
    } catch {
      schema = undefined;
    }
    if (schema) {
      const driverProps = schema.driver?.properties || {};
      const zh: Record<string, string> = { tags: '数据点', commands: '指令', events: '事件' };
      const notAllowed = (['tags', 'commands', 'events'] as const).filter(
        (k) => Array.isArray(incomingDevice[k]) && incomingDevice[k].length > 0 && !driverProps[k],
      );
      if (notAllowed.length > 0) {
        throw new Error(
          `已拒绝写入：驱动 "${instance.driverType}" 的配置（driver 块）没有 ${notAllowed.map((k) => zh[k]).join('/')}定义——它们属于模型/设备层，不在驱动实例上配置（前端驱动配置页同样不显示，写入不会生效于任何页面）。` +
          `正确做法：从配置中移除后重试（settings 照常保存），并在最终报告如实说明。`,
        );
      }

      // settings 块新旧格式归一（旧: required 数组与 properties 同级；新: 逐字段 need）——格式漂移时门禁不静默失效
      const { required: settingsRequired, fields: settingsProps } = normalizeSchemaBlock(driverProps.settings);
      const missing = settingsRequired.filter(
        (f: string) =>
          settingsProps[f]?.default === undefined
          && (mergedDevice.settings?.[f] === undefined || mergedDevice.settings?.[f] === null || mergedDevice.settings?.[f] === ''),
      );
      if (missing.length > 0) {
        throw new Error(
          `已拒绝写入：必填配置缺失——settings 缺少必填字段 ${missing.join(', ')}（schema driver 块 required 且无默认值）。` +
          `请按任务事实映射或行业通用默认值补全（在报告中注明假设）后重试。`,
        );
      }
    }
    await client.updateDriverInstance(id, { device: mergedDevice });

    console.log(formatOutput(
      {
        ok: true,
        instanceId: id,
        tags: mergedDevice.tags?.length || 0,
        commands: mergedDevice.commands?.length || 0,
        settingsKeys: Object.keys(mergedDevice.settings || {}),
      },
      resolveOutputFormat(options.output),
    ));
  });
}
