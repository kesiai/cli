import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';

/**
 * 系统设置是全局单例配置，改动即时影响整个平台（登录页/界面标题/告警通道），写前想清楚、测完必须还原。
 * 真机验证的坑都在 guard 里：name 不可清空、空串被静默忽略、未知字段被吞、dependencies 只读。
 */
const READONLY_KEYS = ['dependencies', 'id'];
const FIELD_TYPES: Record<string, string> = {
  // 真机/前端反推的类型速查（不完整；写错类型平台会报 unmarshal 错误并点名实际类型）
  name: 'string', copyright: 'string', language: 'string',
  notShowCode: 'boolean', notShowCodeAdmin: 'boolean', useBrowserLanguage: 'boolean',
  enableCors: 'boolean', liteMode: 'boolean', propTag: 'string',
  loginDuration: 'object', loginLimit: 'object', loginSettings: 'object',
  email: 'object', wechat: 'object', dingtalk: 'object', sms: 'object',
  warning: 'object', logSaveRule: 'object', onlineCheck: 'object', bigModelSetting: 'object',
};

export async function settingShow(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getSettings();
    if (!result || !result.id) throw new Error('读取系统设置失败（core/setting 无返回）');
    console.log(formatOutput(result, resolveOutputFormat(options.output)));
  });
}

/** 局部更新（--json 给要改的键值；CLI 自动补 id；按键合并，未传字段不动） */
export async function settingUpdate(options: any): Promise<void> {
  await executeCommand(async () => {
    if (!options.json) throw new Error('请提供要更新的字段 (--json \'{"language":"zh-CN"}\')');
    let changes: any;
    try {
      changes = JSON.parse(options.json);
    } catch {
      throw new Error(`--json 不是合法 JSON: ${options.json}`);
    }
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      throw new Error('--json 必须是对象（键值对）');
    }

    for (const key of READONLY_KEYS) {
      if (key in changes) throw new Error(`字段 "${key}" 只读，不允许修改${key === 'dependencies' ? '（平台服务装配清单，改了会影响服务启动）' : ''}`);
    }
    if ('name' in changes) {
      if (changes.name === null) throw new Error('name 不允许置 null（平台列非空约束，会 400 字段置空失败）');
      if (String(changes.name).trim() === '') throw new Error('name 不允许空字符串（平台会静默忽略，等于没改；要改名请给非空值）');
    }

    const client = getApiClient();
    const current = await client.getSettings();
    if (!current || !current.id) throw new Error('读取系统设置失败（拿不到 id，无法 PATCH）');

    await client.updateSettings({ id: current.id, ...changes });
    const after = await client.getSettings(); // PATCH 只回 {status:OK}，CLI 回读给结果
    const diff = Object.keys(changes).map((k) => `${k}: ${JSON.stringify(current[k])} → ${JSON.stringify(after[k])}`);
    console.log(formatSuccess('系统设置已更新（按键合并，未传字段不动）'));
    console.log(formatOutput({ updated: diff }, resolveOutputFormat(options.output)));
  });
}

/** 供 help/文档提示用的字段类型速查（--list-fields） */
export async function settingFields(options: any): Promise<void> {
  await executeCommand(async () => {
    console.log(formatOutput(FIELD_TYPES, resolveOutputFormat(options.output)));
  });
}
