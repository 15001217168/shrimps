import { ipcMain } from 'electron'
import { loggerError, loggerSuccess } from '../../utils/logger'
import { getConfigService } from '../config-service'
import type { APIProvider, AppConfig } from '../../types'

const LOG_SOURCE = 'ipc_config'

/**
 * 注册配置服务 IPC 处理器
 * 使用单例模式获取服务实例
 */
export function registerConfigIPC(): void {
  const configService = getConfigService()

  // 保存json配置
  ipcMain.handle('config:save-json', async (_event, json: string) => {
    try {
      const result = await configService.saveJsonConfig(json)
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`保存配置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取json配置
  ipcMain.handle('config:get-json', async (_event) => {
    try {
      const result = await configService.getJsonConfig()
      return { success: true, data: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`保存配置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 保存 API Key
  ipcMain.handle(
    'config:save-api-key',
    async (_event, provider: APIProvider, apiKey: string) => {
      try {
        const result = configService.saveAPIKey(provider, apiKey)
        return { success: result }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`保存 API Key 失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 获取 API Key（用于验证）
  ipcMain.handle(
    'config:get-api-key',
    async (_event, provider: APIProvider) => {
      try {
        const key = configService.getAPIKey(provider)
        return {
          success: true,
          data: {
            apiKey: key,
            hasKey: Boolean(key),
            lastFour: key ? key.slice(-4) : ''
          }
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`获取 API Key 失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 获取设置数据（API Key + 模型列表）
  ipcMain.handle('config:get-settings', async () => {
    try {
      const provider = configService.getProviders()
      const models = configService.getModelsList()
      const currentModel = configService.getCurrentModel()
      const gatewayToken = configService.getGatewayToken()
      const gatewayBaseUrl = configService.getGatewayBaseUrl()

      console.log('gatewayBaseUrl', gatewayBaseUrl)
      return {
        success: true,
        data: {
          provider,
          models,
          currentModel,
          gateway: {
            baseUrl: gatewayBaseUrl,
            auth: {
              mode: 'token',
              token: gatewayToken
            }
          }
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取设置数据失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 删除 API Key
  ipcMain.handle(
    'config:delete-api-key',
    async (_event, provider: APIProvider) => {
      try {
        const result = configService.deleteAPIKey(provider)
        return { success: result }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`删除 API Key 失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 打开配置目录
  ipcMain.handle('config:open-dir', async () => {
    try {
      configService.openConfigDir()
      return { success: true }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`打开配置目录失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  loggerSuccess('配置服务 IPC 已注册', LOG_SOURCE)
}

export default registerConfigIPC
