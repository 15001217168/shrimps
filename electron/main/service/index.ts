/**
 * 服务模块统一导出
 */

import { app } from 'electron'
import { getNodeEnvService } from '../environment/node-env'
import { getSandboxEnvService } from '../environment/sandbox-env'
import { getClawManager } from '../environment/claw-manager'
import { getConfigService } from './config-service'
import { getLauncherService } from './launcher-service'
import { getOpenClawWSService } from './openclaw-ws-service'
import { getSqliteService } from './sqlite-service'
import { getStorageService } from './storage-service'
import { loggerInfo, loggerSuccess } from '../utils/logger'

const LOG_SOURCE = 'service_init'

/**
 * 服务类和单例获取方法
 */
export { ConfigService, getConfigService } from './config-service'
export { LauncherService, getLauncherService } from './launcher-service'
export { OpenClawWSService, getOpenClawWSService } from './openclaw-ws-service'
export { SqliteService, getSqliteService } from './sqlite-service'
export { StorageService, getStorageService } from './storage-service'

/**
 * IPC 注册函数
 */
export { registerAllIPC } from './ipc'

/**
 * 初始化所有服务依赖
 * 在应用启动时调用，设置服务之间的依赖关系
 */
export function initializeServices(): void {
  loggerInfo('初始化服务依赖...', LOG_SOURCE)

  // 获取服务单例
  const nodeEnvService = getNodeEnvService()
  const sandboxEnvService = getSandboxEnvService()
  const clawManager = getClawManager()
  const launcherService = getLauncherService()
  const configService = getConfigService()
  const openClawWSService = getOpenClawWSService()
  const sqliteService = getSqliteService()
  const storageService = getStorageService()

  // 设置环境服务依赖（相互依赖）
  nodeEnvService.setSandboxEnvService(sandboxEnvService)
  sandboxEnvService.setNodeEnvService(nodeEnvService)

  // 设置 ClawManager 依赖
  clawManager.setDependencies(sandboxEnvService, nodeEnvService)

  // 设置 LauncherService 依赖
  launcherService.setDependencies(nodeEnvService, sandboxEnvService, clawManager)

  // 设置 ConfigService 依赖
  configService.setConfigDir(app.getPath('userData'))
  configService.setDependencies(sandboxEnvService, launcherService)

  // 设置 OpenClawWSService 依赖
  openClawWSService.setConfigService(configService)

  // 初始化 SQLite 数据库
  sqliteService.initialize()

  // 初始化存储服务
  storageService.initialize()

  loggerSuccess('服务依赖初始化完成', LOG_SOURCE)
}

/**
 * 初始化应用环境
 * 包括 Node.js 环境检查、沙箱创建、OpenClaw 配置等
 */
export async function initializeAppEnvironment(): Promise<boolean> {
  loggerInfo('初始化应用环境...', LOG_SOURCE)

  // 先初始化服务依赖
  initializeServices()

  // 获取 LauncherService 并初始化
  const launcherService = getLauncherService()
  await launcherService.initialize()

  loggerSuccess('应用环境初始化完成', LOG_SOURCE)
  return true
}
