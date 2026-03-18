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

export function InstallPage({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

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
    <div className='flex items-center justify-center h-screen w-full bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30 overflow-hidden relative'>
      <div
        className='h-8 flex items-center justify-between shrink-0 bg-zinc-900 border-b border-zinc-800 select-none z-50'
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
        <div className='flex-1 flex justify-center items-center pointer-events-none text-xs font-semibold text-zinc-400 tracking-wide'>
          Shrimps Desktop
        </div>
      </div>
      {/* Background Ambient Glow */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none' />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className='w-full max-w-lg bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col z-10'
      >
        {/* Window Header */}
        <div className='h-12 border-b border-zinc-800/60 flex items-center px-4 bg-zinc-900/50 shrink-0'>
          <div className='flex gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-zinc-700 hover:bg-red-500 transition-colors' />
            <div className='w-3 h-3 rounded-full bg-zinc-700 hover:bg-yellow-500 transition-colors' />
            <div className='w-3 h-3 rounded-full bg-zinc-700 hover:bg-green-500 transition-colors' />
          </div>
          <div className='flex-1 text-center text-xs font-medium text-zinc-500 tracking-wide'>
            OpenClaw Setup
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
                  ? 'bg-green-500 shadow-green-900/20'
                  : 'bg-orange-600 shadow-orange-900/20'
              )}
            >
              {isComplete ? (
                <CheckCircle2 className='w-8 h-8 text-white' />
              ) : (
                <img src={logoImage} className='w-8 h-8'></img>
              )}
            </div>
            <div>
              <h2 className='text-xl font-bold text-zinc-100 tracking-tight'>
                {isComplete ? 'Ready to go' : 'Installing OpenClaw...'}
              </h2>
              <p className='text-sm text-zinc-400 mt-1'>
                {isComplete
                  ? 'Your local AI environment is configured.'
                  : 'Setting up the local environment and downloading models.'}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className='space-y-2 mt-2'>
            <div className='flex justify-between text-xs font-medium'>
              <span
                className={clsx(
                  isComplete ? 'text-green-400' : 'text-orange-400'
                )}
              >
                {isComplete ? 'Completed' : 'In Progress'}
              </span>
              <span className='text-zinc-500 font-mono'>
                {Math.floor(progress)}%
              </span>
            </div>
            <div className='h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50 shadow-inner'>
              <motion.div
                className={clsx(
                  'h-full rounded-full transition-colors duration-500',
                  isComplete
                    ? 'bg-green-500'
                    : 'bg-gradient-to-r from-orange-600 to-orange-400'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Terminal Logs */}
          <div className='bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 h-36 overflow-y-auto flex flex-col gap-1.5 font-mono text-[11px] leading-relaxed shadow-inner scrollbar-thin scrollbar-thumb-zinc-800'>
            <div className='flex items-center gap-2 text-zinc-500 mb-1 border-b border-zinc-800/50 pb-2'>
              <TerminalIcon className='w-3.5 h-3.5' />
              <span>Setup Log</span>
            </div>
            {logs.map((log, index) => (
              <div key={index} className='flex gap-2'>
                <span className='text-zinc-600 select-none shrink-0'>{`>`}</span>
                <span
                  className={clsx(
                    'break-all',
                    index === logs.length - 1 && !isComplete
                      ? 'text-orange-300 animate-pulse'
                      : 'text-zinc-400'
                  )}
                >
                  {log}
                </span>
              </div>
            ))}
            {!isComplete && (
              <div className='flex gap-2 text-zinc-600 shrink-0'>
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
