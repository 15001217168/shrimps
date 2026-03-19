import { useState, useEffect, useRef } from 'react'
import {
  Zap,
  CheckCircle2,
  Loader2,
  Terminal as TerminalIcon
} from 'lucide-react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import logoImage from '@/app/assets/logo.png'
import { useLanguage } from '../context'

export function InstallPage({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  // Simulate progress loading
  useEffect(() => {
    console.log('挂载成功')

    window.ipcRenderer.invoke('launcher:initialize').then((res: any) => {
      console.log('launcher:initialize', res)
      if (res.success == true) {
        window.ipcRenderer.invoke('launcher:start-claw').then((res) => {
          console.log('launcher:start-claw', res)

          if (res.success == true) {
            // 连接 OpenClaw WebSocket
            window.ipcRenderer
              .invoke('config:get-settings')
              .then((response) => {
                if (response?.success && response?.data?.gateway?.baseUrl) {
                  const wsUrl = response.data.gateway.baseUrl
                    .replace('http://', 'ws://')
                    .replace('https://', 'wss://')
                  return window.ipcRenderer.invoke('openclaw-ws:connect', wsUrl)
                }
              })
              .then(() => {
                console.log('[App] OpenClaw WebSocket 已连接')
              })
              .catch((error) => {
                console.error('[App] 连接 OpenClaw WebSocket 失败:', error)
              })
          }
        })
      }
    })

    window.ipcRenderer.on('launcher:progress', (event: any, arg: any) => {
      if (arg) {
        const { progress } = arg

        console.log('launcher:progress', progress)
        setProgress(progress)
      }
    })

    window.ipcRenderer.on('logger:console-log', (event: any, arg: any) => {
      console.log('logger:console-log', event, arg)

      if (arg) {
        const { content } = arg
        setLogs((current) => [...current, content])
      }
    })
  }, [])

  // Update logs based on progress threshold
  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => {
        onComplete()
      }, 1200)
      return () => clearTimeout(timeout)
    }
  }, [progress, onComplete])

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const isComplete = progress >= 100

  return (
    <div className='flex items-center justify-center h-screen w-full bg-background text-foreground font-sans selection:bg-primary/30 overflow-hidden relative'>
      <div
        className='h-8 flex items-center justify-between shrink-0 bg-card border-b border-border select-none z-50'
        style={
          {
            WebkitAppRegion: 'drag',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%'
          } as React.CSSProperties
        }
      >
        {/* Title */}
        <div className='flex-1 flex justify-center items-center pointer-events-none text-xs font-semibold text-muted-foreground tracking-wide'>
          {t('app.title')}
        </div>
      </div>
      {/* Background Ambient Glow */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none' />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className='w-full max-w-lg bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col z-10'
      >
        {/* Window Header */}
        <div className='h-12 border-b border-border/60 flex items-center px-4 bg-card/50 shrink-0'>
          <div className='flex gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-muted hover:bg-destructive transition-colors' />
            <div className='w-3 h-3 rounded-full bg-muted hover:bg-warning transition-colors' />
            <div className='w-3 h-3 rounded-full bg-muted hover:bg-success transition-colors' />
          </div>
          <div className='flex-1 text-center text-xs font-medium text-muted-foreground tracking-wide'>
            {t('app.setup')}
          </div>
          <div className='w-10' /> {/* Balance for absolute centering */}
        </div>

        {/* Content Area */}
        <div className='p-8 flex flex-col gap-6'>
          {/* Logo and Title */}
          <div className='flex flex-col items-center gap-4 text-center'>
            <div
              className={clsx(
                'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-500 shadow-inner',
                isComplete
                  ? 'bg-success shadow-success/20'
                  : 'bg-primary shadow-primary/20'
              )}
            >
              {isComplete ? (
                <CheckCircle2 className='w-8 h-8 text-success-foreground' />
              ) : (
                <img src={logoImage} className='w-8 h-8'></img>
              )}
            </div>
            <div>
              <h2 className='text-xl font-bold text-foreground tracking-tight'>
                {isComplete ? t('install.titleComplete') : t('install.title')}
              </h2>
              <p className='text-sm text-muted-foreground mt-1'>
                {isComplete
                  ? t('install.descriptionComplete')
                  : t('install.description')}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className='space-y-2 mt-2'>
            <div className='flex justify-between text-xs font-medium'>
              <span
                className={clsx(
                  isComplete ? 'text-success' : 'text-primary'
                )}
              >
                {isComplete ? t('install.completed') : t('install.inProgress')}
              </span>
              <span className='text-muted-foreground font-mono'>
                {Math.floor(progress)}%
              </span>
            </div>
            <div className='h-2 w-full bg-background rounded-full overflow-hidden border border-border/50 shadow-inner'>
              <motion.div
                className={clsx(
                  'h-full rounded-full transition-colors duration-500',
                  isComplete
                    ? 'bg-success'
                    : 'bg-gradient-to-r from-primary to-primary-hover'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Terminal Logs */}
          <div className='bg-background border border-border/80 rounded-xl p-4 h-36 overflow-y-auto flex flex-col gap-1.5 font-mono text-[11px] leading-relaxed shadow-inner scrollbar-thin scrollbar-thumb-scrollbar-thumb'>
            <div className='flex items-center gap-2 text-muted-foreground mb-1 border-b border-border/50 pb-2'>
              <TerminalIcon className='w-3.5 h-3.5' />
              <span>{t('install.setupLog')}</span>
            </div>
            {logs.map((log, index) => (
              <div key={index} className='flex gap-2'>
                <span className='text-muted-foreground/50 select-none shrink-0'>{`>`}</span>
                <span
                  className={clsx(
                    'break-all',
                    index === logs.length - 1 && !isComplete
                      ? 'text-primary animate-pulse'
                      : 'text-muted-foreground'
                  )}
                >
                  {log}
                </span>
              </div>
            ))}
            {!isComplete && (
              <div className='flex gap-2 text-muted-foreground/50 shrink-0'>
                <span>{`>`}</span>
                <Loader2 className='w-3 h-3 animate-spin mt-0.5' />
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
