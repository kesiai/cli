import { KesiApiClient } from './client.js';
import { readConfig, type KesiConfig, resolveOutputFormat } from './config.js';
import { ConfigError } from './errors.js';

export { resolveOutputFormat, readConfig, type KesiConfig };

export function getApiClient(): KesiApiClient {
  const config = readConfig();
  if (!config) {
    throw new ConfigError('未配置:通过 --base-url/--project-id/--token 或环境变量 KESI_BASE_URL/KESI_PROJECT/KESI_TOKEN 提供');
  }
  return new KesiApiClient(config);
}

export async function executeCommand(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err: any) {
    const red = process.env.NO_COLOR ? '' : '\x1b[31m';
    const reset = process.env.NO_COLOR ? '' : '\x1b[0m';
    if (err?.code === 'CONFIG_ERROR') {
      console.error(`${red}✗ ${err.message}${reset}`);
    } else if (err?.code === 'AUTH_ERROR') {
      console.error(`${red}✗ 认证失败: ${err.message}${reset}`);
    } else if (err?.code === 'API_ERROR') {
      console.error(`${red}✗ API 错误 (${err.statusCode}): ${err.message}${reset}`);
    } else if (err?.code === 'NETWORK_ERROR') {
      console.error(`${red}✗ 网络错误: ${err.message}${reset}`);
    } else {
      console.error(`${red}✗ ${err?.message || err}${reset}`);
    }
    process.exit(1);
  }
}

export function parseJsonOption(value: string | undefined): any {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`无效的 JSON: ${value}`);
  }
}

/**
 * 解析 --data 的 key=value 形式（可重复传多个合并为一个对象；单个以 { 开头的按整段 JSON 解析）。
 * 值做类型推断：true/false/null → 字面量，纯数字 → number，其余保持字符串。
 */
export function parseKvData(values: string[] | string | undefined): any {
  const list = Array.isArray(values) ? values : values !== undefined ? [values] : [];
  if (list.length === 0) return undefined;
  if (list.length === 1 && list[0].trimStart().startsWith('{')) {
    return parseJsonOption(list[0]);
  }
  const out: Record<string, any> = {};
  const put = (pair: string) => {
    const eq = pair.indexOf('=');
    if (eq <= 0) {
      throw new Error(`--data 格式为 key=value（多个用 --data 重复传或 & 连接，或传整段 JSON）: "${pair}"`);
    }
    const key = pair.slice(0, eq).trim();
    const raw = pair.slice(eq + 1);
    out[key] = raw === 'true' ? true : raw === 'false' ? false : raw === 'null' ? null
      : (raw !== '' && !isNaN(Number(raw)) ? Number(raw) : raw);
  };
  for (const item of list) {
    // 兼容 & 连接写法（'a=1&b=2'）：每个分段都含 = 才拆，否则视为值中含 & 的单个 kv
    if (item.includes('&')) {
      const segs = item.split('&');
      if (segs.every((s) => s.indexOf('=') > 0)) {
        segs.forEach(put);
        continue;
      }
    }
    put(item);
  }
  return out;
}

export function normalizeQueryOptions(options: any): Record<string, any> {
  return {
    filter: options.filter ? JSON.parse(options.filter) : undefined,
    sort: options.sort ? JSON.parse(options.sort) : undefined,
    limit: options.limit !== undefined ? Number(options.limit) : undefined,
    skip: options.skip !== undefined ? Number(options.skip) : undefined,
    withCount: options.withCount ?? false,
  };
}

/**
 * 深度合并两个对象
 * @param target 原始对象（会被修改）
 * @param source 要合并的对象
 * @returns 合并后的对象
 *
 * 规则：
 * - source 中的非 undefined 值会覆盖 target
 * - 对象类型会递归合并
 * - 数组会直接替换（不是合并）
 * - undefined 值会被忽略（保留 target 的值）
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result: Record<string, any> = { ...target };

  for (const key in source) {
    if (source[key] === undefined) {
      // 忽略 undefined 值，保留原始值
      continue;
    }

    const sourceValue = source[key];
    const targetValue = result[key];

    if (isObject(sourceValue) && isObject(targetValue)) {
      // 递归合并对象
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      // 直接覆盖（包括数组、基本类型等）
      result[key] = sourceValue;
    }
  }

  return result as T;
}

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
