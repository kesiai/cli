import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatSuccess } from '../core/formatter.js';

export async function init(options: any): Promise<void> {
  const cwd = process.cwd();
  const configFile = resolve(cwd, '.kesirc.json');

  if (existsSync(configFile) && !options.force) {
    console.log('.kesirc.json 已存在，使用 --force 覆盖');
    return;
  }

  // 从参数或默认模板生成配置
  const config: Record<string, any> = {
    baseUrl: options.url || 'http://192.168.99.103:3030/rest',
    projectId: options.project || 'kesi',
    username: options.username || 'admin',
    password: options.password || 'admin321',
    output: 'json',
  };

  writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
  console.log(formatSuccess(`已创建 ${configFile}`));
  console.log('');
  console.log('现在可以使用 kesi 命令了:');
  console.log('  kesi tables          # 查看所有表');
  console.log('  kesi scan            # 导出全库 schema');
  console.log('  kesi sample <table>  # 预览表数据');
}
