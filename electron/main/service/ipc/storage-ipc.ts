import { ipcMain } from 'electron'
import { loggerError, loggerSuccess } from '../../utils/logger'
import { getStorageService } from '../storage-service'
import type { AppSettings } from '../storage-service'

const LOG_SOURCE = 'ipc_storage'

/**
 * 注册存储服务 IPC 处理器
 * 使用单例模式获取服务实例
 */
export function registerStorageIPC(): void {
  const storageService = getStorageService()

  // 获取单个设置项
  ipcMain.handle('storage:get', async (_event, key: string, defaultValue?: any) => {
    try {
      const value = storageService.get(key, defaultValue)
      return { success: true, data: value }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取设置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 设置单个设置项
  ipcMain.handle('storage:set', async (_event, key: string, value: any) => {
    try {
      const result = storageService.set(key, value)
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`保存设置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 删除设置项
  ipcMain.handle('storage:delete', async (_event, key: string) => {
    try {
      const result = storageService.delete(key)
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`删除设置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取所有设置
  ipcMain.handle('storage:get-all', async () => {
    try {
      const settings = storageService.getAll()
      return { success: true, data: settings }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取所有设置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 批量设置
  ipcMain.handle('storage:set-many', async (_event, settings: Record<string, any>) => {
    try {
      const result = storageService.setMany(settings)
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`批量保存设置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 清除所有设置
  ipcMain.handle('storage:clear', async () => {
    try {
      const result = storageService.clear()
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`清除设置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // ============ 便捷方法 ============

  // 获取主题
  ipcMain.handle('storage:get-theme', async () => {
    try {
      const theme = storageService.getTheme()
      return { success: true, data: theme }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取主题失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 设置主题
  ipcMain.handle('storage:set-theme', async (_event, theme: 'light' | 'dark' | 'system') => {
    try {
      const result = storageService.setTheme(theme)
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`设置主题失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取语言
  ipcMain.handle('storage:get-language', async () => {
    try {
      const language = storageService.getLanguage()
      return { success: true, data: language }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取语言失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 设置语言
  ipcMain.handle('storage:set-language', async (_event, language: 'en' | 'zh') => {
    try {
      const result = storageService.setLanguage(language)
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`设置语言失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取应用设置
  ipcMain.handle('storage:get-app-settings', async () => {
    try {
      const settings = storageService.getAppSettings()
      return { success: true, data: settings }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取应用设置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 更新应用设置
  ipcMain.handle('storage:update-app-settings', async (_event, settings: Partial<AppSettings>) => {
    try {
      const result = storageService.updateAppSettings(settings)
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`更新应用设置失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  loggerSuccess('存储服务 IPC 已注册', LOG_SOURCE)
}

export default registerStorageIPC
