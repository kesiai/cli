/**
 * KESI CLI 类型定义
 */

// ==================== 通用 ====================

export interface QueryParams {
  filter?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  withCount?: boolean;
}

export interface PageResponse<T = any> {
  list: T[];
  total: number;
}

export type OutputFormat = 'json' | 'table' | 'plain';
export type TableType = 'normal' | 'device' | 'dataAuth' | 'settable' | 'tableMapping' | 'tableClasses';
export type TableTemplate = 'common' | 'device' | 'department' | 'settable' | 'tableMapping' | 'tableClasses';

// ==================== 表 Schema ====================

export interface FieldProperty {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title: string;
  controlType: string;
  config?: string;
  need?: boolean;
  unique?: boolean;
  disabled?: boolean;
  defaultVal?: any;
  description?: string;
  listFields?: boolean;
  createShow?: boolean;
  editShow?: boolean;
  isSystem?: boolean;
  [key: string]: any;
}

export interface TableSchemaDefinition {
  type: 'object';
  name: string;
  title: string;
  properties: Record<string, FieldProperty>;
  formSchema?: any[];
  formLayout?: { cols?: number; labelLayout?: string };
  tableSchema?: any[];
  filterSchema?: any[];
  fieldRules?: { mutualRules?: any[]; validations?: any[] };
  orders?: Record<string, 'ASC' | 'DESC'>;
}

export interface TableCreateInput {
  id: string;
  title: string;
  description?: string;
  showField?: string;
  catalog?: any;
  icon?: string;
  template: TableTemplate;
  /**
   * 表功能列表，决定 tableMajorType。
   * 关键映射：device 表需 ["device","warning","computed"]，
   * department 表需 ["dataAuth"]，tableMapping 需 ["tableMapping"]，
   * tableClasses 需 ["tableClasses"]，settable 需 ["settable"]
   */
  function?: string[];
  schema: TableSchemaDefinition;
  /** 设备配置（仅 template="device" 时有效） */
  device?: ModelDeviceConfig;
  /** 计算节点配置 */
  computed?: ComputedConfig;
  /** 报警规则配置 */
  warning?: WarningConfig;
  [key: string]: any;
}

export interface TableResponse {
  id: string;
  uid?: string;
  title: string;
  description?: string;
  showField?: string;
  catalog?: any;
  icon?: string;
  template?: TableTemplate;
  tableMajorType?: TableType;
  function?: string[];
  schema?: TableSchemaDefinition;
  fieldCount?: number;
  recordCount?: number;
  status?: string;
  createTime?: number;
  updateTime?: number;
  device?: any;
  computed?: any;
  warning?: any;
  [key: string]: any;
}

// ==================== 表记录 ====================

export interface RecordInput {
  [key: string]: any;
}

export interface RecordResponse {
  id: string;
  uid?: string;
  _table?: string;
  table?: { id: string };
  _settings?: {
    device?: any;
    computed?: any;
    warning?: any;
    gis?: any;
  };
  _department?: any[];
  createTime?: string;
  creator?: { id: string; name: string };
  updateTime?: string;
  modifier?: { id: string; name: string };
  [key: string]: any;
}

// ==================== 设备表（device）====================

/** 点位仿真配置 */
export interface TagEmulator {
  max: number;
  min: number;
  step: number;
  type: 'linear' | 'random';
}

/** 设备点位（device.tags 项） */
export interface DeviceTag {
  id: string;
  name: string;
  emulator?: TagEmulator;
  errview?: string;
  policy?: string;
  /** 驱动特有点位参数 */
  [key: string]: any;
}

/** 驱动连接配置（device.settings）— 来自驱动实例的 device.settings */
export interface DeviceSettings {
  /** Modbus 连接参数 */
  ip?: string;
  port?: number;
  /** 采集间隔（秒） */
  interval?: number;
  /** 其他驱动特定配置 */
  [key: string]: any;
}

/** 设备指令操作项 */
export interface CommandOp {
  param: string;
}

/** 设备指令（device.commands 项） */
export interface DeviceCommand {
  name: string;
  showName?: string;
  retry?: number;
  ops?: CommandOp[];
  paramsScript?: string;
  tag?: { id: string; name: string };
  /** 写入指令配置 */
  writeIn?: {
    ioway?: string;
    type?: string;
    tag?: { id: string; name: string } | null;
    select?: any; mod?: any; tagValue?: any;
    objectValue?: any; arrayValue?: any; tableValue?: any;
    select2?: any; ifRepeat?: any;
    objectValue2?: any; tableValue2?: any;
    schema?: Record<string, any>;
    formValue?: Record<string, any>;
  };
  /** 输出指令配置 */
  writeOut?: {
    type?: string;
    select?: any; mod?: any; tagValue?: any; tag?: any;
    objectValue?: any; arrayValue?: any; tableValue?: any;
    select2?: any; ifRepeat?: any;
    objectValue2?: any; tableValue2?: any;
    schema?: Record<string, any>;
    formValue?: Record<string, any>;
  };
}

/** 设备事件（device.events 项） */
export interface DeviceEvent {
  id: string;
  name: string;
  writeOut?: {
    schema?: Record<string, any>;
    formValue?: Record<string, any>;
  };
}

/** 设备完整配置（表顶级 device 字段） */
export interface ModelDeviceConfig {
  devicePlugin?: boolean;
  /** 驱动标识 */
  driver?: string;
  /** 驱动实例ID */
  driverExampleId?: string;
  /** 驱动组ID（组合键: "{driverType}_$$_{groupId}"） */
  driverGroupId?: string;
  /** 驱动名称 */
  driverName?: string;
  /** 驱动类型（如 'modbus', 'opcua'）= 驱动实例的 driverType */
  driverType?: string;
  /** 是否仿真 */
  emulator?: boolean;
  /** 组ID */
  groupId?: string;
  /** 未启用的标签ID列表 */
  notEnabledTags?: string[];
  /** 驱动参数配置 */
  settings?: DeviceSettings;
  /** 点位列表 */
  tags?: DeviceTag[];
  /** 是否测试驱动 */
  test?: boolean;
  /** 指令列表 */
  commands?: DeviceCommand[];
  /** 事件列表 */
  events?: DeviceEvent[];
}

// ==================== 属性点（API 返回）====================

export interface Tag {
  id: string;
  name: string;
  dataType?: string;
  unit?: string;
  description?: string;
  [key: string]: any;
}

// ==================== 计算节点（computed）====================

/** 计算节点映射配置 */
export interface ComputedTagMapping {
  id: string;
  name: string;
  table: string;
  tableData?: {
    id: string;
    name: string;
    table: { id: string };
  };
}

/** 计算节点（computed.tags 项） */
export interface ComputedTag {
  id: string;
  name: string;
  /** 类型：映射 / 计算 / 统计 / 输入 */
  type?: 'mapping' | 'compute' | 'stats' | 'input';
  /** 存储策略 */
  policy?: string;
  errview?: string;
  /** 映射配置（type='mapping'） */
  mapping?: ComputedTagMapping;
  radioType?: string;
  setMethod?: 'custom' | 'classes';
  /** 其他字段（如 logic、statsMethod、value 等） */
  [key: string]: any;
}

/** 计算节点完整配置（表顶级 computed 字段） */
export interface ComputedConfig {
  tags: ComputedTag[];
}

// ==================== 报警规则（warning，表级）====================

/** 报警规则逻辑 */
export interface WarningRuleLogic {
  /** jsonlogic 或 jsLogic 表达式 */
  logic: Record<string, any>;
  /** 'jsonlogic' | 'jsLogic' */
  type: string;
}

/** 报警规则执行设置 */
export interface WarningRuleExecutionSetting {
  cronExpression?: string;
  disable?: boolean;
  executionType?: Record<string, any>;
}

/** 表级报警规则（warning.rules 项） */
export interface WarningRule {
  id: string;
  /** 规则名称（注意：字段名是 warningname，不是 name） */
  warningname: string;
  description?: string;
  /** 报警级别：'低' | '中' | '高' 或 "1" | "2" | "3" */
  level?: string;
  alert?: boolean;
  handle?: boolean;
  separateAlert?: boolean;
  /** 报警逻辑 */
  logic?: WarningRuleLogic;
  fieldName?: string[];
  executionSetting?: WarningRuleExecutionSetting;
  type?: string[];
  broadcastContent?: string;
  timesOfPlay?: number;
  whiteList?: string[];
  blackList?: string[];
  listType?: 'nolimit' | 'black' | 'white';
  delayFull?: any;
  timeoutSetting?: any;
  disable?: boolean;
  [key: string]: any;
}

/** 报警规则完整配置（表顶级 warning 字段） */
export interface WarningConfig {
  rules: WarningRule[];
}

// ==================== 报警事件（warning/warning API）====================

export type WarningLevel = 1 | 2 | 3 | 4;
export type WarningStatus = 0 | 1 | 2 | 3;

export interface Warning {
  id?: string;
  ruleId?: string;
  ruleName?: string;
  level: WarningLevel;
  status: WarningStatus;
  title?: string;
  content?: string;
  deviceId?: string;
  deviceName?: string;
  occurTime: number;
  [key: string]: any;
}

// ==================== 认证 ====================

export interface LoginResponse {
  token: string;
  id: string;
  username: string;
  isSuper: boolean;
  permissions: string[];
  roles: string[];
}
