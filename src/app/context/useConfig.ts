import { useContext } from 'react'
import { ConfigContext } from './ConfigContext'
import type { ConfigContextValue } from './types'

/**
 * 获取配置上下文的 Hook
 * 必须在 ConfigProvider 内部使用
 */
export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext)

  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }

  return context
}

/**
 * 获取配置数据的 Hook
 * 只返回配置数据，不包含操作方法
 */
export function useConfigData() {
  const { config } = useConfig()
  return config
}

/**
 * 获取 API Key 状态的 Hook
 */
export function useAPIKeyStatus() {
  const { config, saveAPIKey, deleteAPIKey, hasValidAPIKey } = useConfig()

  return {
    hasAPIKey: config.hasApiKey,
    apiKey: config.apiKey,
    provider: config.apiProvider,
    saveAPIKey,
    deleteAPIKey,
    hasValidAPIKey
  }
}

/**
 * 获取健康状态的 Hook
 */
export function useHealthStatus() {
  const { config } = useConfig()

  return {
    status: config.healthStatus,
    lastCheck: config.lastHealthCheck,
    isOnline: config.healthStatus === 'online',
    isOffline: config.healthStatus === 'offline',
    isStarting: config.healthStatus === 'starting'
  }
}

/**
 * 获取模型信息的 Hook
 */
export function useModels() {
  const { config, getCurrentModel } = useConfig()

  return {
    models: config.models,
    currentModel: config.currentModel,
    currentModelInfo: getCurrentModel(),
    hasModels: config.models.length > 0
  }
}

export default useConfig
