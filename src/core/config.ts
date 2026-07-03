// 配置层:CLI 参数 > 环境变量(纯 token,不读文件、不存密码)
// 与 kesi-assistant 的 runner.mjs 同款逻辑。入口(index.ts)用 extractCredentials
// 从 argv 抽出凭据 flag 后调 setCliCredentials 注入,优先于环境变量。

export interface KesiConfig {
  baseUrl: string;
  projectId: string;
  token?: string;
  username?: string;
  password?: string;
  timeout?: number;
  retries?: number;
  output?: 'json' | 'table' | 'plain';
}

export type OutputFormat = 'json' | 'table' | 'plain';

// CLI 入口注入的凭据(优先于环境变量)
let cliCreds: Partial<KesiConfig> = {};

/** 入口调用:注入 commander/argv 解析出的全局凭据 flag */
export function setCliCredentials(c: { baseUrl?: string; projectId?: string; token?: string; username?: string } = {}): void {
  cliCreds = {};
  if (c.baseUrl) cliCreds.baseUrl = c.baseUrl;
  if (c.projectId) cliCreds.projectId = c.projectId;
  if (c.token) cliCreds.token = c.token;
  if (c.username) cliCreds.username = c.username;
}

/**
 * 取生效配置:CLI 参数 > 环境变量。缺 baseUrl/projectId/token 返回 null。
 */
export function readConfig(): KesiConfig | null {
  const pick = (cliKey: keyof KesiConfig, envKey: string): string | undefined =>
    (cliCreds[cliKey] as string | undefined) || process.env[envKey];

  const baseUrl = pick('baseUrl', 'KESI_BASE_URL');
  const projectId = pick('projectId', 'KESI_PROJECT');
  const token = pick('token', 'KESI_TOKEN');
  const username = pick('username', 'KESI_USERNAME');

  if (!baseUrl || !projectId || !token) return null;

  const cfg: KesiConfig = { baseUrl, projectId, token };
  if (username) cfg.username = username;
  return cfg;
}

export function resolveOutputFormat(format?: string): OutputFormat {
  if (format === 'json' || format === 'table' || format === 'plain') return format;
  return 'json';
}
