/**
 * 配置上下文类型定义
 */

// ==================== 基础类型 ====================

/** API Provider 类型 */
export type APIProvider = 'zhipu'

/** 健康状态类型 */
export type HealthStatus = 'online' | 'offline' | 'starting'

/** 配置更新类型 */
export type ConfigUpdateType = 'apiKey' | 'model' | 'health' | 'full'

// ==================== 接口定义 ====================

/** 模型信息 */
export interface ModelInfo {
  readonly id: string
  readonly name: string
}

/** 配置数据接口 */
export interface ConfigData {
  /** API Key 值 */
  apiKey: string
  /** 是否已设置 API Key */
  hasApiKey: boolean
  /** API 提供商 */
  apiProvider: APIProvider
  /** 可用模型列表 */
  models: readonly ModelInfo[]
  /** 当前选中的模型 ID */
  currentModel: string
  /** API Base URL */
  baseUrl: string
  /** 服务端口 */
  port: number
  /** 是否调试模式 */
  debug: boolean
  /** 健康状态 */
  healthStatus: HealthStatus
  /** 最后健康检查时间戳 */
  lastHealthCheck: number | null
}

/** 配置上下文值接口 */
export interface ConfigContextValue {
  /** 配置数据 */
  readonly config: ConfigData
  /** 是否正在加载 */
  readonly isLoading: boolean
  /** 错误信息 */
  readonly error: string | null

  /** 刷新配置 */
  refreshConfig: () => void
  /** 保存 API Key */
  saveAPIKey: (provider: APIProvider, apiKey: string) => Promise<boolean>
  /** 删除 API Key */
  deleteAPIKey: (provider: APIProvider) => Promise<boolean>
  /** 更新配置 */
  updateConfig: (newConfig: Partial<ConfigData>) => Promise<boolean>
  /** 检查是否有有效的 API Key */
  hasValidAPIKey: () => boolean
  /** 获取当前模型信息 */
  getCurrentModel: () => ModelInfo | null
}

// ==================== 事件类型 ====================

/** 配置更新事件 */
export interface ConfigUpdateEvent {
  readonly type: ConfigUpdateType
  readonly data: Partial<ConfigData>
  readonly timestamp: number
}

/** 健康状态更新事件 */
export interface HealthUpdateEvent {
  readonly status: HealthStatus
  readonly timestamp: number
}

// ==================== IPC 响应类型 ====================

/** IPC 响应基础接口 */
interface IPCResponse<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
}

/** 设置数据响应 */
export interface SettingsResponse {
  readonly apiKey?: string
  readonly models?: readonly ModelInfo[]
  readonly currentModel?: string
  readonly baseUrl?: string
}

/** 健康状态响应 */
export interface HealthResponse {
  readonly status: HealthStatus
  readonly timestamp: number
}

/** IPC 响应类型映射 */
export interface IPCResponseMap {
  'config:get-settings': IPCResponse<SettingsResponse>
  'config:get-health': IPCResponse<HealthResponse>
  'config:save-api-key': IPCResponse<void>
  'config:delete-api-key': IPCResponse<void>
  'config:save': IPCResponse<void>
}

// ==================== 工具类型 ====================

/** 创建只读的配置数据 */
export type ReadonlyConfigData = Readonly<ConfigData>

/** 配置数据的部分更新 */
export type ConfigDataUpdate = Partial<ConfigData>

/** 提取模型 ID 类型 */
export type ModelId = ConfigData['currentModel']

/** 验证配置是否完整 */
export function isCompleteConfig(
  config: Partial<ConfigData>
): config is ConfigData {
  return (
    typeof config.apiKey === 'string' &&
    typeof config.hasApiKey === 'boolean' &&
    typeof config.apiProvider === 'string' &&
    Array.isArray(config.models) &&
    typeof config.currentModel === 'string' &&
    typeof config.baseUrl === 'string' &&
    typeof config.port === 'number' &&
    typeof config.debug === 'boolean' &&
    typeof config.healthStatus === 'string' &&
    (config.lastHealthCheck === null ||
      typeof config.lastHealthCheck === 'number')
  )
}

/** 验证健康状态是否有效 */
export function isValidHealthStatus(status: unknown): status is HealthStatus {
  return status === 'online' || status === 'offline' || status === 'starting'
}

/** 链接状态配置 (已迁移到 ConnectContext.tsx) */
// ConnectConfig 类型已内联定义在 ConnectContext.tsx 中
