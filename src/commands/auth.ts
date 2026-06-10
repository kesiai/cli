import { writeConfig, clearConfig, readConfig, resolveOutputFormat } from '../core/config.js';
import { KesiApiClient } from '../core/client.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { executeCommand } from '../core/utils.js';

export async function login(options: any): Promise<void> {
  await executeCommand(async () => {
    let token = options.token;

    if (options.username && options.password && !token) {
      const client = new KesiApiClient({
        baseUrl: options.url,
        projectId: options.project,
      });
      const result = await client.login(options.username, options.password);
      token = result.token;
      console.log(formatSuccess(`登录成功，欢迎 ${result.username}`));
    }

    await writeConfig({
      baseUrl: options.url,
      projectId: options.project,
      token,
      username: options.username,
    });
    console.log(formatSuccess('配置已保存'));
  });
}

export async function logout(): Promise<void> {
  await executeCommand(async () => {
    await clearConfig();
    console.log(formatSuccess('已清除配置'));
  });
}

export async function showConfig(options: any): Promise<void> {
  await executeCommand(async () => {
    const config = readConfig();
    if (!config) {
      console.log('未配置，请先运行: kesi login');
      return;
    }
    const display = {
      baseUrl: config.baseUrl,
      projectId: config.projectId,
      username: config.username,
      hasToken: !!config.token,
      output: config.output || 'json',
    };
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(display, format));
  });
}
