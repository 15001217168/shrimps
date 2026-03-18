/**
 * Claw 相关类型定义
 */

// OpenClaw 状态类型
export type ClawStatus =
  | 'not-initialized' // 未初始化
  | 'initializing' // 正在初始化
  | 'initialized' // 已初始化
  | 'starting' // 正在启动
  | 'started' // 已启动
  | 'running' // 正在运行
  | 'connecting' // 正在连接
  | 'connected' // 已连接
  | 'ready' // 就绪
  | 'stopped' // 已停止
  | 'failed' // 失败
  | 'error' // 错误

// 进程信息接口
export interface ProcessInfo {
  pid: number | null
  status: ClawStatus
  port: number
  debug: boolean
}

// 启动选项
export interface StartOptions {
  port?: number
  debug?: boolean
  args?: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
}

// 初始化选项
export interface InitOptions {
  port?: number
  debug?: boolean
  workspaceDir?: string
  onStatusChange?: (status: ClawStatus) => void
}

// 工作区信息
export interface WorkspaceInfo {
  path: string
  size: number
  lastModified: Date | null
  dirSizes: Record<string, number>
  exists: boolean
  lastBackup?: Date | null
}

// 安装信息
export interface InstallInfo {
  version: string
  path: string
  nodeModulesPath: string
  exists: boolean
}

