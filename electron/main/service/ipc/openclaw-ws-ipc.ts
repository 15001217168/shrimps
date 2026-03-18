import { ipcMain } from 'electron'
import { loggerError, loggerSuccess } from '../../utils/logger'
import { getOpenClawWSService } from '../openclaw-ws-service'

const LOG_SOURCE = 'ipc_openclaw_ws'

/**
 * 注册 OpenClaw WebSocket 服务 IPC 处理器
 * 使用单例模式获取服务实例
 */
export function registerOpenClawWSIPC(): void {
  const openClawWSService = getOpenClawWSService()

  // 连接 WebSocket
  ipcMain.handle('openclaw-ws:connect', async (_event, url?: string) => {
    try {
      const result = await openClawWSService.connect(url)
      return { success: result }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`连接失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 断开连接
  ipcMain.handle('openclaw-ws:disconnect', async () => {
    try {
      openClawWSService.disconnect()
      return { success: true }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`断开连接失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取连接状态
  ipcMain.handle('openclaw-ws:get-state', async () => {
    return {
      success: true,
      data: {
        state: openClawWSService.getState(),
        connected: openClawWSService.isConnected(),
        helloInfo: openClawWSService.getHelloInfo()
      }
    }
  })

  // 发送请求
  ipcMain.handle(
    'openclaw-ws:request',
    async (_event, method: string, params?: unknown, timeout?: number) => {
      try {
        const response = await openClawWSService.sendRequest(
          method,
          params,
          timeout
        )
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`请求失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 发送聊天消息 (旧版，保留兼容)
  ipcMain.handle(
    'openclaw-ws:send-chat-message',
    async (_event, content: string, options?: { conversationId?: string }) => {
      try {
        const response = await openClawWSService.sendChatMessage(
          content,
          options
        )
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`发送聊天失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 获取 OpenClaw 状态
  ipcMain.handle('openclaw-ws:get-status', async () => {
    try {
      const response = await openClawWSService.getStatus()
      return { success: true, data: response }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取状态失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取 Agent 列表
  ipcMain.handle('openclaw-ws:get-agents', async () => {
    try {
      const response = await openClawWSService.getAgents()
      return { success: true, data: response }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取 Agent 列表失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取指定 Agent 详情
  ipcMain.handle('openclaw-ws:get-agent', async (_event, agentId: string) => {
    try {
      const response = await openClawWSService.getAgent(agentId)
      return { success: true, data: response }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取 Agent 详情失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取会话列表
  ipcMain.handle(
    'openclaw-ws:get-conversations',
    async (
      _event,
      options?: { agentId?: string; limit?: number; offset?: number }
    ) => {
      try {
        const response = await openClawWSService.getConversations(options)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`获取会话列表失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 获取指定会话详情
  ipcMain.handle(
    'openclaw-ws:get-conversation',
    async (_event, conversationId: string) => {
      try {
        const response = await openClawWSService.getConversation(conversationId)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`获取会话详情失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 创建新会话
  ipcMain.handle(
    'openclaw-ws:create-conversation',
    async (_event, options?: { agentId?: string; title?: string }) => {
      try {
        const response = await openClawWSService.createConversation(options)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`创建会话失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 删除会话
  ipcMain.handle(
    'openclaw-ws:delete-conversation',
    async (_event, conversationId: string) => {
      try {
        const response =
          await openClawWSService.deleteConversation(conversationId)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`删除会话失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 加载 sessions
  ipcMain.handle('openclaw-ws:load-sessions', async (_event) => {
    try {
      const response = await openClawWSService.loadSessions()
      return { success: true, data: response }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`加载 session 失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取 sessions 列表 (带参数)
  ipcMain.handle(
    'openclaw-ws:get-sessions',
    async (
      _event,
      options?: {
        activeMinutes?: number
        includeGlobal?: boolean
        includeUnknown?: boolean
        limit?: number
      }
    ) => {
      try {
        const response = await openClawWSService.getSessions(options)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`获取 sessions 列表失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 更新 session
  ipcMain.handle(
    'openclaw-ws:patch-session',
    async (
      _event,
      sessionKey: string,
      patch: {
        label?: string | null
        thinkingLevel?: string | null
        verboseLevel?: string | null
        reasoningLevel?: string | null
      }
    ) => {
      try {
        const response = await openClawWSService.patchSession(sessionKey, patch)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`更新 session 失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 删除 session
  ipcMain.handle(
    'openclaw-ws:delete-session',
    async (_event, sessionKey: string, deleteTranscript?: boolean) => {
      try {
        const response = await openClawWSService.deleteSession(
          sessionKey,
          deleteTranscript
        )
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`删除 session 失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 获取聊天历史
  ipcMain.handle(
    'openclaw-ws:get-chat-history',
    async (_event, sessionKey: string, limit?: number) => {
      try {
        const response = await openClawWSService.getChatHistory(sessionKey, limit)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`获取聊天历史失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 发送聊天消息 (新版，基于 sessionKey)
  ipcMain.handle(
    'openclaw-ws:chat-send',
    async (
      _event,
      sessionKey: string,
      message: string,
      options?: {
        idempotencyKey?: string
        attachments?: Array<{
          type: 'image'
          mimeType: string
          content: string
        }>
      }
    ) => {
      try {
        const response = await openClawWSService.sendChat(
          sessionKey,
          message,
          options
        )
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`发送聊天失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 中止聊天
  ipcMain.handle(
    'openclaw-ws:abort-chat',
    async (_event, sessionKey: string, runId?: string) => {
      try {
        const response = await openClawWSService.abortChat(sessionKey, runId)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`中止聊天失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 获取工具目录
  ipcMain.handle(
    'openclaw-ws:get-tools-catalog',
    async (_event, agentId?: string) => {
      try {
        const response = await openClawWSService.getToolsCatalog(agentId)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`获取工具目录失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 获取 Skills 状态
  ipcMain.handle('openclaw-ws:get-skills-status', async () => {
    try {
      const response = await openClawWSService.getSkillsStatus()
      return { success: true, data: response }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取 Skills 状态失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 更新 Skill
  ipcMain.handle(
    'openclaw-ws:update-skill',
    async (
      _event,
      skillKey: string,
      updates: {
        enabled?: boolean
        apiKey?: string
      }
    ) => {
      try {
        const response = await openClawWSService.updateSkill(skillKey, updates)
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`更新 Skill 失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 安装 Skill 依赖
  ipcMain.handle(
    'openclaw-ws:install-skill',
    async (_event, skillKey: string, name: string, installId: string) => {
      try {
        const response = await openClawWSService.installSkill(
          skillKey,
          name,
          installId
        )
        return { success: true, data: response }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error)
        loggerError(`安装 Skill 依赖失败: ${errMsg}`, LOG_SOURCE)
        return { success: false, error: errMsg }
      }
    }
  )

  // 获取配置快照
  ipcMain.handle('openclaw-ws:get-config-snapshot', async () => {
    try {
      const response = await openClawWSService.getConfigSnapshot()
      return { success: true, data: response }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取配置快照失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取状态摘要
  ipcMain.handle('openclaw-ws:get-status-summary', async () => {
    try {
      const response = await openClawWSService.getStatusSummary()
      return { success: true, data: response }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取状态摘要失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  // 获取健康快照
  ipcMain.handle('openclaw-ws:get-health-snapshot', async () => {
    try {
      const response = await openClawWSService.getHealthSnapshot()
      return { success: true, data: response }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      loggerError(`获取健康快照失败: ${errMsg}`, LOG_SOURCE)
      return { success: false, error: errMsg }
    }
  })

  loggerSuccess('OpenClaw WebSocket IPC 已注册', LOG_SOURCE)
}

export default registerOpenClawWSIPC
