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
   */
  static getInstance<T extends BaseService>(this: { new (): T; name: string }): T {
    const className = this.name
    if (!serviceInstances.has(className)) {
      serviceInstances.set(className, new this())
    }
    return serviceInstances.get(className) as T
  }

  /**
   * 重置单例实例（用于测试）
   */
  static resetInstance<T extends BaseService>(this: { new (): T; name: string }): void {
    const className = this.name
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
