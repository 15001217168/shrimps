import { BrowserWindow, app } from 'electron'
import WebSocket from 'ws'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import * as uuid from 'uuid'
import { BaseService } from '../utils/base-service'
import {
  loggerInfo,
  loggerSuccess,
  loggerError,
  loggerWarning
} from '../utils/logger'
import type { ConfigService } from './config-service'
import type {
  GatewayRequestFrame,
  GatewayResponseFrame,
  GatewayEventFrame,
  GatewayHelloOk,
  ConnectionState,
  EventCallback,
  StateChangeCallback,
  // API 类型
  AgentsListResult,
  SessionsListResult,
  SessionsPatchResult,
  ChatHistoryResult,
  SkillStatusReport,
  ToolsCatalogResult,
  ConfigSnapshot,
  StatusSummary
} from '../types/openclaw-api'

const LOG_SOURCE = 'openclaw_ws'

// ==================== 设备身份验证 ====================

interface DeviceIdentity {
  deviceId: string
  publicKey: string
  privateKey: string
}

interface StoredIdentity {
  version: number
  deviceId: string
  publicKey: string
  privateKey: string
  createdAtMs: number
}

const IDENTITY_FILE = 'device-identity.json'

/**
 * Base64 URL 编码
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

/**
 * Base64 URL 解码
 */
function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

/**
 * Buffer 转 Hex
 */
function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex')
}

/**
 * 计算公钥指纹
 */
function fingerprintPublicKey(publicKey: Buffer): string {
  const hash = crypto.createHash('sha256').update(publicKey).digest()
  return bufferToHex(hash)
}

/**
 * 生成设备身份
 */
function generateIdentity(): DeviceIdentity {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const pubKeyBytes = publicKey
    .export({ format: 'der', type: 'spki' })
    .slice(-32)
  const privKeyBytes = privateKey
    .export({ format: 'der', type: 'pkcs8' })
    .slice(-32)
  const deviceId = fingerprintPublicKey(pubKeyBytes)

  return {
    deviceId,
    publicKey: base64UrlEncode(pubKeyBytes),
    privateKey: base64UrlEncode(privKeyBytes)
  }
}

/**
 * 获取身份文件路径
 */
function getIdentityFilePath(): string {
  return path.join(app.getPath('userData'), IDENTITY_FILE)
}

/**
 * 加载或创建设备身份
 */
function loadOrCreateDeviceIdentity(): DeviceIdentity {
  const filePath = getIdentityFilePath()

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as StoredIdentity

      if (
        parsed?.version === 1 &&
        typeof parsed.deviceId === 'string' &&
        typeof parsed.publicKey === 'string' &&
        typeof parsed.privateKey === 'string'
      ) {
        // 验证公钥指纹
        const pubKeyBytes = base64UrlDecode(parsed.publicKey)
        const derivedId = fingerprintPublicKey(pubKeyBytes)

        if (derivedId !== parsed.deviceId) {
          // 更新 deviceId
          const updated: StoredIdentity = {
            ...parsed,
            deviceId: derivedId
          }
          fs.writeFileSync(filePath, JSON.stringify(updated, null, 2))
          return {
            deviceId: derivedId,
            publicKey: parsed.publicKey,
            privateKey: parsed.privateKey
          }
        }

        return {
          deviceId: parsed.deviceId,
          publicKey: parsed.publicKey,
          privateKey: parsed.privateKey
        }
      }
    }
  } catch (error: unknown) {
    loggerWarning(`加载设备身份失败，将重新生成: ${error}`, LOG_SOURCE)
  }

  // 生成新身份
  const identity = generateIdentity()
  const stored: StoredIdentity = {
    version: 1,
    deviceId: identity.deviceId,
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    createdAtMs: Date.now()
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(stored, null, 2))
    loggerInfo(
      `设备身份已保存: ${identity.deviceId.slice(0, 16)}...`,
      LOG_SOURCE
    )
  } catch (error: unknown) {
    loggerWarning(`保存设备身份失败: ${error}`, LOG_SOURCE)
  }

  return identity
}

/**
 * 构建设备认证 payload
 */
function buildDeviceAuthPayload(params: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token: string | null
  nonce: string
}): string {
  const scopes = params.scopes.join(',')
  const token = params.token ?? ''
  return [
    'v2',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
    params.nonce
  ].join('|')
}

/**
 * 使用私钥签名 payload
 */
function signDevicePayload(
  privateKeyBase64Url: string,
  payload: string
): string {
  const privateKeyBytes = base64UrlDecode(privateKeyBase64Url)
  const privateKeyObj = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'),
      privateKeyBytes
    ]),
    format: 'der',
    type: 'pkcs8'
  })

  const data = Buffer.from(payload, 'utf-8')
  const signature = crypto.sign(null, data, privateKeyObj)
  return base64UrlEncode(signature)
}

/**
 * 生成 UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 待处理请求
interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

/**
 * OpenClaw WebSocket 客户端服务
 * 负责与 OpenClaw 的 WebSocket 服务通信
 */
export class OpenClawWSService extends BaseService {
  private ws: WebSocket | null = null
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private connectNonce: string | null = null
  private connectTimer: ReturnType<typeof setTimeout> | null = null
  private eventCallbacks: Set<EventCallback> = new Set()
  private stateCallbacks: Set<StateChangeCallback> = new Set()
  private wsUrl: string = 'ws://127.0.0.1:18899'
  private helloInfo: GatewayHelloOk | null = null
  private configService: ConfigService | null = null

  /**
   * 设置配置服务依赖
   */
  setConfigService(configService: ConfigService): void {
    this.configService = configService
  }

  /**
   * 获取当前连接状态
   */
  getState(): ConnectionState {
    return this.connectionState
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return (
      this.connectionState === 'connected' &&
      this.ws?.readyState === WebSocket.OPEN
    )
  }

  /**
   * 获取 Hello 信息
   */
  getHelloInfo(): GatewayHelloOk | null {
    return this.helloInfo
  }

  /**
   * 连接到 OpenClaw WebSocket
   */
  async connect(url?: string): Promise<boolean> {
    if (url) {
      this.wsUrl = url
    }

    if (this.isConnected()) {
      loggerInfo('WebSocket 已连接', LOG_SOURCE)
      return true
    }

    if (this.connectionState === 'connecting') {
      loggerInfo('WebSocket 正在连接中...', LOG_SOURCE)
      return false
    }

    return new Promise((resolve) => {
      try {
        this.setState('connecting')
        loggerInfo(`正在连接到 OpenClaw WebSocket: ${this.wsUrl}`, LOG_SOURCE)

        this.ws = new WebSocket(this.wsUrl)

        // 连接超时
        const timeout = setTimeout(() => {
          if (this.connectionState === 'connecting') {
            loggerWarning('WebSocket 连接超时', LOG_SOURCE)
            this.ws?.terminate()
            this.handleDisconnect()
            resolve(false)
          }
        }, 10000)

        this.ws.on('open', () => {
          clearTimeout(timeout)
          this.reconnectAttempts = 0
          loggerSuccess('OpenClaw WebSocket 连接成功，等待握手...', LOG_SOURCE)
          // 连接成功后等待 challenge 事件
          // 不立即 resolve，等待握手完成
        })

        this.ws.on('message', (data: WebSocket.RawData) => {
          this.handleMessage(data)
        })

        this.ws.on('error', (error: Error) => {
          clearTimeout(timeout)
          loggerError(`WebSocket 错误: ${error.message}`, LOG_SOURCE)
          this.setState('error')
          resolve(false)
        })

        this.ws.on('close', () => {
          clearTimeout(timeout)
          loggerInfo('WebSocket 连接关闭', LOG_SOURCE)
          this.handleDisconnect()
        })
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`WebSocket 连接失败: ${errMsg}`, LOG_SOURCE)
        this.setState('error')
        resolve(false)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.connectTimer) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // 清理所有待处理的请求
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout)
      reject(new Error('连接已断开'))
    })
    this.pendingRequests.clear()

    this.connectNonce = null
    this.helloInfo = null
    this.setState('disconnected')
    loggerInfo('WebSocket 已断开', LOG_SOURCE)
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(): void {
    const wasConnected = this.connectionState !== 'disconnected'
    this.ws = null
    this.connectNonce = null
    this.helloInfo = null

    // 清理待处理请求
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout)
      reject(new Error('连接已断开'))
    })
    this.pendingRequests.clear()

    if (wasConnected) {
      this.setState('disconnected')
      // 尝试重连
      this.attemptReconnect()
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      loggerWarning(
        `已达到最大重连次数 (${this.maxReconnectAttempts})`,
        LOG_SOURCE
      )
      return
    }

    this.reconnectAttempts++
    loggerInfo(
      `尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      LOG_SOURCE
    )

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.reconnectDelay)
  }

  /**
   * 发送 connect 请求
   */
  private async sendConnect(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }

    if (!this.connectNonce) {
      loggerWarning('缺少 nonce，无法发送 connect 请求', LOG_SOURCE)
      return
    }

    // 加载或创建设备身份
    const deviceIdentity = loadOrCreateDeviceIdentity()
    const signedAtMs = Date.now()
    const nonce = this.connectNonce

    // 获取 gateway token
    const gatewayToken = this.configService
      ? this.configService.getGatewayToken()
      : ''

    // 构建设备认证 payload
    const payload = buildDeviceAuthPayload({
      deviceId: deviceIdentity.deviceId,
      clientId: 'openclaw-macos',
      clientMode: 'ui',
      role: 'operator',
      scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
      signedAtMs,
      token: gatewayToken || null,
      nonce
    })

    // 签名
    const signature = signDevicePayload(deviceIdentity.privateKey, payload)

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'openclaw-macos',
        version: '1.0.0',
        platform: process.platform,
        mode: 'ui',
        instanceId: generateUUID()
      },
      role: 'operator',
      scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
      device: {
        id: deviceIdentity.deviceId,
        publicKey: deviceIdentity.publicKey,
        signature,
        signedAt: signedAtMs,
        nonce
      },
      auth: gatewayToken ? { token: gatewayToken } : undefined,
      caps: ['tool-events'],
      userAgent: `ShrimpsDesktop/1.0.0 (${process.platform})`,
      locale: 'zh-CN'
    }

    try {
      const hello = await this.request<GatewayHelloOk>('connect', params)
      this.helloInfo = hello
      this.setState('connected')
      loggerSuccess('OpenClaw 握手完成，连接就绪', LOG_SOURCE)
      if (hello?.server) {
        loggerInfo(`服务器信息: ${JSON.stringify(hello.server)}`, LOG_SOURCE)
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`Connect 请求失败: ${errMsg}`, LOG_SOURCE)
      this.ws?.close(4008, 'connect failed')
    }
  }

  /**
   * 发送请求
   */
  private request<T>(
    method: string,
    params?: unknown,
    timeout: number = 10000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket 未连接'))
        return
      }

      const id = generateUUID()
      const frame: GatewayRequestFrame = { type: 'req', id, method, params }

      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('请求超时'))
      }, timeout)

      this.pendingRequests.set(id, {
        resolve: (v: unknown) => resolve(v as T),
        reject,
        timeout: timeoutId
      })

      this.ws.send(JSON.stringify(frame))
      loggerInfo(`发送请求: ${method} (${id})`, LOG_SOURCE)
    })
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: WebSocket.RawData): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(data.toString())
    } catch {
      loggerError('解析消息失败: 非 JSON 格式', LOG_SOURCE)
      return
    }

    const frame = parsed as
      | GatewayRequestFrame
      | GatewayResponseFrame
      | GatewayEventFrame

    // 处理事件
    if (frame.type === 'event') {
      const evt = frame as GatewayEventFrame

      // 处理 connect.challenge 事件
      if (evt.event === 'connect.challenge') {
        const payload = evt.payload as
          | { nonce?: string; ts?: number }
          | undefined
        const nonce = payload?.nonce
        if (nonce) {
          loggerInfo(`收到握手挑战: nonce=${nonce}`, LOG_SOURCE)
          this.connectNonce = nonce
          void this.sendConnect()
        }
        return
      }

      loggerInfo(`收到事件: ${evt.event}`, LOG_SOURCE)

      // 通知事件回调
      this.eventCallbacks.forEach((callback) => {
        try {
          callback(evt)
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e)
          loggerError(`事件回调执行错误: ${errMsg}`, LOG_SOURCE)
        }
      })

      // 通知渲染进程
      this.notifyRenderer('openclaw-event', evt)
      return
    }

    // 处理响应
    if (frame.type === 'res') {
      const res = frame as GatewayResponseFrame
      const pending = this.pendingRequests.get(res.id)
      if (pending) {
        clearTimeout(pending.timeout)
        this.pendingRequests.delete(res.id)

        if (res.ok) {
          loggerInfo(`收到响应: ${res.id} (成功)`, LOG_SOURCE)
          pending.resolve(res.payload)
        } else {
          const errMsg = res.error?.message || '请求失败'
          loggerError(`收到响应: ${res.id} (失败: ${errMsg})`, LOG_SOURCE)
          pending.reject(new Error(errMsg))
        }
      }
      return
    }
  }

  /**
   * 设置连接状态并通知
   */
  private setState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      loggerInfo(`连接状态变更: ${state}`, LOG_SOURCE)

      // 通知状态回调
      this.stateCallbacks.forEach((callback) => {
        try {
          callback(state)
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e)
          loggerError(`状态回调执行错误: ${errMsg}`, LOG_SOURCE)
        }
      })

      // 通知渲染进程
      this.notifyRenderer('openclaw-state-change', { state })

      if (state == 'connected') {
        this.notifyRenderer('launcher:progress', {
          progress: 100
        })
      }
    }
  }

  /**
   * 通知渲染进程
   */
  private notifyRenderer(channel: string, data: unknown): void {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(channel, data)
    })
  }

  /**
   * 发送请求方法
   */
  async sendRequest<T = unknown>(
    method: string,
    params?: unknown,
    timeout: number = 30000
  ): Promise<T> {
    return this.request<T>(method, params, timeout)
  }

  /**
   * 发送聊天消息
   */
  async sendChatMessage(
    content: string,
    options?: { conversationId?: string }
  ): Promise<unknown> {
    return this.request('chat.send', {
      content,
      conversationId: options?.conversationId
    })
  }

  /**
   * 获取 OpenClaw 状态
   */
  async getStatus(): Promise<unknown> {
    return this.request('status.get')
  }

  /**
   * 获取 Agent 列表
   */
  async getAgents(): Promise<unknown> {
    return this.request('agents.list')
  }

  /**
   * 获取指定 Agent 详情
   */
  async getAgent(agentId: string): Promise<unknown> {
    return this.request('agents.get', { agentId })
  }

  /**
   * 获取会话列表
   */
  async getConversations(options?: {
    agentId?: string
    limit?: number
    offset?: number
  }): Promise<unknown> {
    return this.request('chat.history', {})
  }

  /**
   * 获取指定会话详情
   */
  async getConversation(conversationId: string): Promise<unknown> {
    return this.request('conversations.get', { conversationId })
  }

  /**
   * 创建新会话
   */
  async createConversation(options?: {
    agentId?: string
    title?: string
  }): Promise<unknown> {
    return this.request('conversations.create', options)
  }

  /**
   * 删除会话
   */
  async deleteConversation(conversationId: string): Promise<unknown> {
    return this.request('conversations.delete', { conversationId })
  }

  /**
   * 加载 sessions
   */
  async loadSessions(): Promise<unknown> {
    return this.request('sessions.list')
  }

  /**
   * 获取会话列表
   * 参考 OpenClaw: sessions.list
   */
  async getSessions(options?: {
    activeMinutes?: number
    includeGlobal?: boolean
    includeUnknown?: boolean
    limit?: number
  }): Promise<unknown> {
    const params: Record<string, unknown> = {}
    if (options?.activeMinutes) {
      params.activeMinutes = options.activeMinutes
    }
    if (options?.includeGlobal !== undefined) {
      params.includeGlobal = options.includeGlobal
    }
    if (options?.includeUnknown !== undefined) {
      params.includeUnknown = options.includeUnknown
    }
    if (options?.limit) {
      params.limit = options.limit
    }
    return this.request('sessions.list', params)
  }

  /**
   * 更新会话
   * 参考 OpenClaw: sessions.patch
   */
  async patchSession(
    sessionKey: string,
    patch: {
      label?: string | null
      thinkingLevel?: string | null
      verboseLevel?: string | null
      reasoningLevel?: string | null
    }
  ): Promise<unknown> {
    const params: Record<string, unknown> = { key: sessionKey }
    if (patch.label !== undefined) params.label = patch.label
    if (patch.thinkingLevel !== undefined)
      params.thinkingLevel = patch.thinkingLevel
    if (patch.verboseLevel !== undefined)
      params.verboseLevel = patch.verboseLevel
    if (patch.reasoningLevel !== undefined)
      params.reasoningLevel = patch.reasoningLevel
    return this.request('sessions.patch', params)
  }

  /**
   * 删除会话
   * 参考 OpenClaw: sessions.delete
   */
  async deleteSession(
    sessionKey: string,
    deleteTranscript?: boolean
  ): Promise<unknown> {
    return this.request('sessions.delete', {
      key: sessionKey,
      deleteTranscript: deleteTranscript ?? true
    })
  }

  /**
   * 获取聊天历史
   * 参考 OpenClaw: chat.history
   */
  async getChatHistory(
    sessionKey: string = 'agent:main:main',
    limit?: number
  ): Promise<unknown> {
    return this.request('chat.history', {
      sessionKey,
      limit: limit ?? 200
    })
  }

  /**
   * 发送聊天消息
   * 参考 OpenClaw: chat.send
   */
  async sendChat(
    sessionKey: string = 'agent:main:main',
    message: string,
    options?: {
      idempotencyKey?: string
      attachments?: Array<{
        type: 'image'
        mimeType: string
        content: string
      }>
    }
  ): Promise<unknown> {
    const params: Record<string, unknown> = {
      sessionKey,
      message,
      deliver: false
    }
    if (!params.sessionKey) {
      params.sessionKey = 'agent:main:main'
    }
    if (options?.idempotencyKey) {
      params.idempotencyKey = options.idempotencyKey
    } else {
      params.idempotencyKey = uuid.v4()
    }
    if (options?.attachments && options.attachments.length > 0) {
      params.attachments = options.attachments
    }
    return this.request('chat.send', params)
  }

  /**
   * 中止聊天
   * 参考 OpenClaw: chat.abort
   */
  async abortChat(
    sessionKey: string = 'agent:main:main',
    runId?: string
  ): Promise<unknown> {
    const params: Record<string, unknown> = { sessionKey }
    if (runId) {
      params.runId = runId
    }
    return this.request('chat.abort', params)
  }

  /**
   * 获取工具目录
   * 参考 OpenClaw: tools.catalog
   */
  async getToolsCatalog(agentId?: string): Promise<unknown> {
    return this.request('tools.catalog', {
      agentId: agentId,
      includePlugins: true
    })
  }

  /**
   * 获取 Skills 状态
   * 参考 OpenClaw: skills.status
   */
  async getSkillsStatus(): Promise<unknown> {
    return this.request('skills.status', {})
  }

  /**
   * 更新 Skill
   * 参考 OpenClaw: skills.update
   */
  async updateSkill(
    skillKey: string,
    updates: {
      enabled?: boolean
      apiKey?: string
    }
  ): Promise<unknown> {
    return this.request('skills.update', {
      skillKey,
      ...updates
    })
  }

  /**
   * 安装 Skill 依赖
   * 参考 OpenClaw: skills.install
   */
  async installSkill(
    skillKey: string,
    name: string,
    installId: string
  ): Promise<unknown> {
    return this.request('skills.install', {
      name,
      installId,
      timeoutMs: 120000
    })
  }

  /**
   * 获取配置快照
   * 参考 OpenClaw: config.snapshot
   */
  async getConfigSnapshot(): Promise<unknown> {
    return this.request('config.snapshot', {})
  }

  /**
   * 获取状态摘要
   * 参考 OpenClaw: status.summary
   */
  async getStatusSummary(): Promise<unknown> {
    return this.request('status.summary', {})
  }

  /**
   * 获取健康快照
   * 参考 OpenClaw: health.snapshot
   */
  async getHealthSnapshot(): Promise<unknown> {
    return this.request('health.snapshot', {})
  }

  /**
   * 添加事件监听器
   */
  addEventCallback(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback)
    return () => {
      this.eventCallbacks.delete(callback)
    }
  }

  /**
   * 添加状态变更监听器
   */
  addStateCallback(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback)
    return () => {
      this.stateCallbacks.delete(callback)
    }
  }
}

// 导出单例访问方法
export const getOpenClawWSService = (): OpenClawWSService =>
  OpenClawWSService.getInstance() as OpenClawWSService

export default OpenClawWSService
