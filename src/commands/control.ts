import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';
import { readFileSync } from 'node:fs';

export async function controlSend(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.sendControlCommand({
      deviceId: options.device,
      tagName: options.tag,
      value: options.value,
      timeout: options.timeout ? Number(options.timeout) : undefined,
    });
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function controlBatch(options: any): Promise<void> {
  await executeCommand(async () => {
    let commands: any[];
    if (options.file) {
      commands = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else if (options.json) {
      commands = JSON.parse(options.json);
    } else {
      throw new Error('请提供 --file 或 --json 参数');
    }
    const client = getApiClient();
    const result = await client.sendBatchControlCommands(commands);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}
