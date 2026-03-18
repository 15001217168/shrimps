/**
 * 配置相关类型定义
 */

// API Provider 类型 - 支持多个提供商
export type APIProvider = 'zai' | 'anthropic' | 'openai'

// 模型信息
export interface ModelInfo {
  id: string
  name: string
  provider?: APIProvider
}

// Provider 配置接口
export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  models?: ModelInfo[]
}

// Claw 配置接口
export interface ClawConfig {
  provider: APIProvider
  apiKey: string
  baseUrl?: string
  model?: string
}

// Gateway 认证配置接口
export interface GatewayAuthConfig {
  mode: string
  token: string
}

// Gateway 配置接口
export interface GatewayConfig {
  baseUrl: string
  auth: GatewayAuthConfig
}

// 应用配置接口
export interface AppConfig {
  gateway: GatewayConfig
  port: number
  debug: boolean
  // 多 Provider 配置
  providers?: Record<APIProvider, ProviderConfig>
  // 当前选中的模型
  currentModel?: string
  // 可用模型列表
  models?: ModelInfo[]
}

// 健康状态
export type HealthStatus = 'online' | 'offline' | 'starting'
