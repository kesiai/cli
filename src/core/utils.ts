import { KesiApiClient } from './client.js';
import { readConfig, type KesiConfig, resolveOutputFormat } from './config.js';
import { ConfigError } from './errors.js';

export { resolveOutputFormat, readConfig, type KesiConfig };

export function getApiClient(): KesiApiClient {
  const config = readConfig();
  if (!config) {
    throw new ConfigError('未配置，请先运行: kesi login');
  }
  const client = new KesiApiClient(config);
  // 没有 token 但有密码时，首次请求会自动登录
  return client;
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
