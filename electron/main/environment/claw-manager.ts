import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { BaseService } from '../utils/base-service'
import {
  loggerInfo,
  loggerSuccess,
  loggerWarning,
  loggerError
} from '../utils/logger'
import type { SandboxEnvService } from './sandbox-env'
import type { NodeEnvService } from './node-env'
import type { ClawStatus, StartOptions, InitOptions, ProcessInfo } from '../types'
import { setGatewayPort } from '../utils/shared-config'

import BaseOpenclawConfig from './template/openclaw'

const LOG_SOURCE = 'claw_manager'

/**
 * OpenClaw 进程管理器
 * 提供启动、停止、监控 OpenClaw 进程的功能
 */
export class ClawManager extends BaseService {
  private clawProcess: ChildProcess | null = null
  private isInitialized = false
  private isFirstStartCompleted = false // 标记首次启动是否完成
  private port: number = 18789
  private debug: boolean = false
  private onStatusChange?: (status: ClawStatus) => void
  private currentStatus: ClawStatus = 'not-initialized'
  private sandboxEnvService: SandboxEnvService | null = null
  private nodeEnvService: NodeEnvService | null = null

  /**
   * 设置服务依赖
   */
  setDependencies(
    sandboxEnvService: SandboxEnvService,
    nodeEnvService: NodeEnvService
  ): void {
    this.sandboxEnvService = sandboxEnvService
    this.nodeEnvService = nodeEnvService
  }

  /**
   * 初始化 Claw 配置
   */
  async initialize(config: InitOptions = {}): Promise<boolean> {
    loggerInfo('初始化 OpenClaw 管理器...', LOG_SOURCE)

    try {
      // 设置配置
      this.port = config.port || 18789
      this.debug = config.debug || false
      this.onStatusChange = config.onStatusChange

      // 更新状态为初始化中
      this.updateStatus('initializing')

      // 检查沙箱是否已初始化
      if (!this.sandboxEnvService) {
        throw new Error('SandboxEnvService 未设置')
      }

      if (!this.sandboxEnvService.isSandboxInitialized()) {
        loggerInfo('首次运行，初始化沙箱环境...', LOG_SOURCE)
        await this.sandboxEnvService.createIsolatedSandbox()
      }

      // 检查是否已完成首次启动（通过标记文件判断）
      const firstStartMarkerPath = path.join(
        this.sandboxEnvService.getPaths().workspace,
        '.first-start-completed'
      )
      this.isFirstStartCompleted = fs.existsSync(firstStartMarkerPath)

      this.isInitialized = true
      this.updateStatus('initialized')
      loggerSuccess('OpenClaw 管理器初始化完成', LOG_SOURCE)

      return true
    } catch (error) {
      loggerError(`初始化失败: ${error}`, LOG_SOURCE)
      this.updateStatus('failed')
      return false
    }
  }

  /**
   * 创建并合并 openclaw.json 配置文件
   * 仅在首次启动成功后执行
   */
  private async createOpenClawConfig(): Promise<void> {
    if (!this.sandboxEnvService) {
      throw new Error('SandboxEnvService 未设置')
    }

    try {
      const workspaceDir = this.sandboxEnvService.getPaths().workspace
      const configPath = path.join(workspaceDir, 'openclaw.json')
      const firstStartMarkerPath = path.join(
        workspaceDir,
        '.first-start-completed'
      )

      const templateConfig = JSON.parse(JSON.stringify(BaseOpenclawConfig))

      // 检查本地配置文件是否存在
      if (fs.existsSync(configPath)) {
        // 本地文件已存在，进行合并处理
        loggerInfo('检测到本地 openclaw.json，正在合并配置...', LOG_SOURCE)

        const localContent = fs.readFileSync(configPath, 'utf-8')
        const localConfig = JSON.parse(localContent)

        // 深度合并配置（本地配置优先，但会补充模板中缺失的字段）
        const mergedConfig = this.deepMerge(templateConfig, localConfig)

        // 写入合并后的配置
        fs.writeFileSync(
          configPath,
          JSON.stringify(mergedConfig, null, 2),
          'utf-8'
        )
        loggerSuccess('配置文件合并完成', LOG_SOURCE)
      } else {
        // 本地文件不存在，直接使用模板创建
        fs.writeFileSync(
          configPath,
          JSON.stringify(templateConfig, null, 2),
          'utf-8'
        )
        loggerSuccess(
          `已创建 openclaw.json 配置文件: ${configPath}`,
          LOG_SOURCE
        )
      }

      // 创建首次启动完成的标记文件
      fs.writeFileSync(firstStartMarkerPath, new Date().toISOString(), 'utf-8')
      this.isFirstStartCompleted = true
      loggerInfo('首次启动配置初始化完成', LOG_SOURCE)
    } catch (error) {
      loggerError(`创建 openclaw.json 配置文件失败: ${error}`, LOG_SOURCE)
    }
  }

  /**
   * 深度合并两个对象
   * target 中的值会覆盖 source 中的值，但 source 中存在而 target 中不存在的字段会被添加
   */
  private deepMerge<T extends Record<string, any>>(source: T, target: T): T {
    const result = { ...source }

    for (const key in target) {
      if (target.hasOwnProperty(key)) {
        if (
          target[key] &&
          typeof target[key] === 'object' &&
          !Array.isArray(target[key]) &&
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key])
        ) {
          // 递归合并嵌套对象
          result[key] = this.deepMerge(source[key], target[key])
        } else {
          // 直接使用 target 的值（覆盖 source）
          result[key] = target[key]
        }
      }
    }

    return result
  }

  /**
   * 启动 OpenClaw
   */
  async start(options: StartOptions = {}): Promise<ChildProcess> {
    if (!this.isInitialized) {
      const success = await this.initialize()
      if (!success) throw new Error('初始化失败')
    }

    loggerInfo('启动 OpenClaw...', LOG_SOURCE)

    try {
      // 检查是否已启动
      if (this.clawProcess && !this.clawProcess.killed) {
        loggerWarning('OpenClaw 已在运行', LOG_SOURCE)
        return this.clawProcess
      }

      // 更新状态为启动中
      this.updateStatus('starting')

      // 更新配置
      if (options.port) this.port = options.port
      if (options.debug !== undefined) this.debug = options.debug

      // 设置全局共享端口配置
      setGatewayPort(this.port)

      // 检查服务依赖
      if (!this.sandboxEnvService || !this.nodeEnvService) {
        throw new Error('服务依赖未设置')
      }

      // 获取便携版环境
      const portableEnv = await this.nodeEnvService.ensureNodeEnvironment()
      const clawBin = this.sandboxEnvService.getClawBinaryPath()
      const workspaceDir = this.sandboxEnvService.getPaths().workspace

      // 构建启动参数
      const args = [
        'gateway',
        '--port',
        this.port.toString(),
        '--allow-unconfigured',
        ...(options.args || [])
      ]

      loggerInfo(
        `启动参数: ${clawBin} ${args.join(' ')} workspaceDir: ${workspaceDir}`,
        LOG_SOURCE
      )

      // 启动进程
      this.clawProcess = spawn(clawBin, args, {
        cwd: options.cwd || workspaceDir,
        env: {
          ...portableEnv,
          OPENCLAW_STATE_DIR: workspaceDir,
          OPENCLAW_HOME: workspaceDir,
          OPENCLAW_WORKSPACE: workspaceDir,
          OPENCLAW_LOGS: path.join(workspaceDir, 'logs'),
          OPENCLAW_CONFIG: path.join(workspaceDir, 'config'),
          ...options.env
        },
        shell: true,
        stdio: 'inherit'
      })

      // 监听进程事件
      this.setupProcessListeners()

      loggerSuccess(`OpenClaw 已启动，PID: ${this.clawProcess.pid}`, LOG_SOURCE)
      loggerInfo(`访问地址: http://localhost:${this.port}`, LOG_SOURCE)

      // 更新状态为已启动
      this.updateStatus('started')

      // 首次启动成功后，创建并合并配置文件
      if (!this.isFirstStartCompleted) {
        loggerInfo('首次启动，正在初始化配置文件...', LOG_SOURCE)
        await this.createOpenClawConfig()
      }

      // 检查进程是否立即进入运行状态
      setTimeout(() => {
        if (this.getStatus() === 'started') {
          // 模拟连接过程
          this.updateStatus('connecting')
          setTimeout(() => {
            this.updateStatus('connected')
            setTimeout(() => {
              this.updateStatus('ready')
              setTimeout(() => {
                this.updateStatus('running')
              }, 500)
            }, 500)
          }, 500)
        }
      }, 2000)

      // 模拟连接过程（后续可以改为真实检测）
      setTimeout(() => {
        this.updateStatus('connecting')
        setTimeout(() => {
          this.updateStatus('connected')
          setTimeout(() => {
            this.updateStatus('ready')
          }, 500)
        }, 500)
      }, 1000)

      return this.clawProcess
    } catch (error) {
      loggerError(`启动失败: ${error}`, LOG_SOURCE)
      this.updateStatus('failed')
      throw error
    }
  }

  /**
   * 停止 OpenClaw
   */
  async stop(timeout: number = 5000): Promise<void> {
    if (!this.clawProcess || this.clawProcess.killed) {
      loggerWarning('OpenClaw 未运行', LOG_SOURCE)
      return
    }

    loggerInfo('正在停止 OpenClaw...', LOG_SOURCE)

    try {
      // 优雅关闭
      this.clawProcess.kill('SIGINT')

      // 等待进程退出
      await new Promise<void>((resolve) => {
        this.clawProcess!.on('exit', (code) => {
          loggerInfo(`OpenClaw 已退出，退出码: ${code}`, LOG_SOURCE)
          this.clawProcess = null
          this.updateStatus('stopped')
          resolve()
        })

        // 超时处理
        setTimeout(() => {
          if (this.clawProcess && !this.clawProcess.killed) {
            loggerWarning('强制终止进程...', LOG_SOURCE)
            this.clawProcess.kill('SIGKILL')
            this.updateStatus('stopped')
            resolve()
          }
        }, timeout)
      })

      loggerSuccess('OpenClaw 已停止', LOG_SOURCE)
    } catch (error) {
      loggerError(`停止失败: ${error}`, LOG_SOURCE)
      this.updateStatus('failed')
    }
  }

  /**
   * 重启 OpenClaw
   */
  async restart(options?: StartOptions): Promise<ChildProcess> {
    loggerInfo('重启 OpenClaw...', LOG_SOURCE)

    try {
      await this.stop()
      // 等待一秒确保进程完全停止
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const process = await this.start(options)
      loggerSuccess('OpenClaw 重启完成', LOG_SOURCE)
      return process
    } catch (error) {
      loggerError(`重启失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 获取 OpenClaw 状态
   */
  getStatus(): ClawStatus {
    // 返回当前跟踪的状态
    return this.currentStatus
  }

  /**
   * 检查 OpenClaw 是否运行
   */
  isRunning(): boolean {
    return this.getStatus() === 'running'
  }

  /**
   * 获取进程信息
   */
  getProcessInfo(): ProcessInfo {
    return {
      pid: this.clawProcess?.pid || null,
      status: this.getStatus(),
      port: this.port,
      debug: this.debug
    }
  }

  /**
   * 获取日志路径
   */
  async getLogPath(): Promise<string | null> {
    try {
      if (!this.sandboxEnvService) {
        return null
      }
      const workspaceDir = this.sandboxEnvService.getPaths().workspace
      return path.join(workspaceDir, 'logs', 'openclaw.log')
    } catch (error) {
      loggerError(`获取日志路径失败: ${error}`, LOG_SOURCE)
      return null
    }
  }

  /**
   * 打开日志文件夹
   */
  async openLogFolder(): Promise<void> {
    try {
      const logPath = await this.getLogPath()
      if (logPath && fs.existsSync(logPath)) {
        const { exec } = await import('child_process')
        const platform = os.platform()

        if (platform === 'win32') {
          exec(`explorer "${path.dirname(logPath)}"`)
        } else if (platform === 'darwin') {
          exec(`open "${path.dirname(logPath)}"`)
        } else {
          exec(`xdg-open "${path.dirname(logPath)}"`)
        }
      }
    } catch (error) {
      loggerError(`打开日志文件夹失败: ${error}`, LOG_SOURCE)
    }
  }

  /**
   * 获取工作区信息
   */
  getWorkspaceInfo(): any {
    try {
      if (!this.sandboxEnvService) {
        return null
      }
      return this.sandboxEnvService.getWorkspaceInfo()
    } catch (error) {
      loggerError(`获取工作区信息失败: ${error}`, LOG_SOURCE)
      return null
    }
  }

  /**
   * 清理工作区
   */
  async cleanup(): Promise<void> {
    try {
      if (!this.sandboxEnvService) {
        throw new Error('SandboxEnvService 未设置')
      }
      await this.sandboxEnvService.cleanupWorkspace()
      loggerSuccess('工作区已清理', LOG_SOURCE)
    } catch (error) {
      loggerError(`清理工作区失败: ${error}`, LOG_SOURCE)
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
      loggerSuccess(`已备份到: ${backupPath}`, LOG_SOURCE)
      return backupPath
    } catch (error) {
      loggerError(`备份失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 设置进程监听器
   */
  private setupProcessListeners(): void {
    if (!this.clawProcess) return

    // 监听输出
    this.clawProcess.stdout?.on('data', (data) => {
      const log = data.toString().trim()
      if (log) {
        loggerInfo(`[OpenClaw] ${log}`, LOG_SOURCE)
      }
    })

    this.clawProcess.stderr?.on('data', (data) => {
      const log = data.toString().trim()
      if (log) {
        loggerError(`[OpenClaw Error] ${log}`, LOG_SOURCE)
      }
    })

    // 监听退出事件
    this.clawProcess.on('exit', (code) => {
      loggerInfo(`OpenClaw 进程退出，退出码: ${code}`, LOG_SOURCE)
      this.clawProcess = null
      this.updateStatus('stopped')
    })

    this.clawProcess.on('error', (error) => {
      loggerError(`OpenClaw 运行错误: ${error}`, LOG_SOURCE)
      this.updateStatus('failed')
    })
  }

  /**
   * 更新状态并通知回调
   */
  private updateStatus(status: ClawStatus): void {
    // 只有状态变化时才更新
    if (this.currentStatus !== status) {
      loggerInfo(
        `OpenClaw 状态变化: ${this.currentStatus} -> ${status}`,
        LOG_SOURCE
      )
      this.currentStatus = status
      this.onStatusChange?.(status)
    }
  }
}

/**
 * 便捷的启动函数
 */
export async function startClaw(options?: StartOptions): Promise<ChildProcess> {
  const manager = ClawManager.getInstance() as ClawManager
  return manager.start(options)
}

/**
 * 便捷的停止函数
 */
export async function stopClaw(timeout?: number): Promise<void> {
  const manager = ClawManager.getInstance() as ClawManager
  return manager.stop(timeout)
}

/**
 * 获取 OpenClaw 状态
 */
export function getClawStatus(): ClawStatus {
  const manager = ClawManager.getInstance() as ClawManager
  return manager.getStatus()
}

/**
 * 检查 OpenClaw 是否运行
 */
export function isClawRunning(): boolean {
  const manager = ClawManager.getInstance() as ClawManager
  return manager.isRunning()
}

// 导出单例访问方法
export const getClawManager = (): ClawManager =>
  ClawManager.getInstance() as ClawManager

export default ClawManager
