import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

export async function controlSend(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const format = resolveOutputFormat(options.output);

    if (!options.table || !options.device || !options.command) {
      throw new Error('请提供参数: --table <tableId> --device <deviceId> --command <name>');
    }

    const tableId = options.table;
    const deviceId = options.device;

    // 获取表的所有指令，找到目标指令
    const commands = await client.getTableCommands(tableId);
    const cmd = commands.find((c: any) => c.name === options.command);
    if (!cmd) {
      throw new Error(`指令 '${options.command}' 不存在。可用指令: ${commands.map((c: any) => c.name).join(', ') || '无'}`);
    }

    // 根据 writeIn.ioway 决定 params
    const params = resolveParams(cmd, options.params);
    // 传完整 command 对象 + table/tableData/params
    const result = await client.sendDeviceCommand(tableId, deviceId, cmd, params);
    console.log(formatOutput(result, format));
  });
}

/**
 * 根据指令的 writeIn 配置解析参数
 * - 默认写入 → 取 schema 中的 default / formValue
 * - 表单写入 → 需要 --params 传入用户输入
 */
function resolveParams(cmd: any, userParams?: string): any {
  const writeIn = cmd.writeIn || {};
  const ioway = writeIn.ioway;

  // 默认写入：直接用 schema 中的默认值
  if (!ioway || ioway === '默认写入') {
    const schema = writeIn.schema || {};
    const defaults: any = {};
    for (const [key, field] of Object.entries(schema)) {
      const f = field as any;
      if (f.default !== undefined) {
        defaults[key] = f.default;
      }
    }
    // 用户 params 可覆盖默认值
    if (userParams) {
      return { ...defaults, ...JSON.parse(userParams) };
    }
    return defaults;
  }

  // 表单写入：必须由用户传入参数
  if (ioway === '表单写入') {
    if (!userParams) {
      const schema = writeIn.schema || {};
      const fields = Object.entries(schema)
        .map(([key, f]: [string, any]) => `  ${key}: ${f.type || 'string'}${f.title ? ` (${f.title})` : ''}${f.default !== undefined ? ` 默认=${f.default}` : ''}`)
        .join('\n');
      throw new Error(`该指令需要用户输入参数（表单写入），请通过 --params 传入：\n${fields}\n\n示例: --params '{"key": "value"}'`);
    }
    return JSON.parse(userParams);
  }

  // 其他 ioway 类型
  if (userParams) {
    return JSON.parse(userParams);
  }
  return {};
}

export async function controlBatch(options: any): Promise<void> {
  await executeCommand(async () => {
    let commandsData: any[];
    if (options.file) {
      commandsData = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      commandsData = JSON.parse(options.json);
    } else {
      throw new Error('请提供 --file 或 --json 参数');
    }
    const client = getApiClient();
    const format = resolveOutputFormat(options.output);

    const results: any[] = [];
    for (const item of commandsData) {
      // 批量模式需要指定 table, device, command(name)
      const tableCommands = await client.getTableCommands(item.table);
      const cmd = tableCommands.find((c: any) => c.name === item.command);
      if (!cmd) {
        throw new Error(`表 '${item.table}' 中不存在指令 '${item.command}'`);
      }
      const params = item.params || resolveParams(cmd);
      const result = await client.sendDeviceCommand(item.table, item.device, cmd, params);
      results.push(result);
    }
    console.log(formatOutput(results, format));
  });
}
