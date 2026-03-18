import { RouterProvider } from 'react-router'
import { useState, useEffect } from 'react'
import { router } from './routes'
import { InstallPage } from './pages/InstallPage'
import { Toaster } from 'sonner'
import { ConfigProvider, ConnectProvider } from './context'

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
      <Toaster
        theme='dark'
        position='bottom-right'
        toastOptions={{
          className: 'bg-zinc-900 border-zinc-800 text-zinc-200'
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <ConfigProvider>
      <ConnectProvider>
        <MainApp />
      </ConnectProvider>
    </ConfigProvider>
  )
}
