/**
 * 字段验证器
 * 在执行 CLI 指令前验证表字段的属性和配置是否正确
 */

// ==================== 控件类型定义 ====================

/** 允许的控件类型 */
export const VALID_CONTROL_TYPES = [
  'text',
  'number',
  'select-string',
  'select-number',
  'select-array-string',
  'select-array-number',
  'date',
  'date-range',
  'time',
  'rich-text',
  'boolean',
  'reference',
  'editable-table',
  'upload',
  'upload-group',
  'area',
  'rate',
  'map',
  'link',
  'serial-number',
  'user-role',
  'bytes-array',
  'relate',
  'relate-multiple',
] as const;

export type ControlType = typeof VALID_CONTROL_TYPES[number];

/** 控件类型配置 */
export const CONTROL_TYPE_CONFIG: Record<ControlType, {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  config: string;
  requiredProps?: string[];
  optionalProps?: string[];
}> = {
  'text': { name: '文本', type: 'string', config: '文本' },
  'number': { name: '数字', type: 'number', config: '数字' },
  'select-string': { name: '选择器(文本)', type: 'string', config: '选择器', requiredProps: ['enum'] },
  'select-number': { name: '选择器(数字)', type: 'number', config: '选择器', requiredProps: ['enum'] },
  'select-array-string': { name: '选择器(多选文本)', type: 'array', config: '选择器', requiredProps: ['enum'] },
  'select-array-number': { name: '选择器(多选数字)', type: 'array', config: '选择器', requiredProps: ['enum'] },
  'date': { name: '日期', type: 'string', config: '日期' },
  'date-range': { name: '日期范围', type: 'string', config: '日期范围' },
  'time': { name: '时间', type: 'string', config: '时间' },
  'rich-text': { name: '富文本', type: 'string', config: '富文本' },
  'boolean': { name: '布尔值', type: 'boolean', config: '布尔值' },
  'reference': { name: '查找引用', type: 'string', config: '查找引用' },
  'editable-table': { name: '表格', type: 'array', config: '表格', requiredProps: ['items'] },
  'upload': { name: '附件', type: 'object', config: '附件' },
  'upload-group': { name: '附件组', type: 'array', config: '附件组' },
  'area': { name: '区域', type: 'string', config: '区域' },
  'rate': { name: '星级评价', type: 'number', config: '星级评价' },
  'map': { name: '定位', type: 'object', config: '定位' },
  'link': { name: '链接', type: 'string', config: '链接' },
  'serial-number': { name: '编号', type: 'string', config: '编号' },
  'user-role': { name: '用户', type: 'object', config: '用户' },
  'bytes-array': { name: '字节数组', type: 'string', config: '字节数组' },
  'relate': { name: '关联字段(单选)', type: 'object', config: '关联字段', requiredProps: ['relate'] },
  'relate-multiple': { name: '关联字段(多选)', type: 'array', config: '关联字段', requiredProps: ['relate'] },
};

// ==================== 验证错误类型 ====================

export interface ValidationError {
  field?: string;
  type: 'error' | 'warning';
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ==================== 验证函数 ====================

/**
 * 验证单个字段
 */
function validateField(field: any, index?: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const fieldPath = index !== undefined ? `字段[${index}]` : '字段';

  // 检查必需的基础属性
  if (!field.key && !field.identifier) {
    errors.push({
      field: field.key || field.identifier,
      type: 'error',
      message: `${fieldPath}: 缺少字段标识 (key 或 identifier)`,
      path: 'key'
    });
  }

  if (!field.title && !field.name) {
    warnings.push({
      field: field.key || field.identifier,
      type: 'warning',
      message: `${fieldPath}: 缺少字段标题 (title 或 name)`,
      path: 'title'
    });
  }

  // 验证 controlType
  const controlType = field.controlType as ControlType;
  if (!controlType) {
    errors.push({
      field: field.key || field.identifier || '(unknown)',
      type: 'error',
      message: `${fieldPath}: 缺少 controlType`,
      path: 'controlType'
    });
    return { valid: false, errors, warnings };
  }

  if (!VALID_CONTROL_TYPES.includes(controlType)) {
    errors.push({
      field: field.key || field.identifier,
      type: 'error',
      message: `${fieldPath}: 无效的 controlType "${controlType}"，允许的值: ${VALID_CONTROL_TYPES.join(', ')}`,
      path: 'controlType'
    });
    return { valid: false, errors, warnings };
  }

  // 检查常见错误：使用 'select' 或 'relate' 而非完整的类型
  // 由于 TypeScript 类型检查，我们需要用字符串包含来判断
  const controlTypeStr = String(controlType);
  if (controlTypeStr === 'select' || controlTypeStr === 'relate') {
    errors.push({
      field: field.key || field.identifier,
      type: 'error',
      message: `${fieldPath}: controlType "${controlTypeStr}" 不完整，请使用完整的类型（如 select-string、relate-multiple 等）`,
      path: 'controlType'
    });
  }

  // 获取控件类型配置
  const typeConfig = CONTROL_TYPE_CONFIG[controlType];

  // 验证 type 是否匹配
  if (field.type && field.type !== typeConfig.type) {
    errors.push({
      field: field.key || field.identifier,
      type: 'error',
      message: `${fieldPath}: type "${field.type}" 与 controlType "${controlType}" 不匹配，应为 "${typeConfig.type}"`,
      path: 'type'
    });
  }

  // 验证 config 是否匹配
  if (field.config && field.config !== typeConfig.config) {
    warnings.push({
      field: field.key || field.identifier,
      type: 'warning',
      message: `${fieldPath}: config "${field.config}" 与 controlType "${controlType}" 不匹配，应为 "${typeConfig.config}"`,
      path: 'config'
    });
  }

  // 验证必需的属性
  if (typeConfig.requiredProps) {
    for (const prop of typeConfig.requiredProps) {
      const value = (field as any)[prop];
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        errors.push({
          field: field.key || field.identifier,
          type: 'error',
          message: `${fieldPath}: controlType "${controlType}" 缺少必需属性 "${prop}"`,
          path: prop
        });
      }
    }
  }

  // 特殊验证：选择器的 enum 必须是非空数组
  if (controlType.startsWith('select-') && field.enum) {
    if (!Array.isArray(field.enum)) {
      errors.push({
        field: field.key || field.identifier,
        type: 'error',
        message: `${fieldPath}: enum 必须是数组`,
        path: 'enum'
      });
    } else if (field.enum.length === 0) {
      errors.push({
        field: field.key || field.identifier,
        type: 'error',
        message: `${fieldPath}: enum 不能为空数组`,
        path: 'enum'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证表数据中的字段
 */
export function validateTableFields(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data) {
    errors.push({
      type: 'error',
      message: '表数据为空'
    });
    return { valid: false, errors, warnings };
  }

  // 获取字段列表
  const fields = data.fieldSchema || data.fields || [];

  if (!Array.isArray(fields)) {
    errors.push({
      type: 'error',
      message: 'fieldSchema 不是数组',
      path: 'fieldSchema'
    });
    return { valid: false, errors, warnings };
  }

  if (fields.length === 0) {
    warnings.push({
      type: 'warning',
      message: '表没有定义任何字段'
    });
  }

  // 验证每个字段
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const result = validateField(field, i);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 格式化验证结果为可读的输出
 */
export function formatValidationResult(result: ValidationResult, format: 'text' | 'json' = 'text'): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];

  if (result.valid && result.warnings.length === 0) {
    lines.push('✅ 字段验证通过');
  } else if (result.valid && result.warnings.length > 0) {
    lines.push('⚠️ 字段验证通过，但有 ' + result.warnings.length + ' 个警告');
  } else {
    lines.push('❌ 字段验证失败，发现 ' + result.errors.length + ' 个错误');
  }

  if (result.errors.length > 0) {
    lines.push('\n错误:');
    for (const error of result.errors) {
      const fieldInfo = error.field ? `[${error.field}]` : '';
      lines.push(`  - ${error.message} ${fieldInfo}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('\n警告:');
    for (const warning of result.warnings) {
      const fieldInfo = warning.field ? `[${warning.field}]` : '';
      lines.push(`  - ${warning.message} ${fieldInfo}`);
    }
  }

  return lines.join('\n');
}
