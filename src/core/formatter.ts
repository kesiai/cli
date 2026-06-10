import type { OutputFormat } from './config.js';
type Fmt = OutputFormat;

export function formatOutput(data: any, format: Fmt): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'table':
      return formatTable(data);
    case 'plain':
      return formatPlain(data);
    default:
      return JSON.stringify(data, null, 2);
  }
}

function formatTable(data: any): string {
  if (Array.isArray(data)) {
    return formatArrayTable(data);
  }
  if (data?.list && Array.isArray(data.list)) {
    return formatArrayTable(data.list) + `\nTotal: ${data.total ?? data.list.length}`;
  }
  if (data?.items && Array.isArray(data.items)) {
    return formatArrayTable(data.items) + `\nTotal: ${data.total ?? data.items.length}`;
  }
  return JSON.stringify(data, null, 2);
}

function formatArrayTable(items: any[]): string {
  if (items.length === 0) return '(empty)';

  // 过滤掉复杂嵌套对象，只显示基本类型字段
  const displayItems = items.map(item => {
    const row: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v === null || v === undefined) {
        row[k] = '';
      } else if (typeof v === 'object' && !Array.isArray(v) && k !== '_id') {
        const obj = v as Record<string, unknown>;
        row[k] = typeof obj.name === 'string' ? obj.name
          : typeof obj.title === 'string' ? obj.title
          : typeof obj.id === 'string' ? obj.id
          : JSON.stringify(v);
      } else if (typeof v === 'number' && v > 1e12) {
        // 疑似时间戳
        row[k] = new Date(v).toISOString();
      } else {
        row[k] = v;
      }
    }
    return row;
  });

  // 计算列宽
  const keys = Object.keys(displayItems[0]);
  const colWidths: Record<string, number> = {};
  for (const k of keys) {
    colWidths[k] = Math.max(
      k.length,
      ...displayItems.map(item => String(item[k] ?? '').length)
    );
  }
  // 限制最大列宽
  for (const k of keys) {
    colWidths[k] = Math.min(colWidths[k], 40);
  }

  const header = keys.map(k => k.padEnd(colWidths[k])).join('  ');
  const separator = keys.map(k => '-'.repeat(colWidths[k])).join('  ');
  const rows = displayItems.map(item =>
    keys.map(k => String(item[k] ?? '').slice(0, 40).padEnd(colWidths[k])).join('  ')
  );

  return [header, separator, ...rows].join('\n');
}

function formatPlain(data: any): string {
  if (Array.isArray(data)) {
    return data.map((item, i) => `--- #${i + 1} ---\n${formatPlain(item)}`).join('\n\n');
  }
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n');
  }
  return String(data);
}

export function formatError(message: string): string {
  return `\x1b[31m✗ ${message}\x1b[0m`;
}

export function formatSuccess(message: string): string {
  return `\x1b[32m✓ ${message}\x1b[0m`;
}
