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

    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}
