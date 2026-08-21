import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

/**
 * 驱动目录查询（可安装驱动列表）
 *
 * ⚠️ 字段陷阱：目录条目的 driverType 是分类路径（如 "行业驱动/电力"），
 * name 才是驱动 key（如 modbus-tcp-driver）。输出时把 driverType 改名为 category，
 * 避免误把分类填进 driver-create 的 --type。
 * 每个条目附带 installed / installedInstanceId 注记（对照实例列表），支撑"复用 or 新建"决策。
 */
export async function driverCatalog(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const catalog = await client.getDriverCatalog();

    // 实例列表（一次拉全量，用于标注已安装状态；默认 limit 50，这里放宽）
    const instances = await client.getDriverInstances({ limit: 1000 });
    const installedByKey = new Map<string, any>();
    for (const inst of instances) {
      if (inst.driverType && !installedByKey.has(inst.driverType)) {
        installedByKey.set(inst.driverType, inst);
      }
    }

    let items = catalog.map((item: any) => {
      const inst = installedByKey.get(item.name);
      return {
        name: item.name,                      // 驱动 key（driver-create --type 用这个）
        category: item.driverType,            // 分类路径（勿当驱动类型用）
        order: item.order,
        description: item.description,
        version: item.version,
        localVersion: item.localVersion,
        url: item.url,
        installed: !!inst,
        installedInstanceId: inst?.id,
        installedState: inst?.state,
      };
    });

    // 客户端关键词过滤：匹配 name / description / 分类路径（大小写不敏感）
    if (options.search) {
      const kw = String(options.search).toLowerCase();
      items = items.filter((it: any) =>
        [it.name, it.description, it.category].some((v: any) => String(v || '').toLowerCase().includes(kw))
      );
    }

    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(items, format));
  });
}
