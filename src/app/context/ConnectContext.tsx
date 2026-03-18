import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode
} from 'react'

// ==================== 类型定义 ====================

/** WebSocket 连接状态 */
export type WSConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

/** 连接配置 */
export interface ConnectConfig {
  /** WebSocket 连接状态 */
  state: WSConnectionState
  /** 连接错误信息 */
  error?: string
  /** 服务器信息 */
  serverInfo?: {
    version?: string
    connId?: string
  }
}

/** Context 值接口 */
export interface ConnectContextValue {
  /** 连接配置 */
  readonly config: ConnectConfig
  /** 是否已连接 */
  readonly isConnected: boolean
  /** 更新连接状态 (供外部调用) */
  updateState: (state: WSConnectionState) => void
  /** 更新完整配置 (供外部调用) */
  updateConfig: (config: Partial<ConnectConfig>) => void
  /** 重置连接状态 */
  reset: () => void
}

// ==================== 常量定义 ====================

/** 默认配置 */
const DEFAULT_CONFIG: ConnectConfig = {
  state: 'disconnected'
} as const

// ==================== Context 创建 ====================

export const ConnectContext = createContext<ConnectContextValue | null>(null)

// ==================== Provider 组件 ====================

interface ConnectProviderProps {
  readonly children: ReactNode
}

/**
 * 连接状态上下文 Provider
 * 仅负责监听和管理 WebSocket 连接状态
 */
export function ConnectProvider({ children }: ConnectProviderProps): ReactNode {
  const [config, setConfig] = useState<ConnectConfig>(DEFAULT_CONFIG)

  // ==================== 状态更新方法 ====================

  /** 更新连接状态 */
  const updateState = useCallback((state: WSConnectionState): void => {
    setConfig((prev) => ({ ...prev, state }))
  }, [])

  /** 更新完整配置 */
  const updateConfig = useCallback(
    (newConfig: Partial<ConnectConfig>): void => {
      setConfig((prev) => ({ ...prev, ...newConfig }))
    },
    []
  )

  /** 重置连接状态 */
  const reset = useCallback((): void => {
    setConfig(DEFAULT_CONFIG)
  }, [])

  // ==================== 监听主进程状态变更 ====================

  useEffect(() => {
    const handleStateChange = (
      _event: unknown,
      data: { state: WSConnectionState }
    ): void => {
      console.log('[App] 连接状态变更:11111111', data)
      if (data?.state) {
        updateState(data.state)
      }
    }

    // 监听主进程发送的连接状态变更事件
    window.ipcRenderer.on('openclaw-state-change', handleStateChange)

    return () => {
      window.ipcRenderer.off('openclaw-state-change', handleStateChange)
    }
  }, [updateState])

  // ==================== Context 值 ====================

  const isConnected = config.state === 'connected'

  const contextValue = useMemo<ConnectContextValue>(
    () => ({
      config,
      isConnected,
      updateState,
      updateConfig,
      reset
    }),
    [config, isConnected, updateState, updateConfig, reset]
  )

  return (
    <ConnectContext.Provider value={contextValue}>
      {children}
    </ConnectContext.Provider>
  )
}

export default ConnectProvider
