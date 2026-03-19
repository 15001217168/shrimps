import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode
} from 'react'

// ==================== 类型定义 ====================

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system'

/** 主题上下文值 */
export interface ThemeContextValue {
  /** 当前主题模式 */
  readonly theme: ThemeMode
  /** 实际应用的主题（解析 system 后） */
  readonly resolvedTheme: 'light' | 'dark'
  /** 设置主题 */
  setTheme: (theme: ThemeMode) => void
  /** 保存主题到本地存储 */
  saveTheme: () => Promise<boolean>
  /** 切换主题（light <-> dark） */
  toggleTheme: () => void
}

// ==================== Context 创建 ====================

export const ThemeContext = createContext<ThemeContextValue | null>(null)

// ==================== 工具函数 ====================

/**
 * 获取系统主题偏好
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * 应用主题到 DOM
 */
const applyThemeToDom = (theme: 'light' | 'dark'): void => {
  const root = document.documentElement

  // 移除旧的主题类
  root.classList.remove('light', 'dark')

  // 添加新的主题类
  root.classList.add(theme)

  // 设置 data-theme 属性
  root.setAttribute('data-theme', theme)

  // 更新 meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme === 'dark' ? '#09090b' : '#ffffff'
    )
  }
}

// ==================== Provider 组件 ====================

interface ThemeProviderProps {
  readonly children: ReactNode
  /** 默认主题 */
  readonly defaultTheme?: ThemeMode
  /** 是否在初始化时从存储加载主题 */
  readonly loadFromStorage?: boolean
}

/**
 * 主题上下文 Provider
 * 管理全局主题状态和应用主题到 DOM
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  loadFromStorage = true
}: ThemeProviderProps): ReactNode {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  /**
   * 解析并应用主题
   */
  const resolveAndApplyTheme = useCallback((themeMode: ThemeMode): void => {
    const resolved = themeMode === 'system' ? getSystemTheme() : themeMode
    setResolvedTheme(resolved)
    applyThemeToDom(resolved)
  }, [])

  /**
   * 设置主题（立即应用但不保存）
   */
  const setTheme = useCallback(
    (newTheme: ThemeMode): void => {
      setThemeState(newTheme)
      resolveAndApplyTheme(newTheme)
    },
    [resolveAndApplyTheme]
  )

  /**
   * 保存主题到本地存储
   */
  const saveTheme = useCallback(async (): Promise<boolean> => {
    try {
      const result = await window.ipcRenderer.invoke('storage:set-theme', theme)
      return result?.success ?? false
    } catch (error) {
      console.error('[ThemeContext] 保存主题失败:', error)
      return false
    }
  }, [theme])

  /**
   * 切换主题（light <-> dark，忽略 system）
   */
  const toggleTheme = useCallback((): void => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  /**
   * 初始化：从本地存储加载主题
   */
  useEffect(() => {
    if (!loadFromStorage) {
      resolveAndApplyTheme(defaultTheme)
      return
    }

    const loadTheme = async (): Promise<void> => {
      try {
        const result = await window.ipcRenderer.invoke('storage:get-theme')
        if (result?.success && result?.data) {
          const savedTheme = result.data as ThemeMode
          setThemeState(savedTheme)
          resolveAndApplyTheme(savedTheme)
        } else {
          resolveAndApplyTheme(defaultTheme)
        }
      } catch (error) {
        console.error('[ThemeContext] 加载主题失败:', error)
        resolveAndApplyTheme(defaultTheme)
      }
    }

    loadTheme()
  }, [loadFromStorage, defaultTheme, resolveAndApplyTheme])

  /**
   * 监听系统主题变化（当主题设置为 system 时）
   */
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (): void => {
      resolveAndApplyTheme('system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, resolveAndApplyTheme])

  // ==================== Context 值 ====================

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      saveTheme,
      toggleTheme
    }),
    [theme, resolvedTheme, setTheme, saveTheme, toggleTheme]
  )

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  )
}

export default ThemeProvider
