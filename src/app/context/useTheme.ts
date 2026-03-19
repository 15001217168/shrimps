import { useContext } from 'react'
import { ThemeContext } from './ThemeContext'
import type { ThemeContextValue, ThemeMode } from './ThemeContext'

/**
 * 获取主题上下文
 * @throws 如果在 ThemeProvider 外部使用会抛出错误
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

/**
 * 获取当前主题模式（不抛出错误）
 */
export function useThemeMode(): ThemeMode {
  const context = useContext(ThemeContext)
  return context?.theme ?? 'dark'
}

/**
 * 获取解析后的主题（light 或 dark）
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const context = useContext(ThemeContext)
  return context?.resolvedTheme ?? 'dark'
}

/**
 * 检查是否为暗色主题
 */
export function useIsDark(): boolean {
  const context = useContext(ThemeContext)
  return context?.resolvedTheme === 'dark'
}
