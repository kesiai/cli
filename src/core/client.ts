import axios, { type AxiosInstance } from 'axios';
import type { KesiConfig } from './config.js';
import { ApiError, AuthError, NetworkError } from './errors.js';
import sha1 from 'crypto-js/sha1.js';

export class KesiApiClient {
  private http: AxiosInstance;
  private token: string;
  private config: KesiConfig;
  private loginPromise: Promise<void> | null = null;

  constructor(config: KesiConfig) {
    this.config = config;
    this.token = config.token || '';

    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-request-project': config.projectId || 'default',
        // 平台的 name 等字段是 i18n 字段，按此头解析返回（无头时返回值不确定）——固定住保证输出可断言
        'Accept-Language': 'zh-CN',
      },
    });

    // 自动注入 token，没有 token 时先用密码登录
    this.http.interceptors.request.use(async (cfg) => {
      if (!this.token && this.config.username && this.config.password) {
        await this.ensureLogin();
      }
      if (this.token) {
        cfg.headers['Authorization'] = this.normalizeToken(this.token);
      }
      return cfg;
    });

    // 401 时自动用密码重新登录，然后重试
    this.http.interceptors.response.use(
      (res) => res,
      async (err) => {
        const { config: reqConfig, response } = err;
        if (response?.status === 401 && this.config.username && this.config.password && !reqConfig._retried) {
          reqConfig._retried = true;
          try {
            // 清掉旧 token，强制重新登录
            this.token = '';
            await this.ensureLogin();
            reqConfig.headers['Authorization'] = this.normalizeToken(this.token);
            return this.http.request(reqConfig);
          } catch {
            // 重登失败，抛原始错误
          }
        }
        if (err.response) {
          const { status, data } = err.response;
          if (status === 401) throw new AuthError(data?.message || '认证失败', data);
          throw new ApiError(data?.message || '请求失败', status, data);
        }
        throw new NetworkError(err.message || '网络错误');
      },
    );
  }

  /** 用配置中的用户名密码登录（只登录一次，并发安全） */
  private async ensureLogin(): Promise<void> {
    if (this.loginPromise) return this.loginPromise;
    this.loginPromise = this.doLogin();
    try {
      await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  private async doLogin(): Promise<void> {
    const res = await this.http.post('/core/auth/login', {
      username: this.config.username,
      password: sha1(this.config.password!).toString(),
    });
    if (res.data?.token) {
      this.token = res.data.token;
    }
  }

  /** 确保 token 格式正确（去掉重复的 Bearer 前缀） */
  private normalizeToken(token: string): string {
    // 服务器返回的 token 可能已经包含 "Bearer " 前缀，直接使用
    // 如果没有前缀，则添加
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  setToken(token: string) {
    this.token = token;
  }

  // ==================== 认证 ====================

  async login(username: string, password: string): Promise<any> {
    const res = await this.http.post('/core/auth/login', {
      username,
      password: sha1(password).toString(),
    });
    return res.data;
  }

  // ==================== 表管理 ====================

  async getTables(params?: Record<string, any>): Promise<any[]> {
    const res = await this.http.get('/core/t/schema', {
      params: { query: JSON.stringify(params || {}) },
    });
    return res.data || [];
  }

  async getTableById(id: string): Promise<any> {
    const res = await this.http.get(`/core/t/schema/${id}`);
    return res.data || null;
  }

  async getChildTables(parentId: string): Promise<any[]> {
    const res = await this.http.get(`/core/t/schema/${parentId}/children`);
    return res.data || [];
  }

  async saveTable(data: any): Promise<string> {
    const res = await this.http.post('/core/t/schema', data);
    if (res.data.InsertedID) return res.data.InsertedID;
    return res.data.id;
  }

  async updateTable(id: string, data: any): Promise<void> {
    await this.http.patch(`/core/t/schema/${id}`, data);
  }

  /**
   * 修改表标识（⚠️ 等同删除重建的特殊操作）：PATCH /core/t/schema/change/{旧id}，新 id 在 body.id
   * 实测后端只读 body.id（其余字段忽略、表配置保留），但表下记录不迁移（将无法访问）；
   * 普通 update 改不了 id（PATCH 的 body.id 不生效，对不存在的 id 静默无效）。
   * 需同时改其他字段时：先 updateTable 再本方法。
   */
  async changeTableId(oldId: string, data: any): Promise<void> {
    await this.http.patch(`/core/t/schema/change/${oldId}`, data);
  }

  async deleteTable(id: string): Promise<void> {
    await this.http.delete(`/core/t/schema/${id}`);
  }

  // ==================== 表记录 ====================

  async getTableRecords(tableName: string, params?: Record<string, any>): Promise<{ list: any[]; total: number }> {
    const queryParams: Record<string, any> = {};
    if (params?.withCount) queryParams.withCount = true;

    // 默认 projectAll=true，返回所有字段（不然后端只按 tableSchema 投影，自定义字段会丢失）
    const query = { projectAll: true, ...params };

    const res = await this.http.get(`/core/t/${tableName}/d`, {
      params: { query: JSON.stringify(query), ...queryParams },
    });

    const total = (params?.withCount && res.headers['count'])
      ? parseInt(res.headers['count'], 10)
      : (res.data?.length || 0);

    return { list: res.data || [], total };
  }

  async getTableRecordById(tableName: string, id: string): Promise<any> {
    const res = await this.http.get(`/core/t/${tableName}/d/${id}`);
    return res.data || null;
  }

  async saveTableRecord(tableName: string, data: any, upsert = false): Promise<string> {
    const res = await this.http.post(`/core/t/${tableName}/d`, data, {
      params: upsert ? { upsert: 'true' } : undefined,
    });
    if (res.data.InsertedID) return res.data.InsertedID;
    return res.data.id;
  }

  async updateTableRecord(tableName: string, id: string, data: any): Promise<void> {
    await this.http.patch(`/core/t/${tableName}/d/${id}`, data);
  }

  /**
   * 修改记录标识（⚠️ 等同删除重建的特殊操作）：PATCH /core/t/{table}/d/change/{旧id}，新 id 在 body.id
   * 实测后端只读 body.id（其余字段忽略、原数据保留），引用方（relate/时序数据/_settings 扩展）不迁移；
   * 普通 update 改不了 id（PATCH 的 body.id 不生效，对不存在的 id 静默无效）。
   * 需同时改其他字段时：先 updateTableRecord 再本方法。
   */
  async changeTableRecordId(tableName: string, oldId: string, data: any): Promise<void> {
    await this.http.patch(`/core/t/${tableName}/d/change/${oldId}`, data);
  }

  async deleteTableRecord(tableName: string, id: string, attachment = false): Promise<void> {
    await this.http.delete(`/core/t/${tableName}/d/${id}`, {
      params: attachment ? { attachment: 'true' } : undefined,
    });
  }

  async batchDeleteTableRecords(tableName: string, ids: string[]): Promise<void> {
    await this.http.post(`/core/t/${tableName}/d/batch-delete`, { ids });
  }

  // ==================== 属性点 ====================

  async getTableTags(tableId: string): Promise<any[]> {
    const res = await this.http.get(`/core/t/schema/tag/${tableId}`);
    return res.data?.tags || res.data || [];
  }

  // ==================== 指令 ====================

  /** 获取单个表的指令列表 */
  async getTableCommands(tableId: string): Promise<any[]> {
    const res = await this.http.get(`/core/t/schema/command/${tableId}`);
    return res.data || [];
  }

  /** 批量获取多个表的指令列表（POST body 为表ID数组） */
  async getTableCommandsBatch(tableIds: string[]): Promise<Record<string, any[]>> {
    const res = await this.http.post('/core/t/schema/commands', tableIds);
    return res.data || {};
  }

  // ==================== 映射表 ====================

  /** 获取映射表的字段配置（从外部数据库同步） */
  async getMappingSchema(tableId: string): Promise<any> {
    const res = await this.http.get(`/core/t/schema/mapping/${tableId}`);
    return res.data || null;
  }

  async getRecordTags(tableName: string, recordId: string): Promise<any[]> {
    const res = await this.http.get(`/core/t/${tableName}/d/tag/${recordId}`);
    return res.data || [];
  }

  // ==================== 时序数据 ====================

  /**
   * 查询最新数据
   * @param pairs [{ tableId, id (记录ID), tagId }]
   */
  async getLatestData(pairs: Array<{ tableId: string; id: string; tagId: string }>): Promise<any[]> {
    const res = await this.http.post('/core/data/latest', pairs);
    return res.data || [];
  }

  /**
   * 查询历史数据
   * GET /core/data/query?query=[{fields, tableId, id, where}]
   * @param pairs [{ tableId, dataId, tagId }]
   * @param startTime 开始时间
   * @param endTime 结束时间
   */
  async getHistoryData(
    pairs: Array<{ tableId: string; dataId: string; tagId: string }>,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    const query = pairs.map((p) => ({
      fields: [`"${p.tagId}"`],
      tableId: p.tableId,
      id: p.dataId,
      where: [`time >= '${startTime.toISOString()}'`, `time <= '${endTime.toISOString()}'`],
    }));
    const res = await this.http.get('/core/data/query', {
      params: { query: JSON.stringify(query) },
    });
    return res.data?.results || [];
  }

  // ==================== 统计 ====================

  async getOnlineStats(tableIds: string[]): Promise<any[]> {
    const res = await this.http.get('/core/t/status/stats', {
      params: { query: JSON.stringify({ tableIds }) },
    });
    return res.data || [];
  }

  // ==================== 报警规则 ====================

  async getWarningRules(params?: Record<string, any>): Promise<{ list: any[]; total: number }> {
    const queryParams: Record<string, any> = {};
    if (params?.withCount) queryParams.withCount = true;
    const res = await this.http.get('/warning/rule', {
      params: { query: JSON.stringify(params || {}), ...queryParams },
    });
    const total = (params?.withCount && res.headers['count'])
      ? parseInt(res.headers['count'], 10) : (res.data?.length || 0);
    return { list: res.data || [], total };
  }

  async getWarningRuleById(id: string): Promise<any> {
    const res = await this.http.get(`/warning/rule/${id}`);
    return res.data || null;
  }

  async createWarningRule(data: any): Promise<string> {
    const res = await this.http.post('/warning/rule', data);
    return res.data.InsertedID;
  }

  async updateWarningRule(id: string, data: any): Promise<void> {
    await this.http.patch(`/warning/rule/${id}`, data);
  }

  async deleteWarningRule(id: string): Promise<void> {
    await this.http.delete(`/warning/rule/${id}`);
  }

  // ==================== 报警 ====================

  async getWarnings(params?: Record<string, any>): Promise<{ list: any[]; total: number }> {
    const queryParams: Record<string, any> = {};
    if (params?.withCount) queryParams.withCount = true;

    // ⚠️ warning/warning 不支持 projectAll，必须用 project 指定字段（MongoDB 投影格式）
    const project = {
      id: 1, time: 1, type: 1, level: 1, status: 1, processed: 1, handle: 1,
      table: 1, tableData: 1, tableDataId: 1, desc: 1, remark: 1, fields: 1,
      confirmUser: 1, confirmTime: 1, handleUser: 1, handleTime: 1,
    };

    const query = { ...params, project };
    const res = await this.http.get('/warning/warning', {
      params: { query: JSON.stringify(query), ...queryParams },
    });
    const total = (params?.withCount && res.headers['count'])
      ? parseInt(res.headers['count'], 10) : (res.data?.length || 0);
    return { list: res.data || [], total };
  }

  async getWarningById(id: string): Promise<any> {
    // GET 单条详情，后端默认返回完整数据，无需 project
    const res = await this.http.get(`/warning/warning/${id}`);
    return res.data || null;
  }

  async updateWarning(id: string, data: any): Promise<void> {
    await this.http.patch(`/warning/warning/${id}`, data);
  }

  async getWarningStatistics(): Promise<any> {
    const res = await this.http.get('/warning/warning/statistics');
    return res.data || {};
  }

  async getLatestWarnings(limit = 10): Promise<any[]> {
    // ⚠️ latest 端点非所有版本支持，失败或返回非数组时降级为 list 排序
    try {
      const res = await this.http.get('/warning/warning/latest', { params: { limit } });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch { /* fallback */ }
    // 降级：用 list + 时间倒序
    const result = await this.getWarnings({ limit, sort: { time: -1 } });
    return result.list;
  }

  async batchConfirmWarnings(data: any): Promise<void> {
    await this.http.post('/warning/warning/batch-confirm', data);
  }

  // ==================== 文件 ====================

  async uploadFile(file: Buffer, filename: string, mimeType?: string, catalog?: string): Promise<any> {
    // 上传到媒体库：POST /core/mediaLibrary/upload?action=cover[&catalog=<目录path>]
    // 手动构造 multipart/form-data body（axios 1.7 不会为 native FormData 自动加 boundary）
    const mime = mimeType || 'application/octet-stream';
    const boundary = `----KesiBoundary${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, file, footer]);
    const params: Record<string, string> = { action: 'cover' };
    if (catalog) params.catalog = catalog;
    const res = await this.http.post('/core/mediaLibrary/upload', body, {
      params,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    });
    return res.data;
  }

  // ==================== 设备控制 ====================

  /** 发送设备指令 */
  async sendDeviceCommand(tableId: string, deviceId: string, command: any, params?: any): Promise<any> {
    const res = await this.http.post('/driver/driver/command', {
      ...command,
      table: tableId,
      tableData: deviceId,
      params: params || {},
    });
    return res.data;
  }


  // ==================== 报表 ====================

  async getReports(params?: Record<string, any>): Promise<any[]> {
    const res = await this.http.get('/api/reports', {
      params: { query: JSON.stringify(params || {}) },
    });
    return res.data || [];
  }

  async getReportById(id: string): Promise<any> {
    const res = await this.http.get(`/api/reports/${id}`);
    return res.data || null;
  }

  async executeReport(id: string, parameters?: any): Promise<any> {
    const res = await this.http.post(`/api/reports/${id}/execute`, { parameters });
    return res.data;
  }

  async createReport(data: any): Promise<string> {
    const res = await this.http.post('/api/reports', data);
    return res.data.InsertedID;
  }

  async updateReport(id: string, data: any): Promise<void> {
    await this.http.patch(`/api/reports/${id}`, data);
  }

  async deleteReport(id: string): Promise<void> {
    await this.http.delete(`/api/reports/${id}`);
  }

  // ==================== 驱动 ====================

  async getDriverInstances(params?: Record<string, any>): Promise<any[]> {
    const query: Record<string, any> = {
      sort: { createTime: -1 },
      skip: 0,
      limit: 50,
      project: {
        name: 1, driverType: 1, state: 1, url: 1,
        groupId: 1, driverVersion: 1, runMode: 1,
        disable: 1, ports: 1, createTime: 1,
      },
      ...params,
    };
    const res = await this.http.get('/driver/driverInstance', {
      params: { query: JSON.stringify(query) },
    });
    return res.data || [];
  }

  async getDriverInstanceById(id: string): Promise<any> {
    const res = await this.http.get(`/driver/driverInstance/${id}`);
    return res.data || null;
  }

  /** 获取驱动 schema（含点位 tag 字段定义、settings 字段定义等） */
  async getDriverSchema(driverType: string): Promise<any> {
    const res = await this.http.get(`/driver/driver/${driverType}/schema`);
    const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    // 后端可能返回 (...) 包裹 + 十六进制字面量（如 siemens-s7 的 enum: [0x04,...]），均非严格 JSON
    const trimmed = raw.trim();
    const jsonStr = (trimmed.startsWith('(') && trimmed.endsWith(')')) ? trimmed.slice(1, -1) : trimmed;
    // 只转换数字位（[ , : 之后）的 0x 字面量，避免误伤字符串值里的 "0x84" 文字说明
    const normalized = jsonStr.replace(/([[,:]\s*)0x[0-9A-Fa-f]+/g, (m, p) => p + parseInt(m.slice(p.length), 16));
    return JSON.parse(normalized);
  }

  // ==================== 驱动目录 / 实例管理 / 安装 ====================

  /** 驱动目录（可安装驱动列表）。⚠️ 条目的 driverType 是分类路径，name 才是驱动 key */
  async getDriverCatalog(params?: Record<string, any>): Promise<any[]> {
    const query: Record<string, any> = {
      sort: { order: 1 },
      ...params,
    };
    const res = await this.http.get('/driver/driver', {
      params: { query: JSON.stringify(query) },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.list || []);
  }

  /**
   * 创建驱动实例，返回实例 id
   * ⚠️ 名称不可重复；创建成功后后续保存一律走 updateDriverInstance，禁止再次 POST（重名报错）
   */
  async createDriverInstance(data: {
    name: string;
    driverType: string;
    driverVersion?: string;
    runMode?: 'one' | 'cluster' | 'node';
    /** 集群组ID：仅 runMode='node' 时传递（= 所选集群实例的 groupId）；其余模式由后端生成，不传 */
    groupId?: string;
    distributed?: 'all' | 'average' | 'lazy';
    disable?: boolean;
    stopAcquisition?: boolean;
    autoUpdateConfig?: boolean;
    debug?: boolean;
    description?: string;
    state?: 'none';
    ports?: string;
    device?: { tags?: any[]; commands?: any[]; events?: any[]; settings?: Record<string, any> };
  }): Promise<string | undefined> {
    const res = await this.http.post('/driver/driverInstance', data);
    return res.data?.InsertedID || res.data?.id;
  }

  /** 更新驱动实例（partialSave）。配置保存在 device 块：{settings, tags, commands, events} */
  async updateDriverInstance(id: string, data: Record<string, any>): Promise<void> {
    await this.http.patch(`/driver/driverInstance/${id}`, data);
  }

  /** 删除驱动实例 */
  async deleteDriverInstance(id: string): Promise<void> {
    await this.http.delete(`/driver/driverInstance/${id}`);
  }

  /** 触发驱动安装（body: {url, id: 驱动key, instanceId}），返回 taskId */
  async installDriver(url: string, driverKey: string, instanceId: string): Promise<string | undefined> {
    const res = await this.http.post('/driver/driver/install', { url, id: driverKey, instanceId });
    return res.data?.id;
  }

  /** 安装进度：{download?, install?, run?}，各含 {progress, err, outInfo}。阶段完成后对应字段会从响应中消失 */
  async getInstallInfo(taskId: string): Promise<any> {
    const res = await this.http.get(`/driver/installInfo/${taskId}`);
    return res.data || {};
  }

  /** 已运行驱动服务列表（安装完成后校验 Meta.serviceId === instanceId） */
  async getDriverServiceList(): Promise<any[]> {
    const res = await this.http.get('/driver/driver/serviceList');
    return res.data || [];
  }

  /** 重启驱动（配置变更后生效）：POST /driver/driver/{groupId}/change/config（按 groupId 路由，非实例 id） */
  async restartDriver(groupId: string): Promise<void> {
    await this.http.post(`/driver/driver/${groupId}/change/config`);
  }

  /** 从实例列表读取 state（⚠️ 详情接口不返回 state 字段，只有列表 projection 带） */
  async getDriverInstanceState(instanceId: string): Promise<string | undefined> {
    const list = await this.getDriverInstances({ limit: 1000 });
    return list.find((i: any) => i.id === instanceId || i._id === instanceId)?.state;
  }

  // ==================== 通用 Resource 查询 ====================

  async queryResource(resource: string, params?: Record<string, any>): Promise<{ items: any[]; total: number }> {
    const query: Record<string, any> = {
      sort: { createTime: -1 },
      skip: 0,
      limit: 20,
      projectAll: true,
      ...params,
    };
    const res = await this.http.get(`/${resource}`, {
      params: { query: JSON.stringify(query) },
    });
    const data = res.data;
    const items = Array.isArray(data) ? data : (data?.items || []);
    const total = parseInt(res.headers['count'] || String(items.length), 10);
    return { items, total };
  }

  async getResourceById(resource: string, id: string): Promise<any> {
    const res = await this.http.get(`/${resource}/${id}`);
    return res.data || null;
  }

  // ==================== 用户 / 角色 ====================

  async getCurrentUser(): Promise<any> {
    const res = await this.http.get('/core/user/me');
    return res.data || null;
  }

  async getUsers(params?: Record<string, any>): Promise<any[]> {
    const res = await this.http.get('/core/user', {
      params: { query: JSON.stringify(params || {}) },
    });
    return res.data || [];
  }

  async getUserById(id: string): Promise<any> {
    const res = await this.http.get(`/core/user/${id}`);
    return res.data || null;
  }

  async createUser(data: any): Promise<string> {
    const res = await this.http.post('/core/user', data);
    return res.data.InsertedID || res.data.id;
  }

  async updateUser(id: string, data: any): Promise<void> {
    await this.http.patch(`/core/user/${id}`, data);
  }

  async deleteUser(id: string): Promise<void> {
    await this.http.delete(`/core/user/${id}`);
  }

  async getRoles(params?: Record<string, any>): Promise<any[]> {
    const res = await this.http.get('/core/role', {
      params: { query: JSON.stringify(params || {}) },
    });
    return res.data || [];
  }

  async getRoleById(id: string): Promise<any> {
    const res = await this.http.get(`/core/role/${id}`);
    return res.data || null;
  }

  async createRole(data: any): Promise<string> {
    const res = await this.http.post('/core/role', data);
    return res.data.InsertedID || res.data.id;
  }

  async updateRole(id: string, data: any): Promise<void> {
    await this.http.patch(`/core/role/${id}`, data);
  }

  async deleteRole(id: string): Promise<void> {
    await this.http.delete(`/core/role/${id}`);
  }

  /** 数据字典列表（core/systemVariable）。端点不支持 query.filter（真机验证被静默忽略），只能全量拉。 */
  async getSystemVariables(): Promise<any[]> {
    const res = await this.http.get('/core/systemVariable', {
      params: { query: JSON.stringify({ limit: 1000 }) },
    });
    return res.data || [];
  }

  /** 字典详情（列表投影不含 value，只有详情有） */
  async getSystemVariableById(id: string): Promise<any> {
    const res = await this.http.get(`/core/systemVariable/${id}`);
    return res.data || null;
  }

  async createSystemVariable(data: any): Promise<string> {
    const res = await this.http.post('/core/systemVariable', data);
    return res.data.InsertedID || res.data.id;
  }

  async updateSystemVariable(id: string, data: any): Promise<void> {
    await this.http.patch(`/core/systemVariable/${id}`, data);
  }

  async deleteSystemVariable(id: string): Promise<void> {
    await this.http.delete(`/core/systemVariable/${id}`);
  }

  /** 系统设置全量读（core/setting 是单例对象，PATCH 要求 body 携带 id） */
  async getSettings(): Promise<any> {
    const res = await this.http.get('/core/setting');
    return res.data || null;
  }

  /** 局部更新系统设置（服务端按键合并；返回 {status:"OK"} 不回实体，需另读） */
  async updateSettings(data: any): Promise<void> {
    await this.http.patch('/core/setting', data);
  }

  // ==================== 数据接口（ds/*） ====================

  async listDataGroups(): Promise<any[]> {
    const res = await this.http.get('/ds/group');
    return res.data || [];
  }

  /** 注意：不存在的 id 返回 Go 零值对象（不 404），调用方需检测 id 为空 */
  async getDataGroupById(id: string): Promise<any> {
    const res = await this.http.get(`/ds/group/${id}`);
    return res.data || null;
  }

  async createDataGroup(data: any): Promise<string> {
    const res = await this.http.post('/ds/group', data);
    return res.data.InsertedID || res.data.id;
  }

  async updateDataGroup(id: string, data: any): Promise<void> {
    await this.http.patch(`/ds/group/${id}`, data);
  }

  async deleteDataGroup(id: string): Promise<void> {
    await this.http.delete(`/ds/group/${id}`);
  }

  async listDataInterfaces(): Promise<any[]> {
    const res = await this.http.get('/ds/interface');
    return res.data || [];
  }

  /** 注意：不存在的 id 返回 Go 零值对象（不 404），调用方需检测 id 为空 */
  async getDataInterfaceById(id: string): Promise<any> {
    const res = await this.http.get(`/ds/interface/${id}`);
    return res.data || null;
  }

  async createDataInterface(data: any): Promise<string> {
    const res = await this.http.post('/ds/interface', data);
    return res.data.InsertedID || res.data.id;
  }

  async updateDataInterface(id: string, data: any): Promise<void> {
    await this.http.patch(`/ds/interface/${id}`, data);
  }

  async deleteDataInterface(id: string): Promise<void> {
    await this.http.delete(`/ds/interface/${id}`);
  }

  /** 执行数据接口：POST /ds/p/<key>，body 为参数键值（对应 variableSchema 的 paramKey） */
  async executeDataInterface(key: string, params: any, debug = false): Promise<any> {
    const q = debug ? '?debug=true' : '';
    const res = await this.http.post(`/ds/p/${encodeURIComponent(key)}${q}`, params || {});
    return res.data;
  }

  // ==================== 媒体库（core/mediaLibrary） ====================

  /** 根目录列表（含内置资源等顶层目录） */
  async listMediaRoot(): Promise<any[]> {
    const res = await this.http.get('/core/mediaLibrary');
    return res.data || [];
  }

  /** 按目录列内容（catalog 为目录 path，如 "我的文件/自定义组件"） */
  async listMediaDir(catalog: string): Promise<any[]> {
    const res = await this.http.get('/core/mediaLibrary', { params: { catalog } });
    return res.data || [];
  }

  /** 全量目录树（name/path/child[]） */
  async getMediaDirTree(): Promise<any[]> {
    const res = await this.http.get('/core/mediaLibrary/all/dir');
    return res.data || [];
  }

  /** 建目录（catalog 为父目录 path，空串=根；平台无目录删除端点，创建不可逆） */
  async createMediaDir(catalog: string, dirName: string): Promise<void> {
    await this.http.post('/core/mediaLibrary/mkdir', { catalog: catalog || '', dirName });
  }
}
