import { app, BrowserWindow } from 'electron'
import { BaseService } from '../utils/base-service'
import { loggerInfo, loggerSuccess, loggerError } from '../utils/logger'
import type { ClawStatus } from '../types'
import type { ClawManager } from '../environment/claw-manager'
import type { NodeEnvService } from '../environment/node-env'
import type { SandboxEnvService } from '../environment/sandbox-env'

const LOG_SOURCE = 'launcher_service'

// 应用状态接口
export interface AppStatus {
  // 状态信息
  status: string
  state: string
  phase: string

  // 初始化状态
  initialized: boolean
  initializing: boolean

  // OpenClaw 状态
  clawStatus: ClawStatus
  isClawRunning: boolean
  clawPid: number | null
  clawPort: number
  clawDebug: boolean

  // 工作区信息
  workspaceSize: number
  workspacePath: string

  // 安装信息
  clawVersion: string
  clawInstalled: boolean

  // 错误信息
  error?: string
}

/**
 * 应用启动器服务
 * 负责管理应用初始化、OpenClaw 生命周期等核心功能
 */
export class LauncherService extends BaseService {
  private initialized = false
  private clawProcess: any = null
  private currentStatus: string = 'not-initialized'
  private nodeEnvService: NodeEnvService | null = null
  private sandboxEnvService: SandboxEnvService | null = null
  private clawManager: ClawManager | null = null

  /**
   * 设置服务依赖
   */
  setDependencies(
    nodeEnvService: NodeEnvService,
    sandboxEnvService: SandboxEnvService,
    clawManager: ClawManager
  ): void {
    this.nodeEnvService = nodeEnvService
    this.sandboxEnvService = sandboxEnvService
    this.clawManager = clawManager
  }

  /**
   * 初始化应用环境
   */
  async initialize(): Promise<boolean> {
    loggerInfo('初始化应用环境...', LOG_SOURCE)

    try {
      // 检查服务依赖
      if (
        !this.nodeEnvService ||
        !this.sandboxEnvService ||
        !this.clawManager
      ) {
        throw new Error('服务依赖未设置')
      }

      // 1. 确保 Node.js 环境就绪
      loggerInfo('检查 Node.js 环境...', LOG_SOURCE)
      await this.nodeEnvService.ensureNodeEnvironment()
      loggerSuccess('Node.js 环境就绪', LOG_SOURCE)
      this.sendProgress(20)

      // 2. 初始化沙箱
      if (!this.sandboxEnvService.isSandboxInitialized()) {
        loggerInfo('首次运行，构建沙箱环境...', LOG_SOURCE)
        await this.sandboxEnvService.createIsolatedSandbox()
        loggerSuccess('沙箱环境构建完成', LOG_SOURCE)
      } else {
        loggerSuccess('沙箱已存在', LOG_SOURCE)
      }

      this.sendProgress(50)

      // 3. 初始化 Claw 管理器，并注册状态变更回调
      await this.clawManager.initialize({
        debug: process.env.NODE_ENV === 'development',
        onStatusChange: (status: ClawStatus) => {
          // 更新内部状态
          this.currentStatus = status
          loggerInfo(`OpenClaw 状态变化: ${status}`, LOG_SOURCE)
        }
      })

      this.sendProgress(80)

      this.initialized = true
      this.currentStatus = 'initialized'
      loggerSuccess('应用环境初始化完成', LOG_SOURCE)
      return true
    } catch (error) {
      this.currentStatus = 'failed'
      loggerError(`初始化失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 启动 OpenClaw
   */
  async startClaw(): Promise<any> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      loggerInfo('正在启动 OpenClaw...', LOG_SOURCE)
      this.currentStatus = 'starting'

      // 检查服务依赖
      if (!this.clawManager) {
        throw new Error('ClawManager 未设置')
      }

      // 使用 ClawManager 启动 OpenClaw
      this.clawProcess = await this.clawManager.start({
        port: 18899,
        debug: process.env.NODE_ENV === 'development'
      })

      this.clawProcess.on('exit', (code: number) => {
        loggerInfo(`OpenClaw 进程退出 (退出码: ${code})`, LOG_SOURCE)
        this.clawProcess = null
        this.currentStatus = 'stopped'
      })

      this.sendProgress(90)

      loggerSuccess('OpenClaw 启动成功', LOG_SOURCE)
      return this.clawProcess
    } catch (error) {
      this.currentStatus = 'failed'
      loggerError(`启动 OpenClaw 失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 发送进度到渲染进程
   */
  sendProgress(progress = 0): void {
    // 发送到渲染进程
    if (app.isReady()) {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        try {
          mainWindow.webContents.send('launcher:progress', {
            progress: progress
          })
        } catch (error) {
          // 忽略发送错误
        }
      }
    }
  }

  /**
   * 停止 OpenClaw
   */
  async stopClaw(): Promise<void> {
    try {
      loggerInfo('正在停止 OpenClaw...', LOG_SOURCE)
      this.currentStatus = 'stopped'

      if (!this.clawManager) {
        throw new Error('ClawManager 未设置')
      }

      await this.clawManager.stop()
      loggerSuccess('OpenClaw 已停止', LOG_SOURCE)
    } catch (error) {
      this.currentStatus = 'failed'
      loggerError(`停止 OpenClaw 失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 获取应用状态
   */
  getStatus(): AppStatus {
    // 检查服务依赖
    if (!this.sandboxEnvService || !this.clawManager) {
      return {
        status: 'not-initialized',
        state: 'not-initialized',
        phase: 'not-initialized',
        initialized: false,
        initializing: false,
        clawStatus: 'not-initialized',
        isClawRunning: false,
        clawPid: null,
        clawPort: 18789,
        clawDebug: false,
        workspaceSize: 0,
        workspacePath: '',
        clawVersion: 'unknown',
        clawInstalled: false,
        error: '服务依赖未设置'
      }
    }

    const workspaceInfo = this.sandboxEnvService.getWorkspaceInfo()
    const installInfo = this.sandboxEnvService.getClawInstallInfo()
    const processInfo = this.clawManager.getProcessInfo()
    const clawStatus = this.clawManager.getStatus()

    // 使用跟踪的状态
    const status = this.currentStatus || clawStatus

    return {
      // 状态信息
      status,
      state: status,
      phase: status,

      // 初始化状态
      initialized: this.initialized,
      initializing: status === 'initializing',

      // OpenClaw 状态
      clawStatus,
      isClawRunning: this.clawManager.isRunning(),
      clawPid: processInfo.pid,
      clawPort: processInfo.port,
      clawDebug: processInfo.debug,

      // 工作区信息
      workspaceSize: workspaceInfo.size,
      workspacePath: workspaceInfo.path,

      // 安装信息
      clawVersion: installInfo.version,
      clawInstalled: installInfo.exists,

      // 错误信息
      error: status === 'failed' || status === 'error' ? '操作失败' : undefined
    }
  }

  /**
   * 重启应用
   */
  async restart(): Promise<void> {
    loggerInfo('正在重启应用...', LOG_SOURCE)
    this.currentStatus = 'starting'
    try {
      await this.stopClaw()
      await this.initialize()
      await this.startClaw()
      loggerSuccess('应用重启完成', LOG_SOURCE)
    } catch (error) {
      this.currentStatus = 'failed'
      loggerError(`重启失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 清理工作区
   */
  async cleanup(): Promise<void> {
    try {
      loggerInfo('正在清理工作区...', LOG_SOURCE)
      await this.stopClaw()

      if (!this.sandboxEnvService) {
        throw new Error('SandboxEnvService 未设置')
      }

      await this.sandboxEnvService.cleanupWorkspace()
      loggerSuccess('工作区清理完成', LOG_SOURCE)
    } catch (error) {
      loggerError(`清理工作区失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 备份工作区
   */
  async backup(backupDir?: string): Promise<string> {
    try {
      if (!this.sandboxEnvService) {
        throw new Error('SandboxEnvService 未设置')
      }

      const backupPath = await this.sandboxEnvService.backupWorkspace(backupDir)
      loggerSuccess(`工作区已备份到: ${backupPath}`, LOG_SOURCE)
      return backupPath
    } catch (error) {
      loggerError(`备份失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// 导出单例访问方法
export const getLauncherService = (): LauncherService =>
  LauncherService.getInstance<LauncherService>()

export default LauncherService
