import { BaseService } from '../utils/base-service'
import { loggerInfo, loggerSuccess, loggerError } from '../utils/logger'
import type { SqliteService } from './sqlite-service'
import { getSqliteService } from './sqlite-service'

const LOG_SOURCE = 'storage_service'

/**
 * 应用设置接口
 */
export interface AppSettings {
  // 外观设置
  theme: 'light' | 'dark' | 'system'
  // 语言设置
  language: 'en' | 'zh'
  // 其他自定义设置
  [key: string]: any
}

/**
 * 设置项数据结构
 */
interface SettingItem {
  key: string
  value: string
  updated_at: string
}

/**
 * 本地存储服务
 * 负责管理应用本地配置（主题、语言等）
 */
export class StorageService extends BaseService {
  private readonly TABLE_NAME = 'app_settings'
  private sqliteService: SqliteService | null = null
  private cache: Map<string, any> = new Map()
  private initialized: boolean = false

  /**
   * 初始化存储服务
   */
  initialize(): boolean {
    try {
      if (this.initialized) {
        return true
      }

      this.sqliteService = getSqliteService()

      // 确保数据库已初始化
      if (!this.sqliteService.getDb()) {
        this.sqliteService.initialize()
      }

      // 创建设置表
      this.createSettingsTable()

      // 加载缓存
      this.loadCache()

      this.initialized = true
      loggerSuccess('存储服务初始化完成', LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`初始化存储服务失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 创建设置表
   */
  private createSettingsTable(): void {
    const columns = `
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `
    this.sqliteService?.createTable(this.TABLE_NAME, columns)
  }

  /**
   * 加载所有设置到缓存
   */
  private loadCache(): void {
    const settings = this.sqliteService?.all<SettingItem>(
      `SELECT key, value FROM ${this.TABLE_NAME}`
    )
    if (settings) {
      for (const item of settings) {
        try {
          this.cache.set(item.key, JSON.parse(item.value))
        } catch {
          this.cache.set(item.key, item.value)
        }
      }
    }
  }

  /**
   * 获取设置项
   * @param key 设置键名
   * @param defaultValue 默认值
   */
  get<T = any>(key: string, defaultValue?: T): T | undefined {
    // 优先从缓存获取
    if (this.cache.has(key)) {
      return this.cache.get(key) as T
    }

    // 从数据库获取
    const result = this.sqliteService?.get<SettingItem>(
      `SELECT value FROM ${this.TABLE_NAME} WHERE key = ?`,
      [key]
    )

    if (result) {
      try {
        const value = JSON.parse(result.value) as T
        this.cache.set(key, value)
        return value
      } catch {
        this.cache.set(key, result.value)
        return result.value as T
      }
    }

    return defaultValue
  }

  /**
   * 设置项
   * @param key 设置键名
   * @param value 设置值
   */
  set<T>(key: string, value: T): boolean {
    try {
      const jsonValue = JSON.stringify(value)
      const now = new Date().toISOString()

      // 使用 UPSERT 语法
      const sql = `
        INSERT INTO ${this.TABLE_NAME} (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `

      const result = this.sqliteService?.run(sql, [key, jsonValue, now])

      if (result !== null) {
        // 更新缓存
        this.cache.set(key, value)
        loggerInfo(`设置已保存: ${key}`, LOG_SOURCE)
        return true
      }

      return false
    } catch (error) {
      loggerError(`保存设置失败: ${key}, 错误: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 删除设置项
   * @param key 设置键名
   */
  delete(key: string): boolean {
    try {
      const sql = `DELETE FROM ${this.TABLE_NAME} WHERE key = ?`
      const result = this.sqliteService?.run(sql, [key])

      if (result !== null) {
        this.cache.delete(key)
        loggerInfo(`设置已删除: ${key}`, LOG_SOURCE)
        return true
      }

      return false
    } catch (error) {
      loggerError(`删除设置失败: ${key}, 错误: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 获取所有设置
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {}
    this.cache.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /**
   * 批量设置
   * @param settings 设置对象
   */
  setMany(settings: Record<string, any>): boolean {
    try {
      const entries = Object.entries(settings)
      const now = new Date().toISOString()

      const paramsArray = entries.map(([key, value]) => [
        key,
        JSON.stringify(value),
        now
      ])

      const sql = `
        INSERT INTO ${this.TABLE_NAME} (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `

      this.sqliteService?.batch(sql, paramsArray)

      // 更新缓存
      entries.forEach(([key, value]) => {
        this.cache.set(key, value)
      })

      loggerSuccess(`批量保存设置完成: ${entries.length} 项`, LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`批量保存设置失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 清除所有设置
   */
  clear(): boolean {
    try {
      const sql = `DELETE FROM ${this.TABLE_NAME}`
      const result = this.sqliteService?.run(sql)

      if (result !== null) {
        this.cache.clear()
        loggerInfo('所有设置已清除', LOG_SOURCE)
        return true
      }

      return false
    } catch (error) {
      loggerError(`清除设置失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  // ============ 便捷方法 ============

  /**
   * 获取主题设置
   */
  getTheme(): 'light' | 'dark' | 'system' {
    return this.get<'light' | 'dark' | 'system'>('theme', 'dark')!
  }

  /**
   * 设置主题
   */
  setTheme(theme: 'light' | 'dark' | 'system'): boolean {
    return this.set('theme', theme)
  }

  /**
   * 获取语言设置
   */
  getLanguage(): 'en' | 'zh' {
    return this.get<'en' | 'zh'>('language', 'en')!
  }

  /**
   * 设置语言
   */
  setLanguage(language: 'en' | 'zh'): boolean {
    return this.set('language', language)
  }

  /**
   * 获取完整应用设置
   */
  getAppSettings(): AppSettings {
    return {
      theme: this.getTheme(),
      language: this.getLanguage()
    }
  }

  /**
   * 批量更新应用设置
   */
  updateAppSettings(settings: Partial<AppSettings>): boolean {
    return this.setMany(settings)
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// 导出单例访问方法
export const getStorageService = (): StorageService =>
  StorageService.getInstance() as StorageService

export default StorageService
