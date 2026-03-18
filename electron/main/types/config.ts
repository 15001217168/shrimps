/**
 * 配置相关类型定义
 */

// API Provider 类型
export type APIProvider = 'zhipu'

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
  claw: ClawConfig
  gateway: GatewayConfig
  port: number
  debug: boolean
}

// 健康状态
export type HealthStatus = 'online' | 'offline' | 'starting'

