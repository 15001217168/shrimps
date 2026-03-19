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
import {
  useConnectionState,
  useConfigData,
  useTheme,
  useLanguage,
  type ThemeMode
} from '../context'

export function SettingsPage() {
  const configState = useConfigData()
  const connectionState = useConnectionState()
  const { theme, setTheme, saveTheme } = useTheme()
  const {
    t,
    language: currentLanguage,
    setLanguage: setAppLanguage
  } = useLanguage()
  const [activeTab, setActiveTab] = useState('appearance')

  // Settings States
  const [language, setLanguage] = useState('en')

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
  const [jsonConfig, setJsonConfig] = useState(``)
  const [jsonError, setJsonError] = useState<string | null>(null)

  // 初始化加载存储的语言设置
  useEffect(() => {
    setLanguage(currentLanguage)
  }, [currentLanguage])

  useEffect(() => {
    console.log('[SettingsPage] 连接状态:', connectionState)

    // 当连接成功时，获取配置
    if (connectionState === 'connected') {
      console.log('[SettingsPage] 配置文件:', configState)
      const { provider } = configState

      const llmList = Object.keys(provider).map((i) => {
        return {
          provider: i,
          ...provider[i]
        }
      })

      setLLM(llmList)
    }

    window.ipcRenderer.invoke('config:get-json').then((res) => {
      console.log('config:get-json', res)
      if (res && res.success == true) {
        setJsonConfig(res.data)
      }
    })
  }, [connectionState, configState])

  useEffect(() => {
    if (activeTab == 'json') {
      formatJson()
    }
  }, [activeTab])

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

  // 保存 Appearance 设置
  const saveAppearance = async () => {
    try {
      // 保存主题到本地存储（通过全局 ThemeContext）
      const success = await saveTheme()

      if (success) {
        console.log('[Settings] 主题已保存:', theme)
        toast.success(t('settings.appearanceSaved'))
      } else {
        throw new Error('Save failed')
      }
    } catch (error) {
      console.error('[Settings] 保存主题失败:', error)
      toast.error(t('settings.saveFailed'))
    }
  }

  // 保存 Language 设置
  const saveLanguage = async () => {
    try {
      // 更新应用语言
      setAppLanguage(language as 'en' | 'zh')

      console.log('[Settings] 语言已保存:', language)
      toast.success(t('settings.languageSaved'))
    } catch (error) {
      console.error('[Settings] 保存语言失败:', error)
      toast.error(t('settings.saveFailed'))
    }
  }

  // 保存 LLM Providers 设置
  const saveProviders = async () => {
    try {
      // 遍历所有 provider 并保存 API Key
      for (const item of llm) {
        await window.ipcRenderer.invoke(
          'config:save-api-key',
          item.provider,
          item.apiKey
        )
      }
      toast.success(t('settings.providersSaved'))
    } catch (error) {
      console.error('[Settings] 保存 Providers 设置失败:', error)
      toast.error(t('settings.saveFailed'))
    }
  }

  // 保存 Tokens & Local 设置
  const saveTokens = async () => {
    try {
      // TODO: 调用 IPC 保存 tokens 和本地连接设置
      console.log('[Settings] 保存 Tokens 设置:', {
        localOllamaUrl,
        githubToken,
        tavilyToken
      })
      toast.success(t('settings.tokensSaved'))
    } catch (error) {
      toast.error(t('settings.saveFailed'))
    }
  }

  // 保存 Channels 设置
  const saveChannels = async () => {
    try {
      // TODO: 调用 IPC 保存 channels 设置
      console.log('[Settings] 保存 Channels 设置:', channels)
      toast.success(t('settings.channelsSaved'))
    } catch (error) {
      toast.error(t('settings.saveFailed'))
    }
  }

  // 保存 JSON Config
  const saveJsonConfig = async () => {
    try {
      if (jsonError) {
        toast.error('Please fix JSON errors before saving.')
        return false
      }
      // TODO: 调用 IPC 保存 JSON 配置
      console.log('[Settings] 保存 JSON 配置:', jsonConfig)

      window.ipcRenderer.invoke('config:save-json', jsonConfig).then((res) => {
        console.log('config:save-json', res)
      })
      toast.success(t('settings.jsonSaved'))
      return true
    } catch (error) {
      toast.error(t('settings.saveFailed'))
      return false
    }
  }

  // 根据 activeTab 保存对应设置
  const handleSave = async () => {
    switch (activeTab) {
      case 'appearance':
        await saveAppearance()
        break
      case 'language':
        await saveLanguage()
        break
      case 'providers':
        await saveProviders()
        break
      case 'tokens':
        await saveTokens()
        break
      case 'channels':
        await saveChannels()
        break
      case 'json':
        await saveJsonConfig()
        break
      default:
        toast.error('Unknown settings tab.')
    }
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
    <div className='flex h-full bg-background text-foreground overflow-hidden'>
      {/* Settings Sidebar */}
      <div className='w-64 border-r border-border bg-card/30 flex flex-col p-4 shrink-0'>
        <h2 className='text-lg font-bold tracking-tight mb-6 px-2 text-foreground'>
          {t('settings.title')}
        </h2>

        <nav className='flex flex-col gap-1.5'>
          <TabButton
            id='appearance'
            active={activeTab === 'appearance'}
            onClick={() => setActiveTab('appearance')}
            icon={<Palette className='w-4 h-4' />}
            label={t('settings.appearance')}
          />
          <TabButton
            id='language'
            active={activeTab === 'language'}
            onClick={() => setActiveTab('language')}
            icon={<Globe className='w-4 h-4' />}
            label={t('settings.language')}
          />
          <TabButton
            id='providers'
            active={activeTab === 'providers'}
            onClick={() => setActiveTab('providers')}
            icon={<Key className='w-4 h-4' />}
            label={t('settings.llmProviders')}
          />
          <TabButton
            id='tokens'
            active={activeTab === 'tokens'}
            onClick={() => setActiveTab('tokens')}
            icon={<Link className='w-4 h-4' />}
            label={t('settings.tokensLocal')}
          />
          <TabButton
            id='channels'
            active={activeTab === 'channels'}
            onClick={() => setActiveTab('channels')}
            icon={<MessageSquare className='w-4 h-4' />}
            label={t('settings.channels')}
          />
          <TabButton
            id='json'
            active={activeTab === 'json'}
            onClick={() => setActiveTab('json')}
            icon={<FileJson className='w-4 h-4' />}
            label={t('settings.jsonConfig')}
          />
        </nav>
      </div>

      {/* Settings Content */}
      <div className='flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-scrollbar-thumb'>
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
                <h3 className='text-xl font-semibold mb-6'>
                  {t('settings.appearance')}
                </h3>

                <div className='space-y-6'>
                  <div>
                    <label className='block text-sm font-medium text-muted-foreground mb-3'>
                      {t('settings.themePreference')}
                    </label>
                    <div className='grid grid-cols-3 gap-4'>
                      <ThemeOption
                        id='system'
                        current={theme}
                        onSelect={setTheme}
                        icon={<Monitor className='w-5 h-5' />}
                        label={t('settings.themeSystem')}
                      />
                      <ThemeOption
                        id='dark'
                        current={theme}
                        onSelect={setTheme}
                        icon={<Moon className='w-5 h-5' />}
                        label={t('settings.themeDark')}
                      />
                      <ThemeOption
                        id='light'
                        current={theme}
                        onSelect={setTheme}
                        icon={<Sun className='w-5 h-5' />}
                        label={t('settings.themeLight')}
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
                <h3 className='text-xl font-semibold mb-6'>
                  {t('settings.language')}
                </h3>

                <div className='space-y-4'>
                  <div
                    onClick={() => setLanguage('en')}
                    className={clsx(
                      'p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-colors',
                      language === 'en'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-border-hover'
                    )}
                  >
                    <div>
                      <h4 className='font-medium text-foreground'>
                        {t('settings.languageEn')}
                      </h4>
                      <p className='text-sm text-muted-foreground mt-0.5'>
                        {t('settings.languageEnDesc')}
                      </p>
                    </div>
                    {language === 'en' && (
                      <CheckCircle2 className='w-5 h-5 text-primary' />
                    )}
                  </div>

                  <div
                    onClick={() => setLanguage('zh')}
                    className={clsx(
                      'p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-colors',
                      language === 'zh'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-border-hover'
                    )}
                  >
                    <div>
                      <h4 className='font-medium text-foreground'>
                        {t('settings.languageZh')}
                      </h4>
                      <p className='text-sm text-muted-foreground mt-0.5'>
                        {t('settings.languageZhDesc')}
                      </p>
                    </div>
                    {language === 'zh' && (
                      <CheckCircle2 className='w-5 h-5 text-primary' />
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
                <h3 className='text-xl font-semibold mb-6'>
                  {t('settings.llmProviders')}
                </h3>

                <div className='space-y-6'>
                  {llm.map((item: any) => (
                    <div
                      key={item.provider}
                      className='p-5 bg-card border border-border rounded-xl'
                    >
                      <div className='flex items-center justify-between mb-4'>
                        <div>
                          <h4 className='font-medium text-foreground'>
                            {item.provider}
                          </h4>
                        </div>
                        <div className='px-2 py-1 bg-secondary rounded text-xs font-mono text-muted-foreground'>
                          {item.baseUrl}
                        </div>
                      </div>
                      <div>
                        <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                          API Key
                        </label>
                        <div className='relative'>
                          <input
                            type={
                              visibleKeys[item.provider] ? 'text' : 'password'
                            }
                            value={item.apiKey || ''}
                            onChange={(e) =>
                              setLLM((prev: any[]) =>
                                prev.map((p: any) =>
                                  p.provider === item.provider
                                    ? { ...p, apiKey: e.target.value }
                                    : p
                                )
                              )
                            }
                            placeholder={`Enter your ${item.provider} API Key...`}
                            className='w-full bg-background border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none transition-colors'
                          />
                          <button
                            type='button'
                            onClick={() =>
                              setVisibleKeys((prev) => ({
                                ...prev,
                                [item.provider]: !prev[item.provider]
                              }))
                            }
                            className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors'
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
                  {t('settings.tokensLocal')}
                </h3>

                <div className='space-y-6'>
                  {/* Local Connections */}
                  <div className='space-y-4'>
                    <h4 className='text-sm font-medium text-foreground pb-2 border-b border-border'>
                      Local Environment
                    </h4>

                    <div>
                      <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
                        Local Ollama / Llama.cpp Endpoint
                      </label>
                      <input
                        type='text'
                        value={localOllamaUrl}
                        onChange={(e) => setLocalOllamaUrl(e.target.value)}
                        placeholder='http://localhost:11434'
                        className='w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none transition-colors'
                      />
                      <p className='text-xs text-muted-foreground mt-1.5'>
                        Used for local inference. Ensure the server is running.
                      </p>
                    </div>
                  </div>

                  {/* Access Tokens */}
                  <div className='space-y-4 pt-4'>
                    <h4 className='text-sm font-medium text-foreground pb-2 border-b border-border'>
                      Service Tokens
                    </h4>

                    <div>
                      <label className='block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5'>
                        <Github className='w-3.5 h-3.5' /> GitHub Personal
                        Access Token (PAT)
                      </label>
                      <input
                        type='password'
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder='ghp_...'
                        className='w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none transition-colors'
                      />
                      <p className='text-xs text-muted-foreground mt-1.5'>
                        Required for Agents to read repositories or post PR
                        comments.
                      </p>
                    </div>

                    <div>
                      <label className='block text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5'>
                        <Globe className='w-3.5 h-3.5' /> Tavily Search API
                        Token
                      </label>
                      <input
                        type='password'
                        value={tavilyToken}
                        onChange={(e) => setTavilyToken(e.target.value)}
                        placeholder='tvly-...'
                        className='w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none transition-colors'
                      />
                      <p className='text-xs text-muted-foreground mt-1.5'>
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
                    className='flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors'
                  >
                    <Plus className='w-4 h-4' /> {t('common.create')}
                  </button>
                </div>

                <p className='text-sm text-muted-foreground mb-6'>
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
                        className='bg-card border border-border rounded-xl p-4 overflow-hidden'
                      >
                        <div className='flex gap-4'>
                          <div className='w-32 shrink-0'>
                            <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
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
                              className='w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:border-primary/50 focus:outline-none transition-colors appearance-none'
                            >
                              <option>Feishu</option>
                              <option>Slack</option>
                              <option>Discord</option>
                              <option>Custom</option>
                            </select>
                          </div>

                          <div className='flex-1'>
                            <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
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
                              className='w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-primary/50 focus:outline-none transition-colors'
                            />
                          </div>

                          <div className='pt-6'>
                            <button
                              onClick={() => removeChannel(channel.id)}
                              className='p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded transition-colors'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </div>

                        <div className='mt-3'>
                          <label className='block text-xs font-medium text-muted-foreground mb-1.5'>
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
                            className='w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-muted-foreground font-mono focus:border-primary/50 focus:outline-none transition-colors'
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {channels.length === 0 && (
                    <div className='text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl'>
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
                      className='text-xs text-info hover:text-info/80 font-medium'
                    >
                      Format JSON
                    </button>
                  </div>
                </div>
                <p className='text-sm text-muted-foreground mb-4'>
                  Directly edit the underlying{' '}
                  <code className='text-xs bg-secondary px-1 rounded text-foreground'>
                    config.json
                  </code>{' '}
                  file. Use with caution.
                </p>
                <div
                  className={clsx(
                    'flex-1 bg-background border rounded-xl overflow-hidden min-h-[400px] transition-colors relative',
                    jsonError ? 'border-destructive/50' : 'border-border'
                  )}
                >
                  <textarea
                    value={jsonConfig}
                    onChange={handleJsonChange}
                    className='w-full h-full p-4 pb-12 bg-transparent min-h-[400px] text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-0 scrollbar-thin scrollbar-thumb-scrollbar-thumb'
                    spellCheck={false}
                  />
                  <AnimatePresence>
                    {jsonError && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className='absolute bottom-0 left-0 right-0 bg-destructive/10 backdrop-blur-sm border-t border-destructive/30 p-3'
                      >
                        <p className='text-xs text-destructive font-mono flex items-center gap-2'>
                          <span className='w-1.5 h-1.5 rounded-full bg-destructive shrink-0' />
                          Invalid JSON: {jsonError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className='mt-8 pt-6 border-t border-border flex justify-end'>
            <button
              onClick={handleSave}
              className='flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20'
            >
              <Save className='w-4 h-4' />
              {t('settings.saveSettings')}
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
          ? 'bg-secondary/80 text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
      )}
    >
      {active && (
        <motion.div
          layoutId='settingsTabIndicator'
          className='absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-md'
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
  id: ThemeMode
  current: ThemeMode
  onSelect: (id: ThemeMode) => void
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
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-border-hover hover:text-foreground'
      )}
    >
      {icon}
      <span className='text-sm font-medium'>{label}</span>
    </button>
  )
}
