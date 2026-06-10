import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

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

const GLOBAL_CONFIG_DIR = join(homedir(), '.kesi');
const GLOBAL_CONFIG_FILE = join(GLOBAL_CONFIG_DIR, 'config.json');
const PROJECT_CONFIG_FILE = '.kesirc.json';

function readJsonFile(filePath: string): KesiConfig | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export type OutputFormat = 'json' | 'table' | 'plain';

export function readConfig(): KesiConfig | null {
  // 项目级配置优先
  const projectConfig = readJsonFile(resolve(process.cwd(), PROJECT_CONFIG_FILE));
  const globalConfig = readJsonFile(GLOBAL_CONFIG_FILE);
  const merged = { ...globalConfig, ...projectConfig } as KesiConfig | null;

  if (!merged?.baseUrl || !merged?.projectId) return null;
  return merged;
}

export function writeConfig(config: Partial<KesiConfig>): void {
  if (!existsSync(GLOBAL_CONFIG_DIR)) {
    mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
  }
  const existing = readJsonFile(GLOBAL_CONFIG_FILE) || {};
  writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify({ ...existing, ...config }, null, 2), 'utf-8');
}

export function clearConfig(): void {
  if (existsSync(GLOBAL_CONFIG_FILE)) {
    writeFileSync(GLOBAL_CONFIG_FILE, '{}', 'utf-8');
  }
}

export function resolveOutputFormat(format?: string): 'json' | 'table' | 'plain' {
  if (format === 'json' || format === 'table' || format === 'plain') return format;
  const config = readConfig();
  return config?.output || 'json';
}
