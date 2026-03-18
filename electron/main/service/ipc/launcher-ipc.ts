import { ipcMain } from 'electron'
import { loggerError, loggerSuccess } from '../../utils/logger'
import { getLauncherService } from '../launcher-service'

const LOG_SOURCE = 'ipc_launcher'

/**
 * 注册启动器服务 IPC 处理器
 * 使用单例模式获取服务实例
 */
export function registerLauncherIPC(): void {
  const launcherService = getLauncherService()

  // 初始化
  ipcMain.handle('launcher:initialize', async () => {
    try {
      await launcherService.initialize()
      return { success: true }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`初始化失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 启动 OpenClaw
  ipcMain.handle('launcher:start-claw', async () => {
    try {
      await launcherService.startClaw()
      return { success: true }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`启动 OpenClaw 失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 停止 OpenClaw
  ipcMain.handle('launcher:stop-claw', async () => {
    try {
      await launcherService.stopClaw()
      return { success: true }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`停止 OpenClaw 失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取状态
  ipcMain.handle('launcher:get-status', async () => {
    try {
      const status = launcherService.getStatus()
      return { success: true, data: status }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取状态失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 重启
  ipcMain.handle('launcher:restart', async () => {
    try {
      await launcherService.restart()
      return { success: true }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`重启失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 清理
  ipcMain.handle('launcher:cleanup', async () => {
    try {
      await launcherService.cleanup()
      return { success: true }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`清理失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 备份
  ipcMain.handle('launcher:backup', async (_event, backupDir?: string) => {
    try {
      const backupPath = await launcherService.backup(backupDir)
      return { success: true, data: backupPath }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`备份失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  loggerSuccess('启动器服务 IPC 已注册', LOG_SOURCE)
}

export default registerLauncherIPC
