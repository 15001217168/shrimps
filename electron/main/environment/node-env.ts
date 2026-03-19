import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import * as tar from 'tar'
import extractZip from 'extract-zip'
import axios from 'axios'
import { createWriteStream } from 'fs'
import { BaseService } from '../utils/base-service'
import {
  loggerInfo,
  loggerSuccess,
  loggerWarning,
  loggerError
} from '../utils/logger'
import type { SandboxEnvService } from './sandbox-env'

const LOG_SOURCE = 'node_env'

// 定义基础配置
const NODE_VERSION_INTERNAL = 'v22.16.0' // OpenClaw 需要的 Node 版本
const LAUNCHER_DIR_INTERNAL = path.join(os.homedir(), '.openclaw-launcher')
const NODE_DIR_INTERNAL = path.join(
  LAUNCHER_DIR_INTERNAL,
  `node-${NODE_VERSION_INTERNAL}`
)

// 导出常量供沙箱使用
export const NODE_VERSION = NODE_VERSION_INTERNAL
export const LAUNCHER_DIR = LAUNCHER_DIR_INTERNAL
export const NODE_DIR = NODE_DIR_INTERNAL

// 最大重试次数
const MAX_RETRY_COUNT = 3
// 重试延迟（毫秒）
const RETRY_DELAY = 2000

/**
 * Node.js 环境管理服务
 * 负责下载、安装和管理便携版 Node.js
 */
export class NodeEnvService extends BaseService {
  private sandboxEnvService: SandboxEnvService | null = null

  /**
   * 设置沙箱环境服务依赖
   */
  setSandboxEnvService(service: SandboxEnvService): void {
    this.sandboxEnvService = service
  }

  /**
   * 步骤 1：生成对应系统的 Node.js 下载链接 (使用国内 npmmirror 镜像加速)
   */
  getNodeDownloadInfo(): {
    downloadUrl: string
    destPath: string
    fileName: string
    platform: string
  } {
    const platform = os.platform() // 'win32', 'darwin', 'linux'
    const arch = os.arch() // 'x64', 'arm64'

    let osName = platform === 'win32' ? 'win' : platform
    const ext = platform === 'win32' ? 'zip' : 'tar.gz'

    // 拼接包名，例如: node-v22.14.0-darwin-arm64.tar.gz
    const fileName = `node-${NODE_VERSION}-${osName}-${arch}.${ext}`
    // 使用淘宝镜像源，小白下载速度可以拉满
    const downloadUrl = `https://npmmirror.com/mirrors/node/${NODE_VERSION}/${fileName}`
    const destPath = path.join(LAUNCHER_DIR, fileName)

    loggerInfo(
      `getNodeDownloadInfo: ${destPath}, ${downloadUrl}, ${fileName}, ${platform}`,
      LOG_SOURCE
    )

    return { downloadUrl, destPath, fileName, platform }
  }

  /**
   * 步骤 2：静默下载 Node.js 便携版 (使用 axios 处理重定向)
   */
  async downloadNodeBinary(url: string, dest: string): Promise<string> {
    if (!fs.existsSync(LAUNCHER_DIR)) {
      fs.mkdirSync(LAUNCHER_DIR, { recursive: true })
    }

    loggerInfo(`开始下载 Node.js 便携版: ${url}`, LOG_SOURCE)

    const writer = createWriteStream(dest)

    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        maxRedirects: 5, // 支持最多5次重定向
        timeout: 300000 // 5分钟超时
      })

      const totalBytes = parseInt(
        response.headers['content-length'] || '0',
        10
      )
      let downloadedBytes = 0

      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length
        const percent =
          totalBytes > 0
            ? ((downloadedBytes / totalBytes) * 100).toFixed(1)
            : '0'
        loggerInfo(`下载进度: ${percent}%`, LOG_SOURCE)
      })

      response.data.pipe(writer)

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => {
          loggerSuccess('下载完成！', LOG_SOURCE)
          resolve()
        })
        writer.on('error', reject)
        response.data.on('error', reject)
      })

      return dest
    } catch (error) {
      // 清理部分下载的文件
      if (fs.existsSync(dest)) {
        fs.unlink(dest, () => {})
      }
      throw new Error(`下载失败: ${error}`)
    }
  }

  /**
   * 步骤 3：解压文件到指定隐藏目录
   */
  async extractNode(archivePath: string, platform: string): Promise<boolean> {
    loggerInfo('正在解压运行环境...', LOG_SOURCE)
    try {
      const osName = platform === 'win32' ? 'win' : platform

      // 先解压到临时目录
      if (platform === 'win32') {
        await extractZip(archivePath, { dir: LAUNCHER_DIR })
      } else {
        await tar.x({ file: archivePath, cwd: LAUNCHER_DIR, strip: 0 })
      }

      // Node.js 压缩包解压后会创建一个包含版本号的文件夹（如 node-v22.14.0-darwin-arm64）
      // 需要将该文件夹重命名为我们期望的 NODE_DIR
      const extractedDir = path.join(
        LAUNCHER_DIR,
        `node-${NODE_VERSION}-${osName}-${os.arch()}`
      )

      if (fs.existsSync(extractedDir) && !fs.existsSync(NODE_DIR)) {
        // 重命名解压后的目录
        fs.renameSync(extractedDir, NODE_DIR)
      }

      // 解压完可以把压缩包删了省空间
      fs.unlinkSync(archivePath)
      loggerSuccess(`环境解压部署完毕！路径: ${NODE_DIR}`, LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`解压失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 步骤 4：核心魔法 - 组装"劫持"后的环境变量
   */
  getIsolatedEnv(): NodeJS.ProcessEnv {
    const platform = os.platform()
    // Windows 的 node.exe 在根目录，Mac/Linux 的 node 在 bin 目录下
    const binPath =
      platform === 'win32' ? NODE_DIR : path.join(NODE_DIR, 'bin')

    // 将我们自带的 Node 路径强行插到系统 PATH 的最前面！
    // 这样 child_process 执行任何 node 或 npm 命令时，都会优先使用我们的便携版
    const isolatedEnv = Object.assign({}, process.env, {
      PATH: `${binPath}${path.delimiter}${process.env.PATH}`
    })

    return isolatedEnv
  }

  /**
   * 检查 Node.js 便携版是否已安装
   */
  isNodeInstalled(): boolean {
    return fs.existsSync(NODE_DIR)
  }

  /**
   * 获取 Node.js 可执行文件路径
   */
  getNodePath(): string | null {
    const platform = os.platform()
    const nodePath =
      platform === 'win32'
        ? path.join(NODE_DIR, 'node.exe')
        : path.join(NODE_DIR, 'bin', 'node')

    return fs.existsSync(nodePath) ? nodePath : null
  }

  /**
   * 确保便携版 Node.js 环境就绪
   */
  async ensureNodeEnvironment(): Promise<NodeJS.ProcessEnv> {
    if (!this.isNodeInstalled()) {
      const { downloadUrl, destPath, platform } = this.getNodeDownloadInfo()
      await this.downloadNodeBinary(downloadUrl, destPath)
      await this.extractNode(destPath, platform)
    }
    return this.getIsolatedEnv()
  }

  /**
   * 检查 pnpm 是否已在 AGENT_DIR 安装
   */
  isPnpmInstalled(): boolean {
    try {
      if (!this.sandboxEnvService) {
        return false
      }
      const agentDir = this.sandboxEnvService.getPaths().agent
      const pnpmPath = path.join(agentDir, 'node_modules', '.bin', 'pnpm')
      return fs.existsSync(pnpmPath)
    } catch {
      return false
    }
  }

  /**
   * 带重试机制的执行函数
   */
  async runWithRetry<T>(
    fn: () => Promise<T>,
    operationName: string,
    maxRetries: number = MAX_RETRY_COUNT
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        loggerInfo(
          `${operationName} - 第 ${attempt}/${maxRetries} 次尝试`,
          LOG_SOURCE
        )
        const result = await fn()
        if (attempt > 1) {
          loggerSuccess(
            `${operationName} - 第 ${attempt} 次尝试成功`,
            LOG_SOURCE
          )
        }
        return result
      } catch (error: any) {
        lastError = error
        loggerWarning(
          `${operationName} - 第 ${attempt} 次尝试失败: ${error.message}`,
          LOG_SOURCE
        )

        if (attempt < maxRetries) {
          loggerInfo(`等待 ${RETRY_DELAY / 1000} 秒后重试...`, LOG_SOURCE)
          await this.delay(RETRY_DELAY)

          // 尝试修复环境
          await this.attemptFix(operationName, error)
        }
      }
    }

    throw new Error(
      `${operationName} 失败，已重试 ${maxRetries} 次: ${lastError?.message}`
    )
  }

  /**
   * 尝试修复环境问题
   */
  private async attemptFix(operationName: string, error: Error): Promise<void> {
    const errorMessage = error.message.toLowerCase()
    loggerInfo(`[${operationName}] 检测错误类型，尝试自动修复...`, LOG_SOURCE)

    // 网络问题 - 清理缓存后重试
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused')
    ) {
      loggerInfo(
        `[${operationName}] 检测到网络问题，尝试清理缓存...`,
        LOG_SOURCE
      )
      this.cleanupCache()
    }

    // 权限问题
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('eacces')
    ) {
      loggerInfo(`[${operationName}] 检测到权限问题，尝试修复...`, LOG_SOURCE)
      this.fixPermissions()
    }

    // Node 环境损坏
    if (
      errorMessage.includes('node') ||
      errorMessage.includes('npm') ||
      errorMessage.includes('spawn')
    ) {
      loggerInfo(
        `[${operationName}] 检测到 Node 环境可能损坏，尝试验证...`,
        LOG_SOURCE
      )
      const isValid = await this.validateNodeEnvironment()
      if (!isValid) {
        loggerWarning(
          `[${operationName}] Node 环境损坏，尝试重新安装...`,
          LOG_SOURCE
        )
        await this.repairNodeEnvironment()
      }
    }
  }

  /**
   * 清理缓存
   */
  cleanupCache(): void {
    try {
      const cacheDir = path.join(LAUNCHER_DIR_INTERNAL, 'cache')
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true })
        loggerInfo('缓存已清理', LOG_SOURCE)
      }
    } catch (error) {
      loggerError(`清理缓存失败: ${error}`, LOG_SOURCE)
    }
  }

  /**
   * 修复权限问题
   */
  fixPermissions(): void {
    try {
      const platform = os.platform()
      if (platform !== 'win32') {
        // Unix 系统修复权限
        const binDir = path.join(NODE_DIR_INTERNAL, 'bin')
        if (fs.existsSync(binDir)) {
          const files = fs.readdirSync(binDir)
          files.forEach((file) => {
            const filePath = path.join(binDir, file)
            try {
              fs.chmodSync(filePath, 0o755)
            } catch {
              // 忽略单个文件权限错误
            }
          })
          loggerInfo('权限已修复', LOG_SOURCE)
        }
      }
    } catch (error) {
      loggerError(`修复权限失败: ${error}`, LOG_SOURCE)
    }
  }

  /**
   * 验证 Node 环境
   */
  async validateNodeEnvironment(): Promise<boolean> {
    try {
      // 检查 Node 可执行文件
      const nodePath = this.getNodePath()
      if (!nodePath || !fs.existsSync(nodePath)) {
        return false
      }

      // 检查 npm
      const platform = os.platform()
      const npmPath =
        platform === 'win32'
          ? path.join(NODE_DIR_INTERNAL, 'npm.cmd')
          : path.join(NODE_DIR_INTERNAL, 'bin', 'npm')

      if (!fs.existsSync(npmPath)) {
        return false
      }

      // 尝试执行 node -v
      const result = await this.runWithPortableNode('node', ['-v'])
      if (!result || !(result as any).stdout) {
        return false
      }

      loggerSuccess('Node 环境验证通过', LOG_SOURCE)
      return true
    } catch (error) {
      loggerError(`Node 环境验证失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 修复 Node 环境（删除并重新安装）
   */
  async repairNodeEnvironment(): Promise<boolean> {
    loggerInfo('开始修复 Node 环境...', LOG_SOURCE)

    try {
      // 1. 删除损坏的 Node 目录
      if (fs.existsSync(NODE_DIR_INTERNAL)) {
        fs.rmSync(NODE_DIR_INTERNAL, { recursive: true, force: true })
        loggerInfo('已删除损坏的 Node 目录', LOG_SOURCE)
      }

      // 2. 清理临时文件
      this.cleanupTempFiles()

      // 3. 重新下载和安装
      const { downloadUrl, destPath, platform } = this.getNodeDownloadInfo()
      await this.downloadNodeBinary(downloadUrl, destPath)
      await this.extractNode(destPath, platform)

      // 5. 验证
      const isValid = await this.validateNodeEnvironment()
      if (isValid) {
        loggerSuccess('Node 环境修复成功', LOG_SOURCE)
        return true
      } else {
        loggerError('Node 环境修复后验证失败', LOG_SOURCE)
        return false
      }
    } catch (error) {
      loggerError(`修复 Node 环境失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 延迟函数
   */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 使用便携版环境执行命令
   */
  async runWithPortableNode(
    command: string,
    args: string[] = [],
    options: any = {}
  ): Promise<{ stdout: string; stderr: string; code: number | null }> {
    // 确保环境就绪
    const customEnv = await this.ensureNodeEnvironment()

    // 使用修改后的环境变量
    const mergedOptions: any = {
      ...options,
      env: {
        ...customEnv,
        ...options.env
      }
    }

    loggerInfo(
      `正在启动专属环境执行: ${command} ${args.join(' ')}`,
      LOG_SOURCE
    )

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, mergedOptions)

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code })
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`))
        }
      })

      child.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * 测试沙盒环境
   */
  async testNodeEnvironment(): Promise<boolean> {
    try {
      const result = await this.runWithPortableNode('node', ['-v'])
      loggerSuccess(
        `成功运行沙盒 Node.js，当前版本: ${(result as any).stdout.trim()}`,
        LOG_SOURCE
      )
      return true
    } catch (error) {
      loggerError(`测试失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 使用便携版安装包
   */
  async installPackage(
    packageName: string,
    options: any = {}
  ): Promise<{ stdout: string; stderr: string; code: number | null }> {
    const args = ['install', ...(options.flags || []), packageName]
    return this.runWithPortableNode('npm', args, options)
  }

  /**
   * 检查 Node.js 版本是否匹配
   */
  async checkNodeVersion(): Promise<boolean> {
    try {
      const result = await this.runWithPortableNode('node', ['-v'])
      const installedVersion = (result as any).stdout.trim().replace('v', '')
      const requiredVersion = NODE_VERSION.replace('v', '')

      if (installedVersion.startsWith(requiredVersion)) {
        loggerSuccess(`Node.js 版本匹配: ${installedVersion}`, LOG_SOURCE)
        return true
      } else {
        loggerWarning(
          `Node.js 版本不匹配: 安装了 ${installedVersion}, 需要 ${requiredVersion}`,
          LOG_SOURCE
        )
        return false
      }
    } catch (error) {
      loggerError(`检查版本失败: ${error}`, LOG_SOURCE)
      return false
    }
  }

  /**
   * 清理下载的临时文件
   */
  cleanupTempFiles(): void {
    try {
      if (fs.existsSync(LAUNCHER_DIR)) {
        const files = fs.readdirSync(LAUNCHER_DIR)
        files.forEach((file) => {
          if (file.endsWith('.zip') || file.endsWith('.tar.gz')) {
            fs.unlinkSync(path.join(LAUNCHER_DIR, file))
          }
        })
      }
    } catch (error) {
      loggerError(`清理临时文件失败: ${error}`, LOG_SOURCE)
    }
  }
}

// 导出单例访问方法
export const getNodeEnvService = (): NodeEnvService =>
  NodeEnvService.getInstance() as NodeEnvService

export default NodeEnvService
