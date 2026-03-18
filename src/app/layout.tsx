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
  Network,
  Minus,
  Square,
  X
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Modal } from './components/Modal'
import logoImage from '@/app/assets/logo.png'

export function DesktopLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [apiModalOpen, setApiModalOpen] = useState(false)

  return (
    <div className='flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-orange-500/30'>
      {/* Electron Title Bar */}
      <div
        className='h-8 flex items-center justify-between shrink-0 bg-zinc-900 border-b border-zinc-800 select-none z-50'
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Title */}
        <div className='flex-1 flex justify-center items-center pointer-events-none text-xs font-semibold text-zinc-400 tracking-wide'>
          Shrimps Desktop
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
              className='h-full bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0 relative z-20 overflow-hidden'
            >
              {/* Header: OpenClaw Logo */}
              <div className='h-14 flex items-center px-4 shrink-0'>
                <div className='flex items-center gap-2'>
                  <div className='w-6 h-6 rounded-md bg-orange-600 flex items-center justify-center'>
                    <img src={logoImage} className='w-4 h-4 fill-current'></img>
                  </div>
                  <span className='font-semibold text-zinc-100 tracking-tight'>
                    OpenClaw
                  </span>
                </div>
              </div>

              {/* Clear Context Button */}
              <div className='px-3 py-2 shrink-0'>
                <button
                  onClick={() =>
                    toast.success('Chat context cleared. Starting fresh.')
                  }
                  className='w-full flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 transition-colors px-3 py-2.5 rounded-lg text-sm font-medium border border-zinc-700/50 group shadow-sm'
                >
                  <div className='flex items-center gap-2'>
                    <Trash2 className='w-4 h-4 text-zinc-400 group-hover:text-zinc-200' />
                    <span>Clear Context</span>
                  </div>
                  <span className='text-xs text-zinc-500 font-mono tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity'>
                    ⌘K
                  </span>
                </button>
              </div>

              {/* Main Nav Links */}
              <div className='px-3 py-2 flex flex-col gap-1 shrink-0 border-b border-zinc-800/50 pb-3 mb-1'>
                <NavItem
                  to='/'
                  icon={<MessageSquare className='w-4 h-4' />}
                  label='Chat'
                />
                <NavItem
                  to='/explore'
                  icon={<Compass className='w-4 h-4' />}
                  label='Explore Models'
                />
                <NavItem
                  to='/skills'
                  icon={<Blocks className='w-4 h-4' />}
                  label='Skills'
                />
                <NavItem
                  to='/agents'
                  icon={<Users className='w-4 h-4' />}
                  label='Agents'
                />
                <NavItem
                  to='/workflows'
                  icon={<Network className='w-4 h-4' />}
                  label='Workflows'
                />
                <NavItem
                  to='/tasks'
                  icon={<Workflow className='w-4 h-4' />}
                  label='Tasks & Automation'
                />
              </div>

              {/* Quick Skills Section */}
              <div className='flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-zinc-700'>
                <div className='text-[11px] font-semibold text-zinc-500 mb-2 px-2 uppercase tracking-wider'>
                  Quick Skills
                </div>
                <div className='flex flex-col gap-0.5'>
                  <QuickSkillItem
                    id='web-search'
                    icon={<Search className='w-4 h-4 text-blue-400' />}
                    title='Web Search'
                  />
                  <QuickSkillItem
                    id='code-exec'
                    icon={<Code className='w-4 h-4 text-green-400' />}
                    title='Code Execution'
                  />
                  <QuickSkillItem
                    id='image-gen'
                    icon={<ImageIcon className='w-4 h-4 text-purple-400' />}
                    title='Image Generation'
                  />
                  <QuickSkillItem
                    id='doc-read'
                    icon={<FileText className='w-4 h-4 text-rose-400' />}
                    title='Doc Reader'
                  />
                </div>
              </div>

              {/* Bottom Settings */}
              <div className='p-3 border-t border-zinc-800 shrink-0 flex flex-col gap-1'>
                <NavItem
                  to='/settings'
                  icon={<Settings className='w-4 h-4' />}
                  label='Settings'
                />
                <button className='w-full flex items-center gap-2 px-2 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors mt-2'>
                  <div className='w-6 h-6 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold shadow-inner border border-white/10'>
                    JS
                  </div>
                  <span className='flex-1 text-left truncate'>John Smith</span>
                  <MoreHorizontal className='w-4 h-4 opacity-50' />
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className='flex-1 flex flex-col min-w-0 bg-zinc-950 relative z-10'>
          {/* Top Window Bar */}
          <header className='h-14 border-b border-zinc-800/60 flex items-center justify-between px-4 shrink-0 bg-zinc-950/80 backdrop-blur-md z-30'>
            <div className='flex items-center gap-2'>
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className='p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors mr-2'
                  title='Open Sidebar'
                >
                  <PanelLeft className='w-5 h-5' />
                </button>
              )}
              {sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className='p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors mr-2'
                  title='Close Sidebar'
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
              <div className='flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 shadow-inner group cursor-default hidden sm:flex'>
                <div className='flex items-center gap-1.5'>
                  <div className='w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' />
                  <span className='group-hover:text-zinc-200 transition-colors'>
                    Local: 11434
                  </span>
                </div>
                <div className='w-px h-3 bg-zinc-700 mx-1'></div>
                <div className='flex items-center gap-1 group-hover:text-zinc-200 transition-colors'>
                  <span className='text-zinc-500 font-mono'>RAM</span>
                  <span>4.1GB</span>
                </div>
              </div>

              <button
                onClick={() => setApiModalOpen(true)}
                className='p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-zinc-800 rounded-md transition-colors border border-transparent hover:border-orange-500/20'
                title='API Configuration'
              >
                <Settings2 className='w-4 h-4' />
              </button>
            </div>
          </header>

          {/* Page Content */}
          <div className='flex-1 relative overflow-hidden'>
            <Outlet />
          </div>
        </main>
      </div>

      {/* API Configuration Modal */}
      <Modal
        isOpen={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
        title='API Providers & Inference'
        width='md'
      >
        <div className='space-y-6'>
          {/* Local Inference */}
          <div className='space-y-4'>
            <h4 className='text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-2'>
              <Zap className='w-4 h-4 text-orange-400' /> Local Inference
              (Ollama / Llama.cpp)
            </h4>
            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium text-zinc-500 mb-1.5'>
                  Endpoint URL
                </label>
                <input
                  type='text'
                  defaultValue='http://localhost:11434/v1'
                  className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:border-orange-500/50 focus:outline-none transition-colors'
                />
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-zinc-400'>
                  GPU Acceleration (Metal/CUDA)
                </span>
                <label className='relative inline-flex items-center cursor-pointer'>
                  <input
                    type='checkbox'
                    defaultChecked
                    className='sr-only peer'
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Cloud Providers */}
          <div className='space-y-4 pt-2'>
            <h4 className='text-sm font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-2'>
              <Network className='w-4 h-4 text-blue-400' /> Cloud Providers
              (Fallback)
            </h4>

            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium text-zinc-500 mb-1.5'>
                  OpenAI API Key
                </label>
                <input
                  type='password'
                  placeholder='sk-...'
                  className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-blue-500/50 focus:outline-none transition-colors'
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-zinc-500 mb-1.5'>
                  Anthropic API Key
                </label>
                <input
                  type='password'
                  placeholder='sk-ant-...'
                  className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-blue-500/50 focus:outline-none transition-colors'
                />
              </div>
            </div>
          </div>

          <div className='pt-4 flex justify-between gap-3 border-t border-zinc-800/80'>
            <button className='px-4 py-2 text-sm font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition-colors border border-orange-500/20'>
              Test Connection
            </button>
            <div className='flex gap-2'>
              <button
                onClick={() => setApiModalOpen(false)}
                className='px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success('API configurations saved successfully.')
                  setApiModalOpen(false)
                }}
                className='px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-sm font-semibold transition-colors shadow-sm'
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </Modal>
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
          ? 'bg-zinc-800/80 text-zinc-100 border border-zinc-700/50 shadow-sm'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
      )}
    >
      {icon}
      <span>{label}</span>
      {isActive && (
        <motion.div
          layoutId='navIndicator'
          className='absolute left-0 top-1 bottom-1 w-1 bg-orange-500 rounded-r-md'
        />
      )}
    </NavLink>
  )
}

function QuickSkillItem({
  icon,
  title,
  id
}: {
  icon: React.ReactNode
  title: string
  id: string
}) {
  return (
    <button
      onClick={() => toast(`Skill @${id} initialized for quick access.`)}
      className='w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors group'
    >
      <div className='p-1 rounded bg-zinc-950/50 border border-zinc-800/60 group-hover:border-zinc-700 transition-colors shadow-sm'>
        {icon}
      </div>
      <span>{title}</span>
    </button>
  )
}
