import { spawn, exec as execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { promisify } from 'util'
import { BaseService } from '../utils/base-service'
import { loggerInfo, loggerSuccess, loggerError } from '../utils/logger'
import type { NodeEnvService } from './node-env'
import type { WorkspaceInfo, InstallInfo } from '../types'

const LOG_SOURCE = 'sandbox_env'

const exec = promisify(execSync)

// 沙箱目录结构
const SANDBOX_ROOT = path.join(os.homedir(), '.openclaw-launcher')
const RUNTIME_DIR = path.join(SANDBOX_ROOT, 'runtime') // 存放便携版 Node.js
const AGENT_DIR = path.join(SANDBOX_ROOT, 'agent_core') // 存放 OpenClaw 本身
const WORKSPACE_DIR = path.join(SANDBOX_ROOT, 'shrimp_tank') // Agent 的实际工作区
const PACKAGE_JSON_PATH = path.join(AGENT_DIR, 'package.json')

/**
 * 沙箱环境管理服务
 * 负责创建和管理独立的运行环境
 */
export class SandboxEnvService extends BaseService {
  private nodeEnvService: NodeEnvService | null = null

  /**
   * 设置 Node 环境服务依赖
   */
  setNodeEnvService(service: NodeEnvService): void {
    this.nodeEnvService = service
  }

  /**
   * 获取沙箱目录路径
   */
  getPaths(): {
    root: string
    runtime: string
    agent: string
    workspace: string
    packageJson: string
  } {
    return {
      root: SANDBOX_ROOT,
      runtime: RUNTIME_DIR,
      agent: AGENT_DIR,
      workspace: WORKSPACE_DIR,
      packageJson: PACKAGE_JSON_PATH
    }
  }

  /**
   * 检查沙箱是否已初始化（检测 OpenClaw 是否已安装）
   */
  isSandboxInitialized(): boolean {
    try {
      const platform = os.platform()
      const clawBin =
        platform === 'win32'
          ? path.join(AGENT_DIR, 'node_modules', '.bin', 'openclaw.cmd')
          : path.join(AGENT_DIR, 'node_modules', '.bin', 'openclaw')

      return fs.existsSync(clawBin)
    } catch (error) {
      return false
    }
  }

  /**
   * 初始化沙箱目录结构
   */
  initializeDirectories(): void {
    ;[RUNTIME_DIR, AGENT_DIR, WORKSPACE_DIR].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })

    // 确保工作区有必要的子目录
    const subDirs = [
      'logs', // 日志文件
      'cache', // 缓存文件
      'temp', // 临时文件
      'config', // 配置文件
      'data', // 数据文件
      'downloads' // 下载文件
    ]

    subDirs.forEach((dir) => {
      const dirPath = path.join(WORKSPACE_DIR, dir)
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
      }
    })
  }

  /**
   * 创建局部的 package.json
   */
  createLocalPackageJson(): boolean {
    if (fs.existsSync(PACKAGE_JSON_PATH)) {
      return true
    }

    const pkgJson = {
      name: 'openclaw-sandbox',
      version: '1.0.0',
      private: true,
      description: 'OpenClaw Agent 沙箱环境',
      scripts: {
        start: 'node index.js',
        test: "echo 'No tests'"
      },
      dependencies: {
        // 这里可以预定义一些依赖版本
        // "openclaw": "^0.2.5"
      }
    }

    try {
      fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkgJson, null, 2))
      return true
    } catch (error) {
      loggerError(`创建 package.json 失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 构建独立沙箱环境
   */
  async createIsolatedSandbox(openclawVersion = 'latest'): Promise<boolean> {
    loggerInfo('开始构建沙箱环境...', LOG_SOURCE)

    // 1. 初始化目录结构
    this.initializeDirectories()

    // 2. 创建局部 package.json
    if (!this.createLocalPackageJson()) {
      throw new Error('无法创建 package.json')
    }

    // 3. 获取便携版 Node.js 环境
    if (!this.nodeEnvService) {
      throw new Error('NodeEnvService 未设置')
    }
    const portableEnv =
      await this.nodeEnvService.ensureNodeEnvironment()

    // 5. 在 AGENT_DIR 目录下使用本地 pnpm 安装 OpenClaw
    loggerInfo(
      `正在沙箱中安装 OpenClaw (${openclawVersion})...`,
      LOG_SOURCE
    )

    try {
      // 使用npx
      const installCommand = `npx pnpm add openclaw@${openclawVersion} --registry=https://registry.npmmirror.com`

      await exec(installCommand, {
        cwd: AGENT_DIR,
        env: {
          ...portableEnv,
          npm_config_cache: path.join(WORKSPACE_DIR, 'cache', 'npm'),
          npm_config_loglevel: 'warn',
          PLAYWRIGHT_DOWNLOAD_HOST: 'https://npmmirror.com/mirrors/playwright/'
        }
      })

      loggerSuccess('沙箱环境构建完成！', LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`沙箱构建失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 检查 OpenClaw 是否已安装
   */
  isClawInstalled(): boolean {
    try {
      const clawBin = this.getClawBinaryPath()
      return fs.existsSync(clawBin)
    } catch (error) {
      return false
    }
  }

  /**
   * 获取 OpenClaw 可执行文件路径
   */
  getClawBinaryPath(): string {
    const platform = os.platform()
    const clawBin =
      platform === 'win32'
        ? path.join(AGENT_DIR, 'node_modules', '.bin', 'openclaw.cmd')
        : path.join(AGENT_DIR, 'node_modules', '.bin', 'openclaw')

    if (!fs.existsSync(clawBin)) {
      throw new Error('OpenClaw 未安装或找不到可执行文件')
    }

    return clawBin
  }

  /**
   * 启动沙箱里的 OpenClaw
   */
  async startSandboxClaw(
    options: {
      port?: number
      config?: string
      debug?: boolean
      args?: string[]
    } = {}
  ): Promise<typeof spawn extends (...args: any[]) => infer R ? R : never> {
    loggerInfo('启动沙箱中的 OpenClaw...', LOG_SOURCE)

    try {
      const clawBin = this.getClawBinaryPath()
      if (!this.nodeEnvService) {
        throw new Error('NodeEnvService 未设置')
      }
      const portableEnv =
        await this.nodeEnvService.ensureNodeEnvironment()

      // 构建启动参数
      const args = [
        'gateway',
        '--port',
        options.port?.toString() || '18789',
        '--workspace',
        WORKSPACE_DIR,
        ...(options.debug ? ['--debug'] : []),
        ...(options.config ? ['--config', options.config] : []),
        ...(options.args || [])
      ]

      // 关键点：将 cwd 设置为 WORKSPACE_DIR
      const clawProcess = spawn(clawBin, args, {
        cwd: WORKSPACE_DIR,
        env: {
          ...portableEnv,
          // 设置环境变量让 OpenClaw 使用沙箱路径
          OPENCLAW_WORKSPACE: WORKSPACE_DIR,
          OPENCLAW_LOGS: path.join(WORKSPACE_DIR, 'logs'),
          OPENCLAW_CONFIG: path.join(WORKSPACE_DIR, 'config')
        },
        shell: true,
        stdio: 'inherit'
      })

      // 保存进程引用以便后续管理
      clawProcess.on('exit', (code) => {
        loggerInfo(`OpenClaw 进程退出，退出码: ${code}`, LOG_SOURCE)
      })

      return clawProcess
    } catch (error) {
      loggerError(`启动 OpenClaw 失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 获取工作区信息
   */
  getWorkspaceInfo(): WorkspaceInfo {
    try {
      const stats = fs.statSync(WORKSPACE_DIR)

      // 计算目录大小
      let size = 0
      const calculateDirSize = (dir: string): void => {
        const files = fs.readdirSync(dir)
        files.forEach((file) => {
          const filePath = path.join(dir, file)
          const fileStat = fs.statSync(filePath)
          if (fileStat.isDirectory()) {
            calculateDirSize(filePath)
          } else {
            size += fileStat.size
          }
        })
      }

      try {
        calculateDirSize(WORKSPACE_DIR)
      } catch (error) {
        // 忽略无法访问的文件
      }

      // 获取各子目录大小
      const subDirs = ['logs', 'cache', 'temp', 'config', 'data', 'downloads']
      const dirSizes: Record<string, number> = {}

      subDirs.forEach((dir) => {
        try {
          const dirPath = path.join(WORKSPACE_DIR, dir)
          if (fs.existsSync(dirPath)) {
            const dirStat = fs.statSync(dirPath)
            dirSizes[dir] = dirStat.size
          }
        } catch (error) {
          dirSizes[dir] = 0
        }
      })

      return {
        path: WORKSPACE_DIR,
        size: size,
        lastModified: stats.mtime,
        dirSizes,
        exists: true
      }
    } catch (error) {
      return {
        path: WORKSPACE_DIR,
        size: 0,
        lastModified: null,
        dirSizes: {},
        exists: false
      }
    }
  }

  /**
   * 清理工作区（保留必要目录）
   */
  async cleanupWorkspace(): Promise<boolean> {
    loggerInfo('开始清理工作区...', LOG_SOURCE)

    try {
      const dirsToClean = ['temp', 'cache']

      dirsToClean.forEach((dir) => {
        const dirPath = path.join(WORKSPACE_DIR, dir)
        if (fs.existsSync(dirPath)) {
          // 清空目录内容，但保留目录
          const files = fs.readdirSync(dirPath)
          files.forEach((file) => {
            const filePath = path.join(dirPath, file)
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath)
            } else {
              // 递归删除子目录
              this.deleteDirectoryRecursive(filePath)
            }
          })
        }
      })

      loggerSuccess('工作区清理完成', LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`清理工作区失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 递归删除目录
   */
  private deleteDirectoryRecursive(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        const filePath = path.join(dirPath, file)
        if (fs.statSync(filePath).isDirectory()) {
          this.deleteDirectoryRecursive(filePath)
        } else {
          fs.unlinkSync(filePath)
        }
      })
      fs.rmdirSync(dirPath)
    }
  }

  /**
   * 备份工作区
   */
  async backupWorkspace(backupDir?: string): Promise<string> {
    loggerInfo('开始备份工作区...', LOG_SOURCE)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const defaultBackupDir = path.join(SANDBOX_ROOT, 'backups')
    const backupPath =
      backupDir || path.join(defaultBackupDir, `backup-${timestamp}`)

    try {
      if (!fs.existsSync(defaultBackupDir)) {
        fs.mkdirSync(defaultBackupDir, { recursive: true })
      }

      // 创建备份
      await exec(`cp -r "${WORKSPACE_DIR}" "${backupPath}"`)
      loggerSuccess(`工作区已备份到: ${backupPath}`, LOG_SOURCE)
      return backupPath
    } catch (error) {
      loggerError(`备份失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 恢复工作区
   */
  async restoreWorkspace(backupPath: string): Promise<boolean> {
    loggerInfo('开始恢复工作区...', LOG_SOURCE)

    try {
      // 清空当前工作区
      if (fs.existsSync(WORKSPACE_DIR)) {
        this.deleteDirectoryRecursive(WORKSPACE_DIR)
      }

      // 重新创建基础目录
      this.initializeDirectories()

      // 恢复备份
      await exec(`cp -r "${backupPath}" "${WORKSPACE_DIR}"`)
      loggerSuccess(`工作区已从 ${backupPath} 恢复`, LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`恢复失败: ${error}`, LOG_SOURCE)
      throw error
    }
  }

  /**
   * 打开工作区文件夹
   */
  async openWorkspaceFolder(): Promise<void> {
    const { exec } = await import('child_process')
    const platform = os.platform()

    try {
      if (platform === 'win32') {
        exec(`explorer "${WORKSPACE_DIR}"`)
      } else if (platform === 'darwin') {
        exec(`open "${WORKSPACE_DIR}"`)
      } else {
        exec(`xdg-open "${WORKSPACE_DIR}"`)
      }
    } catch (error) {
      loggerError(`无法打开工作区文件夹: ${error}`, LOG_SOURCE)
    }
  }

  /**
   * 获取 OpenClaw 安装信息
   */
  getClawInstallInfo(): InstallInfo {
    try {
      const packageJsonPath = path.join(AGENT_DIR, 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

      return {
        version: packageJson.dependencies?.openclaw || 'unknown',
        path: AGENT_DIR,
        nodeModulesPath: path.join(AGENT_DIR, 'node_modules'),
        exists: fs.existsSync(packageJsonPath)
      }
    } catch (error) {
      return {
        version: 'unknown',
        path: AGENT_DIR,
        nodeModulesPath: path.join(AGENT_DIR, 'node_modules'),
        exists: false
      }
    }
  }
}

// 导出单例访问方法
export const getSandboxEnvService = (): SandboxEnvService =>
  SandboxEnvService.getInstance() as SandboxEnvService

export default SandboxEnvService
