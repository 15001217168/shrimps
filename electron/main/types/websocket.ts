/**
 * WebSocket 相关类型定义
 */

// 消息帧类型定义
export interface GatewayRequestFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

export interface GatewayResponseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: { code: string; message: string; details?: unknown }
}

export interface GatewayEventFrame {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: { presence: number; health: number }
}

export type GatewayMessage =
  | GatewayRequestFrame
  | GatewayResponseFrame
  | GatewayEventFrame

// Hello 响应类型
export interface GatewayHelloOk {
  type: 'hello-ok'
  protocol: number
  server?: {
    version?: string
    connId?: string
  }
  features?: { methods?: string[]; events?: string[] }
  snapshot?: unknown
  auth?: {
    deviceToken?: string
    role?: string
    scopes?: string[]
    issuedAtMs?: number
  }
  policy?: { tickIntervalMs?: number }
}

// 连接状态
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

// 设备身份
export interface DeviceIdentity {
  deviceId: string
  publicKey: string
  privateKey: string
}

// 存储的身份
export interface StoredIdentity {
  version: number
  deviceId: string
  publicKey: string
  privateKey: string
  createdAtMs: number
}

// 回调函数类型
export type EventCallback = (event: GatewayEventFrame) => void
export type StateChangeCallback = (state: ConnectionState) => void

