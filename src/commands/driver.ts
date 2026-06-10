import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

export async function driversList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const list = await client.getDriverInstances();
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(list, format));
  });
}

export async function driverGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const detail = await client.getDriverInstanceById(id);
    if (!detail) throw new Error(`驱动实例 '${id}' 不存在`);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(detail, format));
  });
}
