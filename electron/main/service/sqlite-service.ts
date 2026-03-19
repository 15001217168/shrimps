import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { BaseService } from '../utils/base-service'
import { loggerInfo, loggerSuccess, loggerError } from '../utils/logger'

const LOG_SOURCE = 'sqlite_service'

/**
 * SQLite 数据库服务
 * 提供基础的数据库操作能力
 */
export class SqliteService extends BaseService {
  private db: Database.Database | null = null
  private dbPath: string = ''

  /**
   * 初始化数据库连接
   * @param dbPath 数据库文件路径，如果不传则使用默认路径
   */
  initialize(dbPath?: string): boolean {
    try {
      if (this.db) {
        loggerInfo('数据库已连接', LOG_SOURCE)
        return true
      }

      // 设置数据库路径
      this.dbPath = dbPath || this.getDefaultDbPath()

      // 确保目录存在
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // 创建数据库连接
      this.db = new Database(this.dbPath)

      // 启用 WAL 模式以提高性能
      this.db.pragma('journal_mode = WAL')

      loggerSuccess(`数据库已连接: ${this.dbPath}`, LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`初始化数据库失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 获取默认数据库路径
   */
  private getDefaultDbPath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'data', 'shrimps.db')
  }

  /**
   * 获取数据库实例
   */
  getDb(): Database.Database | null {
    return this.db
  }

  /**
   * 执行 SQL 语句（不返回结果）
   * @param sql SQL 语句
   * @param params 参数
   */
  run(sql: string, params: any[] = []): Database.RunResult | null {
    try {
      if (!this.db) {
        throw new Error('数据库未初始化')
      }
      return this.db.prepare(sql).run(...params)
    } catch (error) {
      loggerError(`执行 SQL 失败: ${sql}, 错误: ${error}`, LOG_SOURCE)
      return null
    }
  }

  /**
   * 查询单条记录
   * @param sql SQL 语句
   * @param params 参数
   */
  get<T = any>(sql: string, params: any[] = []): T | undefined {
    try {
      if (!this.db) {
        throw new Error('数据库未初始化')
      }
      return this.db.prepare(sql).get(...params) as T | undefined
    } catch (error) {
      loggerError(`查询失败: ${sql}, 错误: ${error}`, LOG_SOURCE)
      return undefined
    }
  }

  /**
   * 查询多条记录
   * @param sql SQL 语句
   * @param params 参数
   */
  all<T = any>(sql: string, params: any[] = []): T[] {
    try {
      if (!this.db) {
        throw new Error('数据库未初始化')
      }
      return this.db.prepare(sql).all(...params) as T[]
    } catch (error) {
      loggerError(`查询失败: ${sql}, 错误: ${error}`, LOG_SOURCE)
      return []
    }
  }

  /**
   * 执行事务
   * @param fn 事务函数
   */
  transaction<T>(fn: () => T): T | null {
    try {
      if (!this.db) {
        throw new Error('数据库未初始化')
      }
      return this.db.transaction(fn)()
    } catch (error) {
      loggerError(`事务执行失败: ${error}`, LOG_SOURCE)
      return null
    }
  }

  /**
   * 批量执行 SQL
   * @param sql SQL 语句
   * @param paramsArray 参数数组
   */
  batch(sql: string, paramsArray: any[][]): Database.RunResult[] {
    try {
      if (!this.db) {
        throw new Error('数据库未初始化')
      }
      const stmt = this.db.prepare(sql)
      const insertMany = this.db.transaction(() => {
        return paramsArray.map((params) => stmt.run(...params))
      })
      return insertMany()
    } catch (error) {
      loggerError(`批量执行失败: ${sql}, 错误: ${error}`, LOG_SOURCE)
      return []
    }
  }

  /**
   * 创建表
   * @param tableName 表名
   * @param columns 列定义
   */
  createTable(tableName: string, columns: string): boolean {
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`
    const result = this.run(sql)
    return result !== null
  }

  /**
   * 检查表是否存在
   * @param tableName 表名
   */
  tableExists(tableName: string): boolean {
    const result = this.get<{ count: number }>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    )
    return result?.count === 1
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      loggerInfo('数据库连接已关闭', LOG_SOURCE)
    }
  }

  /**
   * 获取数据库路径
   */
  getDbPath(): string {
    return this.dbPath
  }
}

// 导出单例访问方法
export const getSqliteService = (): SqliteService =>
  SqliteService.getInstance() as SqliteService

export default SqliteService
