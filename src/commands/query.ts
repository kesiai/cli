import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

export async function queryList(resource: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params: Record<string, any> = { skip: 0, limit: 20 };

    if (options.filter) {
      try {
        Object.assign(params, JSON.parse(options.filter));
      } catch {
        throw new Error('--filter 参数必须是有效 JSON');
      }
    }
    if (options.limit) params.limit = Number(options.limit);
    if (options.skip) params.skip = Number(options.skip);
    if (options.sort) {
      try {
        params.sort = JSON.parse(options.sort);
      } catch {
        throw new Error('--sort 参数必须是有效 JSON，如 \'{"name":1}\'');
      }
    }
    if (options.withCount) params.withCount = true;

    const result = await client.queryResource(resource, params);
    const format = resolveOutputFormat(options.output);

    if (options.withCount) {
      console.log(formatOutput({ items: result.items, total: result.total }, format));
    } else {
      console.log(formatOutput(result.items, format));
    }
  });
}

export async function queryGet(resource: string, id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const detail = await client.getResourceById(resource, id);
    if (!detail) throw new Error(`资源 '${resource}/${id}' 不存在`);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(detail, format));
  });
}
