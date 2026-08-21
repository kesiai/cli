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
    if (err?.code === 'CONFIG_ERROR') {
      console.error(`\x1b[31m✗ ${err.message}\x1b[0m`);
    } else if (err?.code === 'AUTH_ERROR') {
      console.error(`\x1b[31m✗ 认证失败: ${err.message}\x1b[0m`);
    } else if (err?.code === 'API_ERROR') {
      console.error(`\x1b[31m✗ API 错误 (${err.statusCode}): ${err.message}\x1b[0m`);
    } else if (err?.code === 'NETWORK_ERROR') {
      console.error(`\x1b[31m✗ 网络错误: ${err.message}\x1b[0m`);
    } else {
      console.error(`\x1b[31m✗ ${err?.message || err}\x1b[0m`);
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
