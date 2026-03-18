import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'
import { BaseService } from './base-service'
import type { LogLevel, LogEntry, LoggerConfig } from '../types'

// 沙箱日志目录
const SANDBOX_ROOT = path.join(os.homedir(), '.openclaw-launcher')
const LOGS_DIR = path.join(SANDBOX_ROOT, 'shrimp_tank', 'logs')
const LOG_FILE = path.join(LOGS_DIR, 'launcher.log')
const DEFAULT_MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_MAX_LOG_FILES = 5

/**
 * 确保日志目录存在
 */
const ensureLogDir = (): void => {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true })
  }
}

/**
 * 格式化日志为字符串（使用小写格式）
 */
const formatLogLine = (log: LogEntry): string => {
  const timestamp = log.timestamp.toISOString()
  const type = log.type.toLowerCase().padEnd(7)
  const source = log.source ? `[${log.source}] ` : ''
  const pid = log.pid ? `[pid:${log.pid}] ` : ''
  return `${timestamp} ${type} ${pid}${source}${log.content}\n`
}

/**
 * 检查并轮转日志文件
 */
const rotateLogFile = (maxLogSize: number, maxLogFiles: number): void => {
  if (!fs.existsSync(LOG_FILE)) return

  const stats = fs.statSync(LOG_FILE)
  if (stats.size < maxLogSize) return

  // 删除最旧的日志文件
  const oldestLog = path.join(LOGS_DIR, `launcher.${maxLogFiles}.log`)
  if (fs.existsSync(oldestLog)) {
    fs.unlinkSync(oldestLog)
  }

  // 轮转日志文件
  for (let i = maxLogFiles - 1; i >= 1; i--) {
    const oldFile = path.join(LOGS_DIR, `launcher.${i}.log`)
    const newFile = path.join(LOGS_DIR, `launcher.${i + 1}.log`)
    if (fs.existsSync(oldFile)) {
      fs.renameSync(oldFile, newFile)
    }
  }

  // 将当前日志文件重命名为 launcher.1.log
  fs.renameSync(LOG_FILE, path.join(LOGS_DIR, 'launcher.1.log'))
}

/**
 * 写入日志到文件
 */
const writeToFile = (log: LogEntry, maxLogSize: number, maxLogFiles: number): void => {
  try {
    ensureLogDir()
    rotateLogFile(maxLogSize, maxLogFiles)
    const logLine = formatLogLine(log)
    fs.appendFileSync(LOG_FILE, logLine, 'utf-8')
  } catch (error) {
    console.error('Failed to write log to file:', error)
  }
}

/**
 * 日志管理器
 * 继承 BaseService 实现单例模式
 */
export class Logger extends BaseService {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private listeners: Set<(log: LogEntry) => void> = new Set()
  private fileLoggingEnabled = true
  private maxLogSize = DEFAULT_MAX_LOG_SIZE
  private maxLogFiles = DEFAULT_MAX_LOG_FILES


  /**
   * 配置日志器
   */
  configure(config: LoggerConfig): void {
    if (config.maxLogs !== undefined) {
      this.maxLogs = config.maxLogs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs)
      }
    }
    if (config.fileLoggingEnabled !== undefined) {
      this.fileLoggingEnabled = config.fileLoggingEnabled
    }
    if (config.maxLogSize !== undefined) {
      this.maxLogSize = config.maxLogSize
    }
    if (config.maxLogFiles !== undefined) {
      this.maxLogFiles = config.maxLogFiles
    }
  }

  /**
   * 启用/禁用文件日志
   */
  setFileLogging(enabled: boolean): void {
    this.fileLoggingEnabled = enabled
  }

  /**
   * 添加日志
   */
  log(content: string, type: LogLevel = 'info', source?: string): void {
    const log: LogEntry = {
      timestamp: new Date(),
      content,
      type,
      source,
      pid: process.pid
    }

    // 存储日志
    this.logs.push(log)

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 输出到控制台
    this.outputToConsole(log)

    // 写入文件
    if (this.fileLoggingEnabled) {
      writeToFile(log, this.maxLogSize, this.maxLogFiles)
    }

    // 通知所有监听器
    this.notifyListeners(log)
  }

  /**
   * 输出到控制台（使用小写格式）
   */
  private outputToConsole(log: LogEntry): void {
    const timestamp = log.timestamp.toLocaleTimeString('zh-CN')
    const prefix = `[${timestamp}] ${log.pid ? `[pid:${log.pid}] ` : ''}`

    const colors = {
      info: '\x1b[37m', // 白色
      success: '\x1b[32m', // 绿色
      warning: '\x1b[33m', // 黄色
      error: '\x1b[31m' // 红色
    }

    const reset = '\x1b[0m'
    const icon = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }

    try {
      console.log(
        `${colors[log.type]}${icon[log.type]} ${prefix}${log.content}${reset}`
      )
    } catch (error) {
      // 忽略控制台输出错误
    }
  }

  /**
   * 添加监听器
   */
  addListener(listener: (log: LogEntry) => void): void {
    this.listeners.add(listener)
  }

  /**
   * 移除监听器
   */
  removeListener(listener: (log: LogEntry) => void): void {
    this.listeners.delete(listener)
  }

  /**
   * 通知监听器
   */
  private notifyListeners(log: LogEntry): void {
    // 发送到渲染进程
    if (app?.isReady?.()) {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        try {
          mainWindow.webContents.send('logger:console-log', {
            content: log.content,
            type: log.type,
            source: log.source
          })
        } catch (error) {
          // 忽略发送错误
        }
      }
    }

    // 通知所有监听器
    this.listeners.forEach((listener) => {
      try {
        listener(log)
      } catch (error) {
        console.error('Error in log listener:', error)
      }
    })
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * 设置最大日志数量
   */
  setMaxLogs(max: number): void {
    this.maxLogs = max
    if (this.logs.length > max) {
      this.logs = this.logs.slice(-max)
    }
  }

  /**
   * 导出日志（使用小写格式）
   */
  exportLogs(): string {
    return this.logs
      .map((log) => {
        const timestamp = log.timestamp.toISOString()
        const type = log.type.toLowerCase()
        const source = log.source ? `[${log.source}]` : ''
        return `[${timestamp}] [${type}] ${source}${log.content}`
      })
      .join('\n')
  }

  /**
   * 获取日志文件路径
   */
  getLogFilePath(): string {
    return LOG_FILE
  }

  /**
   * 获取日志目录路径
   */
  getLogsDir(): string {
    return LOGS_DIR
  }

  /**
   * 读取日志文件内容
   */
  readLogFile(lines?: number): string {
    try {
      if (!fs.existsSync(LOG_FILE)) {
        return ''
      }
      const content = fs.readFileSync(LOG_FILE, 'utf-8')
      if (lines) {
        const allLines = content.split('\n')
        return allLines.slice(-lines).join('\n')
      }
      return content
    } catch (error) {
      console.error('Failed to read log file:', error)
      return ''
    }
  }

  /**
   * 清理日志文件
   */
  clearLogFiles(): void {
    try {
      if (fs.existsSync(LOG_FILE)) {
        fs.unlinkSync(LOG_FILE)
      }
      // 清理轮转的日志文件
      for (let i = 1; i <= DEFAULT_MAX_LOG_FILES; i++) {
        const file = path.join(LOGS_DIR, `launcher.${i}.log`)
        if (fs.existsSync(file)) {
          fs.unlinkSync(file)
        }
      }
    } catch (error) {
      console.error('Failed to clear log files:', error)
    }
  }
}

// 创建便捷的日志函数
const logger = Logger.getInstance()

export const loggerInfo = (content: string, source?: string): void =>
  logger.log(content, 'info', source)

export const loggerSuccess = (content: string, source?: string): void =>
  logger.log(content, 'success', source)

export const loggerWarning = (content: string, source?: string): void =>
  logger.log(content, 'warning', source)

export const loggerError = (content: string, source?: string): void =>
  logger.log(content, 'error', source)

// 导出实例
export default logger
