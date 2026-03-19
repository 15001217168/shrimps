import { BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { BaseService } from '../utils/base-service'
import { loggerInfo, loggerSuccess, loggerError } from '../utils/logger'
import type { SandboxEnvService } from '../environment/sandbox-env'
import type { LauncherService } from './launcher-service'
import type {
  APIProvider,
  AppConfig,
  HealthStatus,
  ProviderConfig
} from '../types'
import { getGatewayPort, getGatewayBaseUrl } from '../utils/shared-config'

const LOG_SOURCE = 'config_service'

// 配置文件路径（由 LauncherService 提供）
let CONFIG_DIR = ''

/**
 * 获取 OpenClaw 配置文件路径
 */
const getOpenClawConfigPath = (
  sandboxEnvService: SandboxEnvService | null
): string => {
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
      gateway: {
        baseUrl: 'http://localhost:18789',
        auth: {
          mode: 'token',
          token: ''
        }
      },
      port: 18789,
      debug: false,
      providers: {
        zai: {
          apiKey: '',
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
          models: []
        },
        anthropic: {
          apiKey: '',
          baseUrl: 'https://api.anthropic.com/v1/',
          models: []
        },
        openai: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1/',
          models: []
        }
      }
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

  getJsonConfig(): string {
    try {
      return JSON.stringify(this.readOpenClawConfig())
    } catch (error) {
      loggerError(`读取 OpenClaw 配置失败: ${error}`, LOG_SOURCE)
    }
    return ''
  }

  saveJsonConfig(json: string): boolean {
    try {
      this.writeOpenClawConfig(JSON.parse(json))
      loggerSuccess('OpenClaw 配置已更新', LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`写入 OpenClaw 配置失败: ${error}`, LOG_SOURCE)
      return false
    }
  }
  /**
   * 保存 API Key 到 OpenClaw 配置（只更新 apiKey 字段，保留其他配置）
   * @param provider 提供商名称，默认为 'zai'
   */
  saveAPIKey(provider: APIProvider, apiKey: string): boolean {
    try {
      const openClawConfig = this.readOpenClawConfig()

      console.log('saveAPIKey', provider, apiKey, openClawConfig)

      // 确保 models.providers 结构存在
      if (!openClawConfig.models) {
        openClawConfig.models = { mode: 'merge', providers: {} }
      }
      if (!openClawConfig.models.providers) {
        openClawConfig.models.providers = {}
      }

      // 获取 provider 的默认配置
      const providerDefaults: Record<APIProvider, { baseUrl: string }> = {
        zai: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4/' },
        anthropic: { baseUrl: 'https://api.anthropic.com/v1/' },
        openai: { baseUrl: 'https://api.openai.com/v1/' }
      }

      // 确保 provider 结构存在（不覆盖已有配置）
      if (!openClawConfig.models.providers[provider]) {
        openClawConfig.models.providers[provider] = {
          baseUrl: providerDefaults[provider].baseUrl,
          apiKey: '',
          models: []
        }
      }

      // 只更新 apiKey 字段，保留其他所有配置不变
      openClawConfig.models.providers[provider].apiKey = apiKey

      // 写入配置
      const result = this.writeOpenClawConfig(openClawConfig)

      // 更新 providers 配置
      if (!this.config.providers) {
        this.config.providers = {
          zai: { apiKey: '', models: [] },
          anthropic: { apiKey: '', models: [] },
          openai: { apiKey: '', models: [] }
        }
      }
      const providers = this.config.providers
      if (!providers[provider]) {
        providers[provider] = { apiKey: '', models: [] }
      }
      providers[provider]!.apiKey = apiKey

      loggerSuccess(`API Key 已保存 [${provider}]`, LOG_SOURCE)
      return result
    } catch (error) {
      loggerError(`保存 API Key 失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 获取 API Key
   * @param provider 提供商名称，默认为 'zai'
   */
  getAPIKey(provider: APIProvider = 'zai'): string {
    try {
      const openClawConfig = this.readOpenClawConfig()
      return openClawConfig?.models?.providers?.[provider]?.apiKey || ''
    } catch (error) {
      loggerError(`获取 API Key 失败: ${error}`, LOG_SOURCE)
      return ''
    }
  }

  /**
   * 获取模型列表
   * @param provider 提供商名称，不传则返回所有提供商的模型
   * @returns 模型列表，id 包含 provider 前缀 (如 "zai/glm-4-flash")
   */
  getModelsList(
    provider?: APIProvider
  ): { id: string; name: string; provider: APIProvider }[] {
    try {
      const openClawConfig = this.readOpenClawConfig()
      const providers = openClawConfig?.models?.providers || {}
      const result: { id: string; name: string; provider: APIProvider }[] = []

      // 定义支持的提供商
      const supportedProviders: APIProvider[] = ['zai', 'anthropic', 'openai']

      if (provider) {
        // 返回指定提供商的模型
        const providerModels = providers[provider]?.models || []
        providerModels.forEach((m: any) => {
          const modelId = m.id || m.name
          result.push({
            id: `${provider}/${modelId}`,
            name: m.name || modelId,
            provider
          })
        })
      } else {
        // 返回所有提供商的模型
        supportedProviders.forEach((p) => {
          const providerModels = providers[p]?.models || []
          providerModels.forEach((m: any) => {
            const modelId = m.id || m.name
            result.push({
              id: `${p}/${modelId}`,
              name: m.name || modelId,
              provider: p
            })
          })
        })
      }

      return result
    } catch (error) {
      loggerError(`获取模型列表失败: ${error}`, LOG_SOURCE)
      return []
    }
  }

  /**
   * 获取当前选中的模型（包含 provider 前缀）
   */
  getCurrentModel(): string {
    try {
      const openClawConfig = this.readOpenClawConfig()
      return openClawConfig?.agents?.defaults?.model?.primary || ''
    } catch (error) {
      loggerError(`获取当前模型失败: ${error}`, LOG_SOURCE)
      return ''
    }
  }

  /**
   * 获取 Base URL
   * @param provider 提供商名称，默认为 'zai'
   */
  getBaseUrl(provider: APIProvider = 'zai'): string {
    try {
      const openClawConfig = this.readOpenClawConfig()
      const providerDefaults: Record<APIProvider, string> = {
        zai: 'https://open.bigmodel.cn/api/paas/v4/',
        anthropic: 'https://api.anthropic.com/v1/',
        openai: 'https://api.openai.com/v1/'
      }
      return (
        openClawConfig?.models?.providers?.[provider]?.baseUrl ||
        providerDefaults[provider]
      )
    } catch (error) {
      loggerError(`获取 Base URL 失败: ${error}`, LOG_SOURCE)
      return 'https://open.bigmodel.cn/api/paas/v4/'
    }
  }

  /**
   * 获取所有 Provider 配置
   * @returns 所有 Provider 的配置信息
   */
  getProviders(): Record<APIProvider, ProviderConfig> {
    try {
      const openClawConfig = this.readOpenClawConfig()
      const providersConfig = openClawConfig?.models?.providers || {}

      // 定义默认配置
      const defaultProviders: Record<APIProvider, ProviderConfig> = {
        zai: {
          apiKey: '',
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
          models: []
        },
        anthropic: {
          apiKey: '',
          baseUrl: 'https://api.anthropic.com/v1/',
          models: []
        },
        openai: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1/',
          models: []
        }
      }

      // 合并配置文件中的值
      const supportedProviders: APIProvider[] = ['zai', 'anthropic', 'openai']
      supportedProviders.forEach((provider) => {
        const config = providersConfig[provider]
        if (config) {
          defaultProviders[provider] = {
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || defaultProviders[provider].baseUrl,
            models: config.models || []
          }
        }
      })

      return defaultProviders
    } catch (error) {
      loggerError(`获取 Providers 配置失败: ${error}`, LOG_SOURCE)
      return {
        zai: {
          apiKey: '',
          baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
          models: []
        },
        anthropic: {
          apiKey: '',
          baseUrl: 'https://api.anthropic.com/v1/',
          models: []
        },
        openai: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1/',
          models: []
        }
      }
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
      return (
        openClawConfig?.gateway?.baseUrl ||
        `http://localhost:${getGatewayPort()}`
      )
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
      const apiKey = this.getAPIKey('zai')
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
  ConfigService.getInstance() as ConfigService

export default ConfigService
