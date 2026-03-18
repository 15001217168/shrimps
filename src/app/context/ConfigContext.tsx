import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode
} from 'react'
import type {
  ConfigContextValue,
  ConfigData,
  APIProvider,
  ModelInfo
} from './types'

// ==================== 常量定义 ====================

/** 默认配置 */
const DEFAULT_CONFIG: ConfigData = {
  provider: {},
  models: [],
  currentModel: '',
  gateway: {
    baseUrl: '',
    auth: {
      mode: 'token',
      token: ''
    }
  }
} as const satisfies ConfigData

/** IPC 通道名称 */
const IPC_CHANNELS = {
  GET_SETTINGS: 'config:get-settings',
  SAVE_API_KEY: 'config:save-api-key',
  DELETE_API_KEY: 'config:delete-api-key',
  SAVE_CONFIG: 'config:save'
} as const

// ==================== 类型定义 ====================

/** Provider Props */
interface ConfigProviderProps {
  readonly children: ReactNode
  /** 是否自动刷新 */
  readonly autoRefresh?: boolean
  /** 刷新间隔（毫秒） */
  readonly refreshInterval?: number
}

/** IPC 响应类型守卫 */
function isSuccessfulResponse<T>(
  response: unknown
): response is { success: true; data: T } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as { success: unknown }).success === true &&
    'data' in response
  )
}

/** 提取错误消息 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return fallback
}

// ==================== Context 创建 ====================

export const ConfigContext = createContext<ConfigContextValue | null>(null)

// ==================== Provider 组件 ====================

/**
 * 配置上下文 Provider
 * 负责管理与主进程的配置同步
 */
export function ConfigProvider({
  children,
  autoRefresh = true,
  refreshInterval = 30000
}: ConfigProviderProps): ReactNode {
  const [config, setConfig] = useState<ConfigData>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // ==================== 配置刷新 ====================

  const refreshConfig = useCallback((): void => {
    setError(null)

    // 获取设置数据
    window.ipcRenderer
      .invoke(IPC_CHANNELS.GET_SETTINGS)
      .then((response: unknown) => {
        if (
          isSuccessfulResponse<{
            provider?: {}
            models?: readonly ModelInfo[]
            currentModel?: string
            gateway?: {}
          }>(response)
        ) {
          const { provider, models, currentModel, gateway } = response.data

          console.log('IPC_CHANNELS.GET_SETTINGS', response.data)

          setConfig((prev) => ({
            ...prev,
            provider: provider ?? {},
            models: models ?? [],
            currentModel: currentModel ?? '',
            gateway: gateway ?? {}
          }))
        }
      })
      .catch((err) => {
        const errorMsg = extractErrorMessage(err, '获取设置失败')
        setError(errorMsg)
        console.error('[ConfigContext] 获取设置失败:', err)
      })
  }, [])

  // ==================== API Key 操作 ====================

  const saveAPIKey = useCallback(
    (provider: APIProvider, apiKey: string): Promise<boolean> => {
      setError(null)

      return window.ipcRenderer
        .invoke(IPC_CHANNELS.SAVE_API_KEY, provider, apiKey)
        .then((response: unknown) => {
          if (isSuccessfulResponse(response)) {
            setConfig((prev) => ({
              ...prev,
              apiKey,
              hasApiKey: true,
              apiProvider: provider
            }))
            return true
          }

          const errorMsg =
            (response as { error?: string }).error ?? '保存 API Key 失败'
          setError(errorMsg)
          return false
        })
        .catch((err) => {
          const errorMsg = extractErrorMessage(err, '保存 API Key 失败')
          setError(errorMsg)
          console.error('[ConfigContext] 保存 API Key 失败:', err)
          return false
        })
    },
    []
  )

  const deleteAPIKey = useCallback(
    (provider: APIProvider): Promise<boolean> => {
      setError(null)

      return window.ipcRenderer
        .invoke(IPC_CHANNELS.DELETE_API_KEY, provider)
        .then((response: unknown) => {
          if (isSuccessfulResponse(response)) {
            setConfig((prev) => ({
              ...prev,
              apiKey: '',
              hasApiKey: false
            }))
            return true
          }

          const errorMsg =
            (response as { error?: string }).error ?? '删除 API Key 失败'
          setError(errorMsg)
          return false
        })
        .catch((err) => {
          const errorMsg = extractErrorMessage(err, '删除 API Key 失败')
          setError(errorMsg)
          console.error('[ConfigContext] 删除 API Key 失败:', err)
          return false
        })
    },
    []
  )

  // ==================== 配置更新 ====================

  const updateConfig = useCallback(
    (newConfig: Partial<ConfigData>): Promise<boolean> => {
      setError(null)

      return window.ipcRenderer
        .invoke(IPC_CHANNELS.SAVE_CONFIG, newConfig)
        .then((response: unknown) => {
          if (isSuccessfulResponse(response)) {
            setConfig((prev) => ({
              ...prev,
              ...newConfig
            }))
            return true
          }

          const errorMsg =
            (response as { error?: string }).error ?? '更新配置失败'
          setError(errorMsg)
          return false
        })
        .catch((err) => {
          const errorMsg = extractErrorMessage(err, '更新配置失败')
          setError(errorMsg)
          console.error('[ConfigContext] 更新配置失败:', err)
          return false
        })
    },
    []
  )

  // ==================== 便捷方法 ====================

  const hasValidAPIKey = useCallback((): boolean => {
    return config.hasApiKey && config.apiKey.length > 0
  }, [config.hasApiKey, config.apiKey])

  const getCurrentModel = useCallback((): ModelInfo | null => {
    const { currentModel, models } = config
    if (!currentModel) return null
    return models.find((m): m is ModelInfo => m.id === currentModel) ?? null
  }, [config.currentModel, config.models])

  // ==================== 初始化和自动刷新 ====================

  useEffect(() => {
    refreshConfig()

    if (autoRefresh && refreshInterval > 0) {
      const intervalId = setInterval(refreshConfig, refreshInterval)
      return () => clearInterval(intervalId)
    }
  }, [autoRefresh, refreshInterval, refreshConfig])

  // ==================== Context 值 ====================

  const contextValue = useMemo<ConfigContextValue>(
    () => ({
      config,
      isLoading,
      error,
      refreshConfig,
      saveAPIKey,
      deleteAPIKey,
      updateConfig,
      hasValidAPIKey,
      getCurrentModel
    }),
    [
      config,
      isLoading,
      error,
      refreshConfig,
      saveAPIKey,
      deleteAPIKey,
      updateConfig,
      hasValidAPIKey,
      getCurrentModel
    ]
  )

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  )
}

export default ConfigProvider
