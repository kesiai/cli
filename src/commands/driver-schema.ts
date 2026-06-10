import { getApiClient, executeCommand, resolveOutputFormat } from '../core/utils.js';
import { formatOutput } from '../core/formatter.js';

/**
 * 获取驱动的 schema 定义，包含点位(tag)字段、settings 字段等。
 * 创建设备表时必须先查询驱动 schema，了解点位所需的必填字段。
 *
 * 用法：kesi driver-schema <driverType>
 * 示例：kesi driver-schema modbus
 */
export async function driverSchema(driverType: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const schema = await client.getDriverSchema(driverType);

    // 提取关键信息，让输出更精简
    const result: Record<string, any> = {};

    for (const section of ['model', 'device', 'driver']) {
      const s = schema[section];
      if (!s?.properties) continue;

      const sectionResult: Record<string, any> = {};

      // tags 字段是重点
      if (s.properties.tags) {
        const tagItems = s.properties.tags.items;
        if (tagItems) {
          const tagInfo: Record<string, any> = {
            required: tagItems.required || [],
            fields: {},
          };
          if (tagItems.properties) {
            for (const [key, value] of Object.entries(tagItems.properties)) {
              const prop = value as Record<string, any>;
              const field: Record<string, any> = {
                title: prop.title || key,
                type: prop.type || '',
              };
              if (prop.enum) {
                field.enum = prop.enum;
                if (prop.enum_title) {
                  field.options = prop.enum.map((v: any, i: number) => ({
                    value: v,
                    label: prop.enum_title[i],
                  }));
                }
              }
              if (prop.description) field.description = prop.description;
              tagInfo.fields[key] = field;
            }
          }
          sectionResult.tags = tagInfo;
        }
      }

      // settings 字段
      if (s.properties.settings) {
        const settingsProps = s.properties.settings.properties;
        if (settingsProps) {
          const settingsInfo: Record<string, any> = {};
          for (const [key, value] of Object.entries(settingsProps)) {
            const prop = value as Record<string, any>;
            settingsInfo[key] = {
              title: prop.title || key,
              type: prop.type || '',
            };
            if (prop.description) settingsInfo[key].description = prop.description;
          }
          sectionResult.settings = settingsInfo;
        }
      }

      if (Object.keys(sectionResult).length > 0) {
        result[section] = sectionResult;
      }
    }

    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}
