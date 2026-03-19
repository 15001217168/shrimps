/**
 * 服务基类
 * 提供统一的单例模式实现
 */

// 单例实例存储
const serviceInstances: Map<string, any> = new Map()

/**
 * 服务基类
 * 提供统一的单例模式实现
 */
export abstract class BaseService {
  /**
   * 获取单例实例
   * 使用 any 类型绕过 TypeScript 构造函数可见性检查
   */
  static getInstance(): any {
    const className = (this as any).name
    if (!serviceInstances.has(className)) {
      serviceInstances.set(className, new (this as any)())
    }
    return serviceInstances.get(className)
  }

  /**
   * 重置单例实例（用于测试）
   */
  static resetInstance(): void {
    const className = (this as any).name
    serviceInstances.delete(className)
  }

  /**
   * 清除所有实例（用于测试）
   */
  static clearAllInstances(): void {
    serviceInstances.clear()
  }
}

export default BaseService
