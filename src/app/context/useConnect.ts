import { useContext } from 'react'
import { ConnectContext } from './ConnectContext'
import type { ConnectContextValue, WSConnectionState } from './ConnectContext'

/**
 * 获取连接状态的 Hook
 * @returns 连接上下文值
 * @throws 如果在 ConnectProvider 外部使用会抛出错误
 */
export function useConnect(): ConnectContextValue {
  const context = useContext(ConnectContext)

  if (!context) {
    throw new Error('useConnect must be used within a ConnectProvider')
  }

  return context
}

/**
 * 仅获取连接状态的 Hook
 * 适用于只需要读取状态的组件
 */
export function useConnectionState(): WSConnectionState {
  const { config } = useConnect()
  return config.state
}

/**
 * 仅获取是否已连接的 Hook
 * 适用于只需要判断连接状态的组件
 */
export function useIsConnected(): boolean {
  const { isConnected } = useConnect()
  return isConnected
}
