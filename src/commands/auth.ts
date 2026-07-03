import { readConfig, resolveOutputFormat } from '../core/config.js';
import { formatOutput } from '../core/formatter.js';
import { executeCommand } from '../core/utils.js';

// 认证域:仅保留「查看解析后的配置」。凭据经 params/env 提供,无 login/logout。
export async function showConfig(options: any): Promise<void> {
  await executeCommand(async () => {
    const config = readConfig();
    if (!config) {
      console.log('未配置:通过 --base-url/--project-id/--token 或环境变量 KESI_BASE_URL/KESI_PROJECT/KESI_TOKEN 提供');
      return;
    }
    const display = {
      baseUrl: config.baseUrl,
      projectId: config.projectId,
      username: config.username,
      hasToken: !!config.token,
    };
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(display, format));
  });
}
