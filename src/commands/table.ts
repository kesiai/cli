import { getApiClient, executeCommand, normalizeQueryOptions, resolveOutputFormat, deepMerge } from '../core/utils.js';
import { formatOutput, formatSuccess } from '../core/formatter.js';
import { readFileSync } from 'node:fs';
import { validateTableFields, formatValidationResult } from '../core/field-validator.js';

export async function tablesList(options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const params = normalizeQueryOptions(options);
    const result = await client.getTables(params);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function tableGet(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    const result = await client.getTableById(id);
    const format = resolveOutputFormat(options.output);
    console.log(formatOutput(result, format));
  });
}

export async function tableCreate(options: any): Promise<void> {
  await executeCommand(async () => {
    let data: any;
    if (options.json) {
      data = JSON.parse(options.json);
    } else if (options.file) {
      data = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else {
      throw new Error('请提供 --json 或 --file 参数');
    }

    // 验证字段配置
    const validationResult = validateTableFields(data);
    const format = (options.output === 'json') ? 'json' : 'text';

    // 显示验证结果
    console.log(formatValidationResult(validationResult, format as 'text' | 'json'));

    // 如果有错误，终止创建
    if (!validationResult.valid) {
      throw new Error('字段验证失败，请修复后重试');
    }

    // 验证通过，继续创建
    const client = getApiClient();
    const id = await client.saveTable(data);
    console.log(formatSuccess(`创建成功，表ID: ${id}`));
  });
}

export async function tableUpdate(id: string, options: any): Promise<void> {
  await executeCommand(async () => {
    let partialData: any;
    if (options.json) {
      partialData = JSON.parse(options.json);
    } else if (options.file) {
      partialData = JSON.parse(readFileSync(options.file, 'utf-8'));
    } else {
      throw new Error('请提供 --json 或 --file 参数');
    }

    const client = getApiClient();

    // 1️⃣ 先获取原始表结构
    const original = await client.getTableById(id);

    // 2️⃣ 深度合并（注意 properties 等嵌套字段）
    const merged = deepMerge(original, partialData);

    // 3️⃣ 验证合并后的完整数据
    const validationResult = validateTableFields(merged);
    const format = (options.output === 'json') ? 'json' : 'text';

    // 显示验证结果
    console.log(formatValidationResult(validationResult, format as 'text' | 'json'));

    // 如果有错误，终止更新
    if (!validationResult.valid) {
      throw new Error('字段验证失败，请修复后重试');
    }

    // 4️⃣ 调用更新接口
    await client.updateTable(id, merged);
    console.log(formatSuccess('更新成功'));
  });
}

export async function tableDelete(id: string): Promise<void> {
  await executeCommand(async () => {
    const client = getApiClient();
    await client.deleteTable(id);
    console.log(formatSuccess('删除成功'));
  });
}
