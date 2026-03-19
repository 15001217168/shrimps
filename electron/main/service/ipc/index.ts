/**
 * IPC 模块统一导出
 */

export { registerConfigIPC } from './config-ipc'
export { registerLauncherIPC } from './launcher-ipc'
export { registerOpenClawWSIPC } from './openclaw-ws-ipc'
export { registerStorageIPC } from './storage-ipc'

import { registerConfigIPC } from './config-ipc'
import { registerLauncherIPC } from './launcher-ipc'
import { registerOpenClawWSIPC } from './openclaw-ws-ipc'
import { registerStorageIPC } from './storage-ipc'
import { loggerSuccess } from '../../utils/logger'

const LOG_SOURCE = 'ipc'

/**
 * 注册所有 IPC 处理器
 * 使用单例模式自动获取服务实例，无需传递参数
 */
export function registerAllIPC(): void {
  registerConfigIPC()
  registerLauncherIPC()
  registerOpenClawWSIPC()
  registerStorageIPC()

  loggerSuccess('所有 IPC 处理器已注册', LOG_SOURCE)
}

export default {
  registerConfigIPC,
  registerLauncherIPC,
  registerOpenClawWSIPC,
  registerStorageIPC,
  registerAllIPC
}
