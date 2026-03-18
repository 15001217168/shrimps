/**
 * OpenClaw Gateway API 类型定义
 * 参考: OpenClaw ui/src/ui/types.ts
 */

// ==================== Agent 相关类型 ====================

export type GatewayAgentRow = {
  id: string
  name: string
  description?: string
  model?: string
  provider?: string
  disabled?: boolean
}

export type AgentsListResult = {
  defaultId: string
  mainKey: string
  scope: string
  agents: GatewayAgentRow[]
}

export type AgentIdentityResult = {
  agentId: string
  name: string
  avatar: string
  emoji?: string
}

// ==================== Session 相关类型 ====================

export type GatewaySessionRow = {
  key: string
  kind: 'direct' | 'group' | 'global' | 'unknown'
  label?: string
  displayName?: string
  surface?: string
  subject?: string
  room?: string
  space?: string
  updatedAt: number | null
  sessionId?: string
  systemSent?: boolean
  abortedLastRun?: boolean
  thinkingLevel?: string
  verboseLevel?: string
  reasoningLevel?: string
  elevatedLevel?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  model?: string
  modelProvider?: string
  contextTokens?: number
}

export type GatewaySessionsDefaults = {
  model: string | null
  contextTokens: number | null
}

export type SessionsListResult = {
  defaults: GatewaySessionsDefaults
  sessions: GatewaySessionRow[]
}

export type SessionsPatchResult = {
  sessionId: string
  updatedAt?: number
  thinkingLevel?: string
  verboseLevel?: string
  reasoningLevel?: string
  elevatedLevel?: string
}

// ==================== Chat 相关类型 ====================

export type ChatAttachment = {
  type: 'image'
  mimeType: string
  content: string // base64
}

export type ChatContentBlock = {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content?: ChatContentBlock[] | string
  text?: string
  timestamp?: number
}

export type ChatHistoryResult = {
  messages?: ChatMessage[]
  thinkingLevel?: string
}

export type ChatSendResult = {
  runId: string
  sessionKey: string
}

export type ChatEventPayload = {
  runId: string
  sessionKey: string
  state: 'delta' | 'final' | 'aborted' | 'error'
  message?: ChatMessage
  errorMessage?: string
}

// ==================== Skills 相关类型 ====================

export type SkillInstallOption = {
  id: string
  kind: 'brew' | 'node' | 'go' | 'uv'
  label: string
  bins: string[]
}

export type SkillsStatusConfigCheck = {
  path: string
  satisfied: boolean
}

export type SkillStatusEntry = {
  name: string
  description: string
  source: string
  filePath: string
  baseDir: string
  skillKey: string
  bundled?: boolean
  primaryEnv?: string
  emoji?: string
  homepage?: string
  always: boolean
  disabled: boolean
  blockedByAllowlist: boolean
  eligible: boolean
  requirements: {
    bins: string[]
    env: string[]
    config: string[]
    os: string[]
  }
  missing: {
    bins: string[]
    env: string[]
    config: string[]
    os: string[]
  }
  configChecks: SkillsStatusConfigCheck[]
  install: SkillInstallOption[]
}

export type SkillStatusReport = {
  workspaceDir: string
  managedSkillsDir: string
  skills: SkillStatusEntry[]
}

// ==================== Tools 相关类型 ====================

export type ToolCatalogProfile = {
  id: 'minimal' | 'coding' | 'messaging' | 'full'
  label: string
}

export type ToolCatalogEntry = {
  id: string
  label: string
  description: string
  source: 'core' | 'plugin'
  pluginId?: string
  optional?: boolean
  defaultProfiles: Array<'minimal' | 'coding' | 'messaging' | 'full'>
}

export type ToolCatalogGroup = {
  id: string
  label: string
  source: 'core' | 'plugin'
  pluginId?: string
  tools: ToolCatalogEntry[]
}

export type ToolsCatalogResult = {
  agentId: string
  profiles: ToolCatalogProfile[]
  groups: ToolCatalogGroup[]
}

// ==================== Config 相关类型 ====================

export type ConfigSnapshotIssue = {
  path: string
  message: string
}

export type ConfigSnapshot = {
  path?: string | null
  exists?: boolean | null
  raw?: string | null
  hash?: string | null
  parsed?: unknown
  valid?: boolean | null
  config?: Record<string, unknown> | null
  issues?: ConfigSnapshotIssue[] | null
}

// ==================== Status 相关类型 ====================

export type StatusSummary = Record<string, unknown>
export type HealthSnapshot = Record<string, unknown>

// ==================== Gateway 帧类型 ====================

export type GatewayRequestFrame = {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

export type GatewayResponseFrame = {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export type GatewayEventFrame = {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: { presence: number; health: number }
}

export type GatewayHelloOk = {
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

// ==================== 连接状态 ====================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export type EventCallback = (event: GatewayEventFrame) => void
export type StateChangeCallback = (state: ConnectionState) => void
