import { getApiClient, executeCommand, resolveOutputFormat } from '../../core/utils.js';
import { formatOutput } from '../../core/formatter.js';

export async function describe(tableId: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const withTags = options.withTags ?? false;

    const detail = await client.getTableById(tableId);
    if (!detail) throw new Error(`表 '${tableId}' 不存在`);

    const schema = detail.schema || {};
    const properties = schema.properties || {};

    const fields = Object.entries(properties).map(([key, field]: [string, any]) => {
      const f: any = {
        key,
        title: field.title || key,
        type: field.type,
        controlType: field.controlType || field.fieldType,
        need: field.need ?? false,
        unique: field.unique ?? false,
        disabled: field.disabled ?? false,
        listFields: field.listFields ?? false,
        createShow: field.createShow ?? true,
        editShow: field.editShow ?? true,
        isSystem: field.isSystem ?? false,
      };
      // 选择器类型补充选项
      if (field.enum) {
        f.options = field.enum.map((v: any, i: number) => ({
          value: v,
          label: (field.enumNames || [])[i] || v,
        }));
      }
      // 关联字段补充
      if (field.relate) {
        f.relate = {
          tableId: field.relate.id,
          tableTitle: field.relate.title,
          fields: field.relate.fields,
        };
      }
      return f;
    });

    const result: any = {
      table: {
        id: detail.id || tableId,
        title: detail.title,
        description: detail.description || '',
        template: detail.template,
        tableMajorType: detail.tableMajorType,
        recordCount: detail.recordCount,
        showField: detail.showField,
      },
      fields,
      formSchema: schema.formSchema || schema.form || [],
      tableSchema: schema.tableSchema || schema.listFields || [],
      filterSchema: schema.filterSchema || [],
      fieldRules: schema.fieldRules || {},
      orders: schema.orders || {},
    };

    // 属性点（仅设备表 或 显式要求）
    if (withTags || detail.template === 'device' || detail.tableMajorType === 'device') {
      try {
        result.tags = await client.getTableTags(tableId);
      } catch {
        result.tags = [];
      }
    }

    // 记录总数
    try {
      const records = await client.getTableRecords(tableId, { limit: 1, withCount: true });
      result.table.totalRecords = records.total;
    } catch {
      result.table.totalRecords = 0;
    }

    // 基于字段自动生成查询示例
    result.queryExamples = buildQueryExamples(tableId, fields, result.tags);

    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

/**
 * 基于表字段自动生成查询示例
 */
function buildQueryExamples(tableId: string, fields: any[], _tags?: any[]): any[] {
  const examples: any[] = [];
  const fieldKeys = fields.map((f: any) => f.key);
  const hasName = fieldKeys.includes('name');
  const hasStatus = fieldKeys.includes('status');
  const hasOnline = fieldKeys.includes('online');
  const hasCreateTime = fieldKeys.includes('createTime');
  const hasDisable = fieldKeys.includes('disable');
  const hasType = fieldKeys.includes('type');

  // 1. 基础查询
  examples.push({
    description: '基础查询（前10条）',
    cli: `kesi records ${tableId} --limit 10`,
    api: `GET /core/t/${tableId}/d?query={"limit":10,"withCount":true}`,
    frontend: `api.query({ limit: 10 })`,
  });

  // 2. 模糊搜索（有 name 字段时）
  if (hasName) {
    examples.push({
      description: '按名称模糊查询',
      cli: `kesi records ${tableId} -f '{"name":{"$regex":"关键词"}}'`,
      api: `GET /core/t/${tableId}/d?query={"filter":{"name":{"$regex":"关键词"}},"withCount":true}`,
      frontend: `api.query({}, { name: { $regex: '关键词' } })`,
    });
  }

  // 3. 精确过滤
  if (hasStatus) {
    examples.push({
      description: '按状态精确过滤',
      cli: `kesi records ${tableId} -f '{"status":{"$eq":"active"}}'`,
      api: `GET /core/t/${tableId}/d?query={"filter":{"status":{"$eq":"active"}},"withCount":true}`,
      frontend: `api.query({}, { status: { $eq: 'active' } })`,
    });
  }

  // 4. 设备在线过滤
  if (hasOnline) {
    examples.push({
      description: '查询在线设备',
      cli: `kesi records ${tableId} -f '{"online":true}'`,
      api: `GET /core/t/${tableId}/d?query={"filter":{"online":true},"withCount":true}`,
      frontend: `api.query({}, { online: { $eq: true } })`,
    });
  }

  // 5. 多条件组合
  const multiConditions: string[] = [];
  const multiFrontend: string[] = [];
  if (hasOnline) {
    multiConditions.push('"online":true');
    multiFrontend.push('online: { $eq: true }');
  }
  if (hasDisable) {
    multiConditions.push('"disable":{"$ne":true}');
    multiFrontend.push('disable: { $ne: true }');
  }
  if (hasType) {
    multiConditions.push('"type":{"$in":["sensor","gateway"]}');
    multiFrontend.push('type: { $in: ["sensor", "gateway"] }');
  }
  if (multiConditions.length >= 2) {
    const filter = '{' + multiConditions.join(',') + '}';
    examples.push({
      description: '多条件组合过滤',
      cli: `kesi records ${tableId} -f '${filter}' -l 50`,
      api: `GET /core/t/${tableId}/d?query={"filter":${filter},"limit":50,"withCount":true}`,
      frontend: `api.query({ limit: 50 }, { ${multiFrontend.join(', ')} })`,
    });
  }

  // 6. 排序 + 分页
  if (hasCreateTime) {
    examples.push({
      description: '排序 + 分页',
      cli: `kesi records ${tableId} -s '{"createTime":-1}' -l 20 --skip 0`,
      api: `GET /core/t/${tableId}/d?query={"sort":{"createTime":-1},"skip":0,"limit":20,"withCount":true}`,
      frontend: `api.query({ limit: 20, skip: 0, order: { createTime: 'DESC' } })`,
    });
  }

  // 7. 计数
  if (hasOnline) {
    examples.push({
      description: '统计在线设备数',
      cli: `kesi records ${tableId} -f '{"online":true}' --limit 1 --with-count`,
      api: `GET /core/t/${tableId}/d/count?query={"where":{"online":true}}`,
      frontend: `api.count({ online: { $eq: true } })`,
    });
  }

  return examples;
}
