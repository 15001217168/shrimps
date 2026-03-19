import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode
} from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'

// ==================== 类型定义 ====================

/** 支持的语言 */
export type Language = 'en' | 'zh'

/** 语言上下文值 */
export interface LanguageContextValue {
  /** 当前语言 */
  readonly language: Language
  /** 设置语言 */
  setLanguage: (language: Language) => void
  /** 保存语言到本地存储 */
  saveLanguage: () => Promise<boolean>
  /** i18n 实例 */
  readonly i18n: typeof i18n
  /** t 函数 */
  readonly t: ReturnType<typeof useTranslation>['t']
}

// ==================== Context 创建 ====================

export const LanguageContext = createContext<LanguageContextValue | null>(null)

// ==================== 工具函数 ====================

/**
 * 获取默认语言
 */
const getDefaultLanguage = (): Language => {
  // 从 localStorage 获取
  const stored = localStorage.getItem('language')
  if (stored === 'en' || stored === 'zh') {
    return stored
  }

  // 从浏览器语言检测
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }

  return 'en'
}

// ==================== Provider 组件 ====================

interface LanguageProviderProps {
  readonly children: ReactNode
  /** 默认语言 */
  readonly defaultLanguage?: Language
  /** 是否在初始化时从存储加载语言 */
  readonly loadFromStorage?: boolean
}

/**
 * 语言上下文 Provider
 * 管理全局语言状态和 i18n 实例
 */
export function LanguageProvider({
  children,
  defaultLanguage,
  loadFromStorage = true
}: LanguageProviderProps): ReactNode {
  const { t } = useTranslation()
  const [language, setLanguageState] = useState<Language>(
    defaultLanguage ?? (loadFromStorage ? getDefaultLanguage() : 'en')
  )

  /**
   * 设置语言（立即应用但不保存）
   */
  const setLanguage = useCallback((newLanguage: Language): void => {
    setLanguageState(newLanguage)
    i18n.changeLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
  }, [])

  /**
   * 保存语言到本地存储
   * 注意：语言已经通过 localStorage 自动保存
   */
  const saveLanguage = useCallback(async (): Promise<boolean> => {
    try {
      // 通过 IPC 保存到持久化存储
      const result = await window.ipcRenderer?.invoke('storage:set-language', language)
      return result?.success ?? true
    } catch (error) {
      // IPC 不可用时，localStorage 已经保存了，返回 true
      console.debug('[LanguageContext] IPC 保存语言跳过:', error)
      return true
    }
  }, [language])

  /**
   * 初始化：从本地存储加载语言
   */
  useEffect(() => {
    if (!loadFromStorage) {
      i18n.changeLanguage(defaultLanguage ?? 'en')
      return
    }

    const loadLanguage = async (): Promise<void> => {
      try {
        const result = await window.ipcRenderer.invoke('storage:get-language')
        if (result?.success && result?.data) {
          const savedLanguage = result.data as Language
          setLanguageState(savedLanguage)
          i18n.changeLanguage(savedLanguage)
        } else {
          // 使用检测到的默认语言
          const detected = getDefaultLanguage()
          i18n.changeLanguage(detected)
        }
      } catch (error) {
        console.error('[LanguageContext] 加载语言失败:', error)
        const detected = getDefaultLanguage()
        i18n.changeLanguage(detected)
      }
    }

    loadLanguage()
  }, [loadFromStorage, defaultLanguage])

  // ==================== Context 值 ====================

  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      saveLanguage,
      i18n,
      t
    }),
    [language, setLanguage, saveLanguage, t]
  )

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export default LanguageProvider
