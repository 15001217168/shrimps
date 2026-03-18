import { useState, useEffect } from 'react'
import {
  Palette,
  Globe,
  Key,
  Monitor,
  Moon,
  Sun,
  CheckCircle2,
  Save,
  MessageSquare,
  Plus,
  FileJson,
  Link,
  Trash2,
  Github,
  Eye,
  EyeOff
} from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { useConnectionState, useConfigData } from '../context'

export function SettingsPage() {
  const configState = useConfigData()
  const connectionState = useConnectionState()
  const [activeTab, setActiveTab] = useState('appearance')

  // Settings States
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('en')

  // API Keys
  const [zhipuKey, setZhipuKey] = useState('')
  const [openAIKey, setOpenAIKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  // API Key visibility state
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})

  const [llm, setLLM] = useState<any>([])

  // Local Conn & Tokens
  const [localOllamaUrl, setLocalOllamaUrl] = useState('http://localhost:11434')
  const [githubToken, setGithubToken] = useState('')
  const [tavilyToken, setTavilyToken] = useState('')

  // Channels Setup
  const [channels, setChannels] = useState([
    {
      id: 1,
      type: 'Feishu',
      name: 'Company internal bot',
      webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/...'
    },
    {
      id: 2,
      type: 'Slack',
      name: 'Engineering alerts',
      webhook: 'https://hooks.slack.com/services/...'
    }
  ])

  // JSON Config
  const [jsonConfig, setJsonConfig] = useState(
    `{\n  "version": "1.0.0",\n  "telemetry": false,\n  "sandbox": {\n    "memory_limit": "512m",\n    "timeout_seconds": 30\n  },\n  "experimental_features": ["agent_orchestration"]\n}`
  )
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[SettingsPage] 连接状态:', connectionState)

    // 当连接成功时，获取聊天历史
    if (connectionState === 'connected') {
      console.log('[SettingsPage] 配置文件:', configState)
      const { provider } = configState

      const llmList = Object.keys(provider).map((i) => {
        return {
          provider: i,
          ...provider[i]
        }
      })

      setLLM((cur) => (cur = llmList))
    }
  }, [connectionState])

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setJsonConfig(val)
    try {
      JSON.parse(val)
      setJsonError(null)
    } catch (err: any) {
      setJsonError(err.message)
    }
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonConfig)
      setJsonConfig(JSON.stringify(parsed, null, 2))
      setJsonError(null)
      toast.success('JSON formatted successfully')
    } catch (err: any) {
      toast.error('Cannot format invalid JSON')
    }
  }

  const resetJson = () => {
    setJsonConfig(
      `{\n  "version": "1.0.0",\n  "telemetry": false,\n  "sandbox": {\n    "memory_limit": "512m",\n    "timeout_seconds": 30\n  },\n  "experimental_features": ["agent_orchestration"]\n}`
    )
    setJsonError(null)
  }

  const handleSave = () => {
    if (jsonError) {
      toast.error('Please fix JSON errors before saving.')
      return
    }
    toast.success('Settings saved successfully.')
  }

  const addChannel = () => {
    setChannels([
      ...channels,
      { id: Date.now(), type: 'Custom', name: 'New Channel', webhook: '' }
    ])
  }

  const removeChannel = (id: number) => {
    setChannels(channels.filter((c) => c.id !== id))
  }

  const updateChannel = (id: number, field: string, value: string) => {
    setChannels(
      channels.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  return (
    <div className='flex h-full bg-zinc-950 text-zinc-100 overflow-hidden'>
      {/* Settings Sidebar */}
      <div className='w-64 border-r border-zinc-800 bg-zinc-900/30 flex flex-col p-4 shrink-0'>
        <h2 className='text-lg font-bold tracking-tight mb-6 px-2 text-zinc-200'>
          Settings
        </h2>

        <nav className='flex flex-col gap-1.5'>
          <TabButton
            id='appearance'
            active={activeTab === 'appearance'}
            onClick={() => setActiveTab('appearance')}
            icon={<Palette className='w-4 h-4' />}
            label='Appearance'
          />
          <TabButton
            id='language'
            active={activeTab === 'language'}
            onClick={() => setActiveTab('language')}
            icon={<Globe className='w-4 h-4' />}
            label='Language'
          />
          <TabButton
            id='providers'
            active={activeTab === 'providers'}
            onClick={() => setActiveTab('providers')}
            icon={<Key className='w-4 h-4' />}
            label='LLM Providers'
          />
          <TabButton
            id='tokens'
            active={activeTab === 'tokens'}
            onClick={() => setActiveTab('tokens')}
            icon={<Link className='w-4 h-4' />}
            label='Tokens & Local'
          />
          <TabButton
            id='channels'
            active={activeTab === 'channels'}
            onClick={() => setActiveTab('channels')}
            icon={<MessageSquare className='w-4 h-4' />}
            label='Channels'
          />
          <TabButton
            id='json'
            active={activeTab === 'json'}
            onClick={() => setActiveTab('json')}
            icon={<FileJson className='w-4 h-4' />}
            label='JSON Config'
          />
        </nav>
      </div>

      {/* Settings Content */}
      <div className='flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800'>
        <div className=''>
          <AnimatePresence mode='wait'>
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <motion.div
                key='appearance'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className='text-xl font-semibold mb-6'>Appearance</h3>

                <div className='space-y-6'>
                  <div>
                    <label className='block text-sm font-medium text-zinc-400 mb-3'>
                      Theme Preference
                    </label>
                    <div className='grid grid-cols-3 gap-4'>
                      <ThemeOption
                        id='system'
                        current={theme}
                        onSelect={setTheme}
                        icon={<Monitor className='w-5 h-5' />}
                        label='System'
                      />
                      <ThemeOption
                        id='dark'
                        current={theme}
                        onSelect={setTheme}
                        icon={<Moon className='w-5 h-5' />}
                        label='Dark'
                      />
                      <ThemeOption
                        id='light'
                        current={theme}
                        onSelect={setTheme}
                        icon={<Sun className='w-5 h-5' />}
                        label='Light'
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <motion.div
                key='language'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className='text-xl font-semibold mb-6'>Language</h3>

                <div className='space-y-4'>
                  <div
                    onClick={() => setLanguage('en')}
                    className={clsx(
                      'p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-colors',
                      language === 'en'
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    )}
                  >
                    <div>
                      <h4 className='font-medium text-zinc-200'>
                        English (US)
                      </h4>
                      <p className='text-sm text-zinc-500 mt-0.5'>
                        System default language
                      </p>
                    </div>
                    {language === 'en' && (
                      <CheckCircle2 className='w-5 h-5 text-orange-500' />
                    )}
                  </div>

                  <div
                    onClick={() => setLanguage('zh')}
                    className={clsx(
                      'p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-colors',
                      language === 'zh'
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    )}
                  >
                    <div>
                      <h4 className='font-medium text-zinc-200'>简体中文</h4>
                      <p className='text-sm text-zinc-500 mt-0.5'>
                        Chinese (Simplified)
                      </p>
                    </div>
                    {language === 'zh' && (
                      <CheckCircle2 className='w-5 h-5 text-orange-500' />
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* API Providers Tab */}
            {activeTab === 'providers' && (
              <motion.div
                key='providers'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className='text-xl font-semibold mb-6'>LLM Providers</h3>

                <div className='space-y-6'>
                  {llm.map((item: any) => (
                    <div
                      key={item.provider}
                      className='p-5 bg-zinc-900 border border-zinc-800 rounded-xl'
                    >
                      <div className='flex items-center justify-between mb-4'>
                        <div>
                          <h4 className='font-medium text-zinc-200'>
                            {item.provider}
                          </h4>
                        </div>
                        <div className='px-2 py-1 bg-zinc-800 rounded text-xs font-mono text-zinc-400'>
                          {item.baseUrl}
                        </div>
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-zinc-500 mb-1.5'>
                          API Key
                        </label>
                        <div className='relative'>
                          <input
                            type={
                              visibleKeys[item.provider] ? 'text' : 'password'
                            }
                            value={item.apiKey}
                            onChange={(e) => setZhipuKey(e.target.value)}
                            placeholder={`Enter your ${item.provider} API Key...`}
                            className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 pr-10 text-sm text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-orange-500/50 focus:outline-none transition-colors'
                          />
                          <button
                            type='button'
                            onClick={() =>
                              setVisibleKeys((prev) => ({
                                ...prev,
                                [item.provider]: !prev[item.provider]
                              }))
                            }
                            className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors'
                          >
                            {visibleKeys[item.provider] ? (
                              <EyeOff className='w-4 h-4' />
                            ) : (
                              <Eye className='w-4 h-4' />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tokens & Local Setup Tab */}
            {activeTab === 'tokens' && (
              <motion.div
                key='tokens'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className='text-xl font-semibold mb-6'>
                  Tokens & Local Connections
                </h3>

                <div className='space-y-6'>
                  {/* Local Connections */}
                  <div className='space-y-4'>
                    <h4 className='text-sm font-medium text-zinc-200 pb-2 border-b border-zinc-800'>
                      Local Environment
                    </h4>

                    <div>
                      <label className='block text-xs font-medium text-zinc-500 mb-1.5'>
                        Local Ollama / Llama.cpp Endpoint
                      </label>
                      <input
                        type='text'
                        value={localOllamaUrl}
                        onChange={(e) => setLocalOllamaUrl(e.target.value)}
                        placeholder='http://localhost:11434'
                        className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-orange-500/50 focus:outline-none transition-colors'
                      />
                      <p className='text-xs text-zinc-500 mt-1.5'>
                        Used for local inference. Ensure the server is running.
                      </p>
                    </div>
                  </div>

                  {/* Access Tokens */}
                  <div className='space-y-4 pt-4'>
                    <h4 className='text-sm font-medium text-zinc-200 pb-2 border-b border-zinc-800'>
                      Service Tokens
                    </h4>

                    <div>
                      <label className='block text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1.5'>
                        <Github className='w-3.5 h-3.5' /> GitHub Personal
                        Access Token (PAT)
                      </label>
                      <input
                        type='password'
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder='ghp_...'
                        className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-orange-500/50 focus:outline-none transition-colors'
                      />
                      <p className='text-xs text-zinc-500 mt-1.5'>
                        Required for Agents to read repositories or post PR
                        comments.
                      </p>
                    </div>

                    <div>
                      <label className='block text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1.5'>
                        <Globe className='w-3.5 h-3.5' /> Tavily Search API
                        Token
                      </label>
                      <input
                        type='password'
                        value={tavilyToken}
                        onChange={(e) => setTavilyToken(e.target.value)}
                        placeholder='tvly-...'
                        className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-orange-500/50 focus:outline-none transition-colors'
                      />
                      <p className='text-xs text-zinc-500 mt-1.5'>
                        High-quality search engine optimized for LLMs.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Channels Tab */}
            {activeTab === 'channels' && (
              <motion.div
                key='channels'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold'>Broadcast Channels</h3>
                  <button
                    onClick={addChannel}
                    className='flex items-center gap-1.5 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors'
                  >
                    <Plus className='w-4 h-4' /> Add Channel
                  </button>
                </div>

                <p className='text-sm text-zinc-400 mb-6'>
                  Configure webhooks for Feishu, Slack, or Discord to allow your
                  workflows to send notifications automatically.
                </p>

                <div className='space-y-4'>
                  <AnimatePresence>
                    {channels.map((channel) => (
                      <motion.div
                        key={channel.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className='bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-hidden'
                      >
                        <div className='flex gap-4'>
                          <div className='w-32 shrink-0'>
                            <label className='block text-xs font-medium text-zinc-500 mb-1.5'>
                              Platform
                            </label>
                            <select
                              value={channel.type}
                              onChange={(e) =>
                                updateChannel(
                                  channel.id,
                                  'type',
                                  e.target.value
                                )
                              }
                              className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors appearance-none'
                            >
                              <option>Feishu</option>
                              <option>Slack</option>
                              <option>Discord</option>
                              <option>Custom</option>
                            </select>
                          </div>

                          <div className='flex-1'>
                            <label className='block text-xs font-medium text-zinc-500 mb-1.5'>
                              Channel Name
                            </label>
                            <input
                              type='text'
                              value={channel.name}
                              onChange={(e) =>
                                updateChannel(
                                  channel.id,
                                  'name',
                                  e.target.value
                                )
                              }
                              placeholder='e.g., General Chat'
                              className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors'
                            />
                          </div>

                          <div className='pt-6'>
                            <button
                              onClick={() => removeChannel(channel.id)}
                              className='p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </div>

                        <div className='mt-3'>
                          <label className='block text-xs font-medium text-zinc-500 mb-1.5'>
                            Webhook URL
                          </label>
                          <input
                            type='text'
                            value={channel.webhook}
                            onChange={(e) =>
                              updateChannel(
                                channel.id,
                                'webhook',
                                e.target.value
                              )
                            }
                            placeholder='https://...'
                            className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-400 font-mono focus:border-orange-500/50 focus:outline-none transition-colors'
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {channels.length === 0 && (
                    <div className='text-center py-8 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl'>
                      No channels configured. Add one to enable bot
                      notifications.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* JSON Config Tab */}
            {activeTab === 'json' && (
              <motion.div
                key='json'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className='h-full flex flex-col'
              >
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-xl font-semibold'>
                    Local JSON Configuration
                  </h3>
                  <div className='flex items-center gap-4'>
                    <button
                      onClick={formatJson}
                      className='text-xs text-blue-400 hover:text-blue-300 font-medium'
                    >
                      Format JSON
                    </button>
                    <button
                      onClick={resetJson}
                      className='text-xs text-orange-400 hover:text-orange-300 font-medium'
                    >
                      Reset to Defaults
                    </button>
                  </div>
                </div>
                <p className='text-sm text-zinc-400 mb-4'>
                  Directly edit the underlying{' '}
                  <code className='text-xs bg-zinc-800 px-1 rounded text-zinc-300'>
                    config.json
                  </code>{' '}
                  file. Use with caution.
                </p>
                <div
                  className={clsx(
                    'flex-1 bg-zinc-950 border rounded-xl overflow-hidden min-h-[400px] transition-colors relative',
                    jsonError ? 'border-red-500/50' : 'border-zinc-800'
                  )}
                >
                  <textarea
                    value={jsonConfig}
                    onChange={handleJsonChange}
                    className='w-full h-full p-4 pb-12 bg-transparent text-zinc-300 font-mono text-sm resize-none focus:outline-none focus:ring-0 scrollbar-thin scrollbar-thumb-zinc-700'
                    spellCheck={false}
                  />
                  <AnimatePresence>
                    {jsonError && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className='absolute bottom-0 left-0 right-0 bg-red-950/50 backdrop-blur-sm border-t border-red-900/50 p-3'
                      >
                        <p className='text-xs text-red-400 font-mono flex items-center gap-2'>
                          <span className='w-1.5 h-1.5 rounded-full bg-red-500 shrink-0' />
                          Invalid JSON: {jsonError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className='mt-8 pt-6 border-t border-zinc-800 flex justify-end'>
            <button
              onClick={handleSave}
              className='flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20'
            >
              <Save className='w-4 h-4' />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  id,
  active,
  onClick,
  icon,
  label
}: {
  id: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative overflow-hidden',
        active
          ? 'bg-zinc-800/80 text-zinc-100 shadow-sm'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      )}
    >
      {active && (
        <motion.div
          layoutId='settingsTabIndicator'
          className='absolute left-0 top-2 bottom-2 w-1 bg-orange-500 rounded-r-md'
        />
      )}
      {icon}
      {label}
    </button>
  )
}

function ThemeOption({
  id,
  current,
  onSelect,
  icon,
  label
}: {
  id: string
  current: string
  onSelect: (id: string) => void
  icon: React.ReactNode
  label: string
}) {
  const isActive = current === id
  return (
    <button
      onClick={() => onSelect(id)}
      className={clsx(
        'flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all',
        isActive
          ? 'border-orange-500 bg-orange-500/5 text-orange-500'
          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
      )}
    >
      {icon}
      <span className='text-sm font-medium'>{label}</span>
    </button>
  )
}
