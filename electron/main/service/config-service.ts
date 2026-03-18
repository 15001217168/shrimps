import { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { BaseService } from '../utils/base-service'
import {
  loggerInfo,
  loggerSuccess,
  loggerError
} from '../utils/logger'
import type { SandboxEnvService } from '../environment/sandbox-env'
import type { LauncherService } from './launcher-service'
import type { APIProvider, AppConfig, HealthStatus } from '../types'
import { getGatewayPort, getGatewayBaseUrl } from '../utils/shared-config'

const LOG_SOURCE = 'config_service'

// 配置文件路径（由 LauncherService 提供）
let CONFIG_DIR = ''

/**
 * 获取 OpenClaw 配置文件路径
 */
const getOpenClawConfigPath = (sandboxEnvService: SandboxEnvService | null): string => {
  if (!sandboxEnvService) {
    return ''
  }
  const paths = sandboxEnvService.getPaths()
  return path.join(paths.workspace, 'openclaw.json')
}

/**
 * 配置服务
 * 负责管理 API Key 和 OpenClaw 配置同步
 */
export class ConfigService extends BaseService {
  private healthCheckInterval: NodeJS.Timeout | null = null
  private currentHealthStatus: HealthStatus = 'offline'
  private config: AppConfig
  private sandboxEnvService: SandboxEnvService | null = null
  private launcherService: LauncherService | null = null

  private constructor() {
    super()
    this.config = this.getDefaultConfig()
  }

  /**
   * 设置配置目录
   */
  setConfigDir(dir: string): void {
    CONFIG_DIR = dir
    this.ensureConfigDir()
  }

  /**
   * 设置服务依赖
   */
  setDependencies(
    sandboxEnvService: SandboxEnvService,
    launcherService: LauncherService
  ): void {
    this.sandboxEnvService = sandboxEnvService
    this.launcherService = launcherService
    this.loadConfig()
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AppConfig {
    return {
      claw: {
        provider: 'zhipu',
        apiKey: '',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
        model: 'glm-4-flash'
      },
      gateway: {
        baseUrl: 'http://localhost:18789',
        auth: {
          mode: 'token',
          token: ''
        }
      },
      port: 18789,
      debug: false
    }
  }

  /**
   * 确保配置目录存在
   */
  private ensureConfigDir(): void {
    if (CONFIG_DIR && !fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
  }

  /**
   * 读取 OpenClaw 配置文件
   */
  private readOpenClawConfig(): Record<string, any> {
    try {
      const configPath = getOpenClawConfigPath(this.sandboxEnvService)
      if (configPath && fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8')
        return JSON.parse(content)
      }
    } catch (error) {
      loggerError(`读取 OpenClaw 配置失败: ${error}`, LOG_SOURCE)
    }
    return {}
  }

  /**
   * 写入 OpenClaw 配置文件
   */
  private writeOpenClawConfig(config: Record<string, any>): boolean {
    try {
      const configPath = getOpenClawConfigPath(this.sandboxEnvService)
      if (!configPath) {
        loggerError('配置路径未设置', LOG_SOURCE)
        return false
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
      loggerSuccess('OpenClaw 配置已更新', LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`写入 OpenClaw 配置失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 保存 API Key 到 OpenClaw 配置（只更新 apiKey 字段，保留其他配置）
   */
  saveAPIKey(_provider: APIProvider, apiKey: string): boolean {
    try {
      const openClawConfig = this.readOpenClawConfig()

      // 确保 models.providers.zai 结构存在（不覆盖已有配置）
      if (!openClawConfig.models) {
        openClawConfig.models = { mode: 'merge', providers: {} }
      }
      if (!openClawConfig.models.providers) {
        openClawConfig.models.providers = {}
      }
      if (!openClawConfig.models.providers.zai) {
        openClawConfig.models.providers.zai = {
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
          apiKey: '',
          models: []
        }
      }

      // 只更新 apiKey 字段，保留其他所有配置不变
      openClawConfig.models.providers.zai.apiKey = apiKey

      // 写入配置
      const result = this.writeOpenClawConfig(openClawConfig)

      // 更新内存配置
      this.config.claw.apiKey = apiKey

      loggerSuccess(`API Key 已保存`, LOG_SOURCE)
      return result
    } catch (error) {
      loggerError(`保存 API Key 失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 获取 API Key
   */
  getAPIKey(_provider: APIProvider): string {
    try {
      const openClawConfig = this.readOpenClawConfig()
      return openClawConfig?.models?.providers?.zai?.apiKey || ''
    } catch (error) {
      loggerError(`获取 API Key 失败: ${error}`, LOG_SOURCE)
      return ''
    }
  }

  /**
   * 获取模型列表
   */
  getModelsList(): { id: string; name: string }[] {
    try {
      const openClawConfig = this.readOpenClawConfig()
      const models = openClawConfig?.models?.providers?.zai?.models || []
      return models.map((m: any) => ({
        id: m.id || m.name,
        name: m.name || m.id
      }))
    } catch (error) {
      loggerError(`获取模型列表失败: ${error}`, LOG_SOURCE)
      return []
    }
  }

  /**
   * 获取当前选中的模型
   */
  getCurrentModel(): string {
    try {
      const openClawConfig = this.readOpenClawConfig()
      const primary = openClawConfig?.agents?.defaults?.model?.primary || ''
      // 移除 "zai/" 前缀
      return primary.replace(/^zai\//, '')
    } catch (error) {
      loggerError(`获取当前模型失败: ${error}`, LOG_SOURCE)
      return ''
    }
  }

  /**
   * 获取 Base URL
   */
  getBaseUrl(): string {
    try {
      const openClawConfig = this.readOpenClawConfig()
      return (
        openClawConfig?.models?.providers?.zai?.baseUrl ||
        'https://open.bigmodel.cn/api/paas/v4/'
      )
    } catch (error) {
      loggerError(`获取 Base URL 失败: ${error}`, LOG_SOURCE)
      return 'https://open.bigmodel.cn/api/paas/v4/'
    }
  }

  /**
   * 获取 Gateway Token
   */
  getGatewayToken(): string {
    try {
      const openClawConfig = this.readOpenClawConfig()
      return openClawConfig?.gateway?.auth?.token || ''
    } catch (error) {
      loggerError(`获取 Gateway Token 失败: ${error}`, LOG_SOURCE)
      return ''
    }
  }

  /**
   * 获取 Gateway Base URL
   * 优先使用全局共享配置中的端口，其次使用配置文件中的值
   */
  getGatewayBaseUrl(): string {
    try {
      // 优先使用全局共享配置
      const sharedBaseUrl = getGatewayBaseUrl()
      if (sharedBaseUrl) {
        return sharedBaseUrl
      }
      // 其次从配置文件读取
      const openClawConfig = this.readOpenClawConfig()
      return openClawConfig?.gateway?.baseUrl || `http://localhost:${getGatewayPort()}`
    } catch (error) {
      loggerError(`获取 Gateway Base URL 失败: ${error}`, LOG_SOURCE)
      return `http://localhost:${getGatewayPort()}`
    }
  }

  /**
   * 删除 API Key
   */
  deleteAPIKey(_provider: APIProvider): boolean {
    try {
      const openClawConfig = this.readOpenClawConfig()

      if (openClawConfig?.models?.providers?.zai) {
        openClawConfig.models.providers.zai.apiKey = ''
        this.writeOpenClawConfig(openClawConfig)
      }

      this.config.claw.apiKey = ''
      loggerInfo(`API Key 已删除`, LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`删除 API Key 失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    // 从 OpenClaw 配置文件加载 API Key
    const apiKey = this.getAPIKey('zhipu')
    if (apiKey) {
      this.config.claw.apiKey = apiKey
    }
    // 从 OpenClaw 配置文件加载 Gateway Token
    const gatewayToken = this.getGatewayToken()
    if (gatewayToken) {
      this.config.gateway.auth.token = gatewayToken
    }
    // 从 OpenClaw 配置文件加载 Gateway Base URL
    const gatewayBaseUrl = this.getGatewayBaseUrl()
    if (gatewayBaseUrl) {
      this.config.gateway.baseUrl = gatewayBaseUrl
    }
  }

  /**
   * 获取完整配置
   */
  getConfig(): AppConfig {
    // 获取当前 API Key
    const apiKey = this.getAPIKey('zhipu')
    // 获取当前 Gateway Token
    const gatewayToken = this.getGatewayToken()
    // 获取当前 Gateway Base URL
    const gatewayBaseUrl = this.getGatewayBaseUrl()
    return {
      ...this.config,
      claw: {
        ...this.config.claw,
        apiKey
      },
      gateway: {
        baseUrl: gatewayBaseUrl,
        auth: {
          mode: 'token',
          token: gatewayToken
        }
      }
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<AppConfig>): Promise<boolean> {
    try {
      // 更新内存配置
      this.config = { ...this.config, ...newConfig }

      // 如果有 API Key 更新，保存到 OpenClaw 配置
      if (newConfig.claw?.apiKey) {
        this.saveAPIKey('zhipu', newConfig.claw.apiKey)
      }

      // 同步到 OpenClaw 配置文件
      await this.syncToOpenClawConfig()

      loggerSuccess('配置已更新', LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`更新配置失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 同步配置到 OpenClaw 配置文件（只更新 apiKey 字段，保留其他配置）
   */
  async syncToOpenClawConfig(): Promise<void> {
    try {
      const openClawConfig = this.readOpenClawConfig()

      // 确保 models.providers.zai 结构存在（不覆盖已有配置）
      if (!openClawConfig.models) {
        openClawConfig.models = { mode: 'merge', providers: {} }
      }
      if (!openClawConfig.models.providers) {
        openClawConfig.models.providers = {}
      }
      if (!openClawConfig.models.providers.zai) {
        openClawConfig.models.providers.zai = {
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
          apiKey: '',
          models: []
        }
      }

      // 只更新 apiKey 字段，保留其他所有配置不变
      const apiKey = this.getAPIKey('zhipu')
      openClawConfig.models.providers.zai.apiKey = apiKey

      // 写入配置
      this.writeOpenClawConfig(openClawConfig)

      loggerSuccess('OpenClaw 配置已同步', LOG_SOURCE)

      // 触发 OpenClaw 重启以使配置生效
      await this.restartOpenClaw()
    } catch (error) {
      loggerError(`同步 OpenClaw 配置失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 重启 OpenClaw
   */
  async restartOpenClaw(): Promise<void> {
    try {
      if (!this.launcherService) {
        loggerError('LauncherService 未设置', LOG_SOURCE)
        return
      }
      loggerInfo('正在重启 OpenClaw 以应用新配置...', LOG_SOURCE)
      await this.launcherService.restart()
    } catch (error) {
      loggerError(`重启 OpenClaw 失败: ${error}`, LOG_SOURCE)
    }
  }

  /**
   * 启动健康检查
   */
  startHealthCheck(port: number = 18789): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    const checkHealth = async (): Promise<void> => {
      try {
        const response = await axios.get(
          `http://localhost:${port}/api/health`,
          {
            timeout: 3000
          }
        )

        if (response.status === 200) {
          this.setHealthStatus('online')
        } else {
          this.setHealthStatus('offline')
        }
      } catch {
        // 检查进程是否在启动中
        if (this.launcherService) {
          const status = this.launcherService.getStatus()
          if (status.status === 'starting' || status.status === 'initialized') {
            this.setHealthStatus('starting')
          } else {
            this.setHealthStatus('offline')
          }
        } else {
          this.setHealthStatus('offline')
        }
      }
    }

    // 立即检查一次
    checkHealth()

    // 每 5 秒检查一次
    this.healthCheckInterval = setInterval(checkHealth, 5000)
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * 设置健康状态并通知渲染进程
   */
  private setHealthStatus(status: HealthStatus): void {
    if (this.currentHealthStatus !== status) {
      this.currentHealthStatus = status
      loggerInfo(`OpenClaw 健康状态: ${status}`, LOG_SOURCE)

      // 通知所有窗口
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('claw-health-update', {
          status,
          timestamp: Date.now()
        })
      })
    }
  }

  /**
   * 获取当前健康状态
   */
  getHealthStatus(): HealthStatus {
    return this.currentHealthStatus
  }

  /**
   * 打开配置文件目录
   */
  openConfigDir(): void {
    if (!CONFIG_DIR) {
      loggerError('配置目录未设置', LOG_SOURCE)
      return
    }
    const { shell } = require('electron')
    shell.openPath(CONFIG_DIR)
  }
}

// 导出单例访问方法
export const getConfigService = (): ConfigService =>
  ConfigService.getInstance<ConfigService>()

export default ConfigService
