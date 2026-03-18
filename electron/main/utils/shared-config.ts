import type { SharedConfig } from '../../electron-env'
import { loggerInfo } from './logger'

/**
 * 全局共享配置管理
 * 用于在主进程各模块间共享配置数据
 */

const DEFAULT_PORT = 18789

// 获取全局对象并添加类型断言
const globalThis = global as typeof global & { sharedConfig: SharedConfig }

/**
 * 初始化全局共享配置
 */
export function initSharedConfig(): void {
  if (!globalThis.sharedConfig) {
    globalThis.sharedConfig = {
      port: DEFAULT_PORT,
      gatewayBaseUrl: `http://localhost:${DEFAULT_PORT}`
    }
    loggerInfo(`[SharedConfig] 初始化全局配置: port=${DEFAULT_PORT}`, 'shared-config')
  }
}

/**
 * 获取共享配置
 */
export function getSharedConfig(): SharedConfig {
  if (!globalThis.sharedConfig) {
    initSharedConfig()
  }
  return globalThis.sharedConfig
}

/**
 * 设置 Gateway 端口
 */
export function setGatewayPort(port: number): void {
  if (!globalThis.sharedConfig) {
    initSharedConfig()
  }
  globalThis.sharedConfig.port = port
  globalThis.sharedConfig.gatewayBaseUrl = `http://localhost:${port}`
  loggerInfo(`[SharedConfig] 设置端口: ${port}, baseUrl: ${globalThis.sharedConfig.gatewayBaseUrl}`, 'shared-config')
}

/**
 * 获取 Gateway 端口
 */
export function getGatewayPort(): number {
  return getSharedConfig().port
}

/**
 * 获取 Gateway 基础地址
 */
export function getGatewayBaseUrl(): string {
  return getSharedConfig().gatewayBaseUrl
}
