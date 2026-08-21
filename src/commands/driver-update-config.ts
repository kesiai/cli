import { readFileSync } from 'node:fs';
import { getApiClient, executeCommand, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

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
