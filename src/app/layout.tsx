import { Outlet, NavLink, useLocation } from 'react-router'
import {
  MessageSquare,
  Settings,
  Compass,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Search,
  Zap,
  Blocks,
  Users,
  Code,
  Image as ImageIcon,
  FileText,
  Settings2,
  Workflow,
  Network
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Modal } from './components/Modal'
import logoImage from '@/app/assets/logo.png'
import { useLanguage, useConfigData, useConnectionState } from './context'

export function DesktopLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [baseUrl, setBaseUrl] = useState('')
  const [statusColor, setStatusColor] = useState('bg-red-500')
  const { t } = useLanguage()

  const configData = useConfigData()
  const connectionState = useConnectionState()

  console.log('[LayoutPage] 配置文件:', configData, connectionState)

  useEffect(() => {
    if (configData) {
      const { gateway } = configData
      if (gateway) {
        const { baseUrl } = gateway
        setBaseUrl(baseUrl)
      }
    }

    if (connectionState == 'connected') {
      setStatusColor('bg-green-500')
    } else {
      setStatusColor('bg-red-500')
    }
  }, [connectionState, configData])

  return (
    <div className='flex flex-col h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30'>
      {/* Electron Title Bar */}
      <div
        className='h-8 flex items-center justify-between shrink-0 bg-card border-b border-border select-none z-50'
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Title */}
        <div className='flex-1 flex justify-center items-center pointer-events-none text-xs font-semibold text-muted-foreground tracking-wide'>
          {t('app.title')}
        </div>
      </div>

      <div className='flex flex-1 overflow-hidden relative'>
        {/* Sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className='h-full bg-card border-r border-border flex flex-col flex-shrink-0 relative z-20 overflow-hidden'
            >
              {/* Header: OpenClaw Logo */}
              <div className='h-14 flex items-center px-4 shrink-0'>
                <div className='flex items-center gap-2'>
                  <div className='w-6 h-6 rounded-md bg-primary flex items-center justify-center'>
                    <img src={logoImage} className='w-4 h-4 fill-current'></img>
                  </div>
                  <span className='font-semibold text-foreground tracking-tight'>
                    OpenClaw
                  </span>
                </div>
              </div>

              {/* Clear Context Button */}
              <div className='px-3 py-2 shrink-0'>
                <button
                  onClick={() => toast.success(t('layout.contextCleared'))}
                  className='w-full flex items-center justify-between bg-secondary hover:bg-secondary/80 transition-colors px-3 py-2.5 rounded-lg text-sm font-medium border border-border group shadow-sm'
                >
                  <div className='flex items-center gap-2'>
                    <Trash2 className='w-4 h-4 text-muted-foreground group-hover:text-foreground' />
                    <span>{t('sidebar.clearContext')}</span>
                  </div>
                  <span className='text-xs text-muted-foreground font-mono tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity'>
                    ⌘K
                  </span>
                </button>
              </div>

              {/* Main Nav Links */}
              <div className='px-3 py-2 flex flex-col gap-1 shrink-0 border-b border-border pb-3 mb-1'>
                <NavItem
                  to='/'
                  icon={<MessageSquare className='w-4 h-4' />}
                  label={t('sidebar.chat')}
                />
                <NavItem
                  to='/explore'
                  icon={<Compass className='w-4 h-4' />}
                  label={t('sidebar.exploreModels')}
                />
                <NavItem
                  to='/skills'
                  icon={<Blocks className='w-4 h-4' />}
                  label={t('sidebar.skills')}
                />
                <NavItem
                  to='/agents'
                  icon={<Users className='w-4 h-4' />}
                  label={t('sidebar.agents')}
                />
                <NavItem
                  to='/workflows'
                  icon={<Network className='w-4 h-4' />}
                  label={t('sidebar.workflows')}
                />
                <NavItem
                  to='/tasks'
                  icon={<Workflow className='w-4 h-4' />}
                  label={t('sidebar.tasks')}
                />
              </div>

              {/* Quick Skills Section */}
              <div className='flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-scrollbar-thumb'>
                <div className='text-[11px] font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider'>
                  {t('sidebar.quickSkills')}
                </div>
                <div className='flex flex-col gap-0.5'>
                  <QuickSkillItem
                    id='web-search'
                    icon={<Search className='w-4 h-4 text-blue-400' />}
                    title={t('quickSkills.webSearch')}
                    onToast={(id) =>
                      toast(t('layout.skillInitialized', { id }))
                    }
                  />
                  <QuickSkillItem
                    id='code-exec'
                    icon={<Code className='w-4 h-4 text-green-400' />}
                    title={t('quickSkills.codeExecution')}
                    onToast={(id) =>
                      toast(t('layout.skillInitialized', { id }))
                    }
                  />
                  <QuickSkillItem
                    id='image-gen'
                    icon={<ImageIcon className='w-4 h-4 text-purple-400' />}
                    title={t('quickSkills.imageGeneration')}
                    onToast={(id) =>
                      toast(t('layout.skillInitialized', { id }))
                    }
                  />
                  <QuickSkillItem
                    id='doc-read'
                    icon={<FileText className='w-4 h-4 text-rose-400' />}
                    title={t('quickSkills.docReader')}
                    onToast={(id) =>
                      toast(t('layout.skillInitialized', { id }))
                    }
                  />
                </div>
              </div>

              {/* Bottom Settings */}
              <div className='p-3 border-t border-border shrink-0 flex flex-col gap-1'>
                <NavItem
                  to='/settings'
                  icon={<Settings className='w-4 h-4' />}
                  label={t('common.settings')}
                />
                <button className='w-full flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors mt-2'>
                  <div className='w-6 h-6 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold shadow-inner border border-white/10'>
                    HV
                  </div>
                  <span className='flex-1 text-left truncate'>
                    Helper Virus
                  </span>
                  {/* <MoreHorizontal className='w-4 h-4 opacity-50' /> */}
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className='flex-1 flex flex-col min-w-0 bg-background relative z-10'>
          {/* Top Window Bar */}
          <header className='h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/80 backdrop-blur-md z-30'>
            <div className='flex items-center gap-2'>
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className='p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors mr-2'
                  title={t('layout.openSidebar')}
                >
                  <PanelLeft className='w-5 h-5' />
                </button>
              )}
              {sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className='p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors mr-2'
                  title={t('layout.closeSidebar')}
                >
                  <PanelLeftClose className='w-5 h-5' />
                </button>
              )}
            </div>

            <div className='flex-1 flex justify-center'>
              {/* Context/Title managed by pages if needed */}
            </div>

            <div className='flex items-center gap-3'>
              {/* OpenClaw Global Status */}
              <div className='flex items-center gap-2 bg-card border border-border px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground shadow-inner group cursor-default hidden sm:flex'>
                <div className='flex items-center gap-1.5'>
                  <div
                    className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}
                  />
                  <span className='group-hover:text-foreground transition-colors'>
                    {baseUrl}
                  </span>
                </div>
                {/* <div className='w-px h-3 bg-border mx-1'></div>
                <div className='flex items-center gap-1 group-hover:text-foreground transition-colors'>
                  <span className='text-muted-foreground font-mono'>
                    {t('status.ram')}
                  </span>
                  <span>4.1GB</span>
                </div> */}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className='flex-1 relative overflow-hidden'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({
  to,
  icon,
  label
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <NavLink
      to={to}
      className={clsx(
        'flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors relative overflow-hidden group',
        isActive
          ? 'bg-secondary text-foreground border border-border shadow-sm'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground border border-transparent'
      )}
    >
      {icon}
      <span>{label}</span>
      {isActive && (
        <motion.div
          layoutId='navIndicator'
          className='absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-r-md'
        />
      )}
    </NavLink>
  )
}

function QuickSkillItem({
  icon,
  title,
  id,
  onToast
}: {
  icon: React.ReactNode
  title: string
  id: string
  onToast: (id: string) => void
}) {
  return (
    <button
      onClick={() => onToast(id)}
      className='w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors group'
    >
      <div className='p-1 rounded bg-background/50 border border-border group-hover:border-border-hover transition-colors shadow-sm'>
        {icon}
      </div>
      <span>{title}</span>
    </button>
  )
}
