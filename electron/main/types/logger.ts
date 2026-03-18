/**
 * 日志相关类型定义
 */

// 日志级别（小写）
export type LogLevel = 'info' | 'success' | 'warning' | 'error'

// 日志条目接口
export interface LogEntry {
  timestamp: Date
  content: string
  type: LogLevel
  source?: string
  pid?: number
}

// 日志配置接口
export interface LoggerConfig {
  maxLogs?: number
  fileLoggingEnabled?: boolean
  maxLogSize?: number
  maxLogFiles?: number
}

