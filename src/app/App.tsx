import { RouterProvider } from 'react-router'
import { useState } from 'react'
import { router } from './routes'
import { InstallPage } from './pages/InstallPage'
import { Toaster } from 'sonner'
import {
  ConfigProvider,
  ConnectProvider,
  ThemeProvider,
  LanguageProvider,
  useResolvedTheme
} from './context'

// 导入 i18n 配置（必须在应用启动时导入）
import './i18n'

/**
 * Toaster 组件，根据主题自动切换
 */
function ThemedToaster() {
  const resolvedTheme = useResolvedTheme()

  return (
    <Toaster
      theme={resolvedTheme}
      position='bottom-right'
      toastOptions={{
        className: 'bg-card border-border text-card-foreground'
      }}
    />
  )
}

/**
 * 主应用组件
 */
function MainApp() {
  const [isInstalled, setIsInstalled] = useState(false)

  const handleComplete = () => {
    setIsInstalled(true)
  }

  if (!isInstalled) {
    return <InstallPage onComplete={handleComplete} />
  }

  return (
    <>
      <RouterProvider router={router} />
      <ThemedToaster />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ConfigProvider>
          <ConnectProvider>
            <MainApp />
          </ConnectProvider>
        </ConfigProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
