import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageContext } from './LanguageContext'
import type { LanguageContextValue, Language } from './LanguageContext'

/**
 * 获取语言上下文
 * @throws 如果在 LanguageProvider 外部使用会抛出错误
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }

  return context
}

/**
 * 获取当前语言（不抛出错误）
 */
export function useCurrentLanguage(): Language {
  const context = useContext(LanguageContext)
  return context?.language ?? 'en'
}

/**
 * 获取 t 函数（简化的翻译 hook）
 */
export function useTranslationHook(): ReturnType<typeof useTranslation>['t'] {
  const { t } = useTranslation()
  return t
}

/**
 * 检查当前是否为中文
 */
export function useIsChinese(): boolean {
  const context = useContext(LanguageContext)
  return context?.language === 'zh'
}

/**
 * 检查当前是否为英文
 */
export function useIsEnglish(): boolean {
  const context = useContext(LanguageContext)
  return context?.language === 'en'
}
