import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Paperclip,
  Mic,
  Bot,
  User,
  ChevronDown,
  MoreVertical,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Search,
  Code,
  Image as ImageIcon,
  Code2,
  PenTool,
  Check
} from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'motion/react'

import { useConnectionState, useConfigData, useLanguage } from '../context'
import { ModelInfo } from '../context/types'

// ==================== 类型定义 ====================

/** OpenClaw 消息内容块 */
type OpenClawContentBlock = {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

/** OpenClaw 原始消息格式 */
type OpenClawMessage = {
  api?: string
  content: OpenClawContentBlock[]
  model?: string
  provider?: string
  role: 'user' | 'assistant' | 'system'
  stopReason?: string
  timestamp: number
  usage?: {
    input: number
    output: number
    totalTokens: number
    cacheRead?: number
    cacheWrite?: number
  }
}

/** ChatPage 消息格式 */
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

/**
 * 将 OpenClaw 消息转换为 ChatPage Message 格式
 */
function convertOpenClawMessage(
  msg: OpenClawMessage,
  index: number
): Message | null {
  // 跳过系统消息
  if (msg.role === 'system') return null

  // 提取文本内容
  let content = ''
  if (Array.isArray(msg.content)) {
    content = msg.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
  } else if (typeof msg.content === 'string') {
    content = msg.content
  }

  if (!content.trim()) return null

  // 格式化时间戳
  const timestamp = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })

  return {
    id: `openclaw-${msg.timestamp}-${index}`,
    role: msg.role as 'user' | 'assistant',
    content,
    timestamp
  }
}

const INITIAL_MESSAGES: Message[] = []

const MENTIONS = [
  {
    id: 'web-search',
    name: 'Web Search',
    type: 'skill',
    icon: <Search className='w-3.5 h-3.5 text-blue-400' />
  },
  {
    id: 'code-exec',
    name: 'Code Execution',
    type: 'skill',
    icon: <Code className='w-3.5 h-3.5 text-green-400' />
  },
  {
    id: 'image-gen',
    name: 'Image Generation',
    type: 'skill',
    icon: <ImageIcon className='w-3.5 h-3.5 text-purple-400' />
  },
  {
    id: 'swe',
    name: 'Software Engineer',
    type: 'agent',
    icon: <Code2 className='w-3.5 h-3.5 text-emerald-500' />
  },
  {
    id: 'copywriter',
    name: 'Copywriter',
    type: 'agent',
    icon: <PenTool className='w-3.5 h-3.5 text-pink-500' />
  }
]

export function ChatPage() {
  const connectionState = useConnectionState()
  const configState = useConfigData()
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Model Selector State
  const [selectedModel, setSelectedModel] = useState('')
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])

  // Mentions State
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isFirstLoad = useRef(true)

  // 连接状态配置
  const connectionConfig = {
    disconnected: {
      color: 'bg-zinc-500',
      text: t('chat.disconnected'),
      canSend: false
    },
    connecting: {
      color: 'bg-yellow-500 animate-pulse',
      text: t('chat.connecting'),
      canSend: false
    },
    connected: {
      color: 'bg-green-500',
      text: t('chat.connected'),
      canSend: true
    },
    error: {
      color: 'bg-red-500',
      text: t('chat.connectionError'),
      canSend: false
    }
  }

  const connStatus = connectionConfig[connectionState]

  // 监听连接状态变化
  useEffect(() => {
    console.log('[ChatPage] 连接状态:', connectionState)

    // 当连接成功时，获取聊天历史
    if (connectionState === 'connected') {
      window.ipcRenderer
        .invoke('openclaw-ws:get-chat-history')
        .then((response) => {
          console.log('[ChatPage] 聊天历史响应:', response)

          if (response?.success && response?.data?.messages) {
            const openClawMessages = response.data.messages as OpenClawMessage[]

            // 转换消息格式
            const convertedMessages = openClawMessages
              .map(convertOpenClawMessage)
              .filter((msg): msg is Message => msg !== null)

            console.log('[ChatPage] 转换后的消息:', convertedMessages)

            if (convertedMessages.length > 0) {
              setMessages(convertedMessages)
            }
          }
        })
        .catch((error) => {
          console.error('[ChatPage] 获取聊天历史失败:', error)
        })
    }
  }, [connectionState])

  // 配置文件变化
  useEffect(() => {
    console.log('[ChatPage] 配置变化:', configState)

    if (configState) {
      const { currentModel } = configState

      setSelectedModel(currentModel)

      setModels([...configState.models])
    }
  }, [configState])

  // 监听 OpenClaw 聊天事件
  useEffect(() => {
    const handleOpenClawEvent = (
      _event: unknown,
      data: {
        event: string
        payload?: {
          runId?: string
          sessionKey?: string
          state?: 'delta' | 'final' | 'aborted' | 'error'
          message?: OpenClawMessage
          errorMessage?: string
        }
      }
    ) => {
      console.log('[ChatPage] 收到 OpenClaw 事件:', data)

      // 处理聊天事件
      if (data.event === 'chat' && data.payload) {
        const { state, message, runId } = data.payload

        if (state === 'delta' && message) {
          // 增量更新（流式响应）- 逐字输出
          const content = extractTextContent(message)

          setMessages((prev) => {
            // 查找是否已存在该 runId 的消息
            const existingIndex = prev.findIndex(
              (m) => m.id === `stream-${runId}`
            )

            if (existingIndex >= 0) {
              // 更新现有消息（追加内容）
              const updated = [...prev]
              updated[existingIndex] = {
                ...updated[existingIndex],
                content: content
              }
              return updated
            } else {
              // 创建新的流式消息
              return [
                ...prev,
                {
                  id: `stream-${runId}`,
                  role: 'assistant' as const,
                  content,
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                }
              ]
            }
          })
        } else if (state === 'final' && message) {
          // 收到最终响应 - 更新或添加完整消息
          const convertedMsg = convertOpenClawMessage(message, Date.now())
          if (convertedMsg) {
            setMessages((prev) => {
              // 检查是否有对应的流式消息
              const streamIndex = prev.findIndex(
                (m) => m.id === `stream-${runId}`
              )
              if (streamIndex >= 0) {
                // 替换流式消息为最终消息
                const updated = [...prev]
                updated[streamIndex] = convertedMsg
                return updated
              }
              // 没有流式消息，直接添加
              return [...prev, convertedMsg]
            })
          }
          setIsTyping(false)
        } else if (state === 'error') {
          console.error('[ChatPage] 聊天错误:', data.payload.errorMessage)
          setIsTyping(false)
        } else if (state === 'aborted') {
          console.log('[ChatPage] 聊天已中止')
          setIsTyping(false)
        }
      }
    }

    window.ipcRenderer.on('openclaw-event', handleOpenClawEvent)

    return () => {
      window.ipcRenderer.off('openclaw-event', handleOpenClawEvent)
    }
  }, [])

  /**
   * 从 OpenClaw 消息中提取文本内容
   */
  function extractTextContent(message: OpenClawMessage): string {
    if (Array.isArray(message.content)) {
      return message.content
        .filter((block) => block.type === 'text' && block.text)
        .map((block) => block.text)
        .join('')
    }
    return typeof message.content === 'string' ? message.content : ''
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInputMessage(val)

    // Detect if we are typing a mention at the end of the text
    const match = val.match(/@([a-zA-Z0-9-]*)$/)
    if (match) {
      setShowMentions(true)
      setMentionQuery(match[1].toLowerCase())
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (mentionId: string) => {
    const newVal = inputMessage.replace(/@([a-zA-Z0-9-]*)$/, `@${mentionId} `)
    setInputMessage(newVal)
    setShowMentions(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputMessage.trim()) return

    const messageContent = inputMessage

    const newMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    setMessages((prev) => [...prev, newMsg])
    setInputMessage('')
    setShowMentions(false)
    setIsTyping(true)

    // 调用 OpenClaw 发送消息 API
    window.ipcRenderer
      .invoke('openclaw-ws:chat-send', '', messageContent)
      .then((response) => {
        console.log('[ChatPage] 消息发送响应:', response)

        if (response?.success) {
          // 消息发送成功，等待 AI 响应事件
          console.log('[ChatPage] 消息已发送，等待 AI 响应...')
        } else {
          console.error('[ChatPage] 消息发送失败:', response?.error)
          setIsTyping(false)
        }
      })
      .catch((error) => {
        console.error('[ChatPage] 发送消息异常:', error)
        setIsTyping(false)
      })
  }

  const filteredMentions = MENTIONS.filter(
    (m) =>
      m.id.toLowerCase().includes(mentionQuery) ||
      m.name.toLowerCase().includes(mentionQuery)
  )

  return (
    <div className='flex flex-col h-full bg-background text-foreground relative'>
      {/* Chat Area Top Bar (Model Selector Overlay) */}
      <div className='absolute top-0 left-0 right-0 h-14 flex items-center justify-center pointer-events-none z-30'>
        <div className='relative pointer-events-auto'>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 border border-border backdrop-blur-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-md'
          >
            <Sparkles className='w-3.5 h-3.5 text-orange-500' />
            {selectedModel}
            <ChevronDown className='w-4 h-4 text-muted-foreground' />
          </button>

          {/* Model Dropdown */}
          <AnimatePresence>
            {showModelDropdown && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className='fixed inset-0 z-[-1]'
                  onClick={() => setShowModelDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className='absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50 origin-top'
                >
                  <div className='p-2 space-y-3'>
                    {/* Local Models */}
                    <div>
                      <div className='flex flex-col gap-0.5'>
                        {models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.id)
                              setShowModelDropdown(false)
                            }}
                            className='w-full flex items-center justify-between px-2 py-1.5 hover:bg-secondary rounded-lg text-left transition-colors group'
                          >
                            <div>
                              <div className='text-sm font-medium text-foreground group-hover:text-foreground'>
                                {model.id}
                              </div>
                            </div>
                            {selectedModel === model.id && (
                              <Check className='w-4 h-4 text-orange-500' />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className='flex-1 overflow-y-auto px-4 py-6 scroll-auto pb-40 scrollbar-thin scrollbar-thumb-scrollbar-thumb scrollbar-track-transparent'
      >
        <div className='max-w-3xl mx-auto flex flex-col gap-6 pt-10'>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} t={t} />
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className='flex gap-4 p-4 rounded-xl items-start'
              >
                <div className='w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center shrink-0 shadow-lg shadow-orange-900/20'>
                  <Bot className='w-4 h-4 text-white' />
                </div>
                <div className='flex-1 space-y-2 py-1'>
                  <div className='flex gap-1'>
                    <span className='w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]'></span>
                    <span className='w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]'></span>
                    <span className='w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce'></span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input Area */}
      <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-20 pb-6 px-4 z-20'>
        <div className='max-w-3xl mx-auto relative'>
          {/* Mentions Popover */}
          <AnimatePresence>
            {showMentions && filteredMentions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className='absolute bottom-full mb-3 left-0 w-72 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50 origin-bottom-left'
              >
                <div className='px-3 py-2 border-b border-border/80 flex items-center justify-between'>
                  <span className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>
                    {t('layout.agentsAndSkills')}
                  </span>
                  <span className='text-[10px] text-muted-foreground'>
                    {t('layout.pressEscToClose')}
                  </span>
                </div>
                <div className='max-h-56 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-scrollbar-thumb'>
                  {filteredMentions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => insertMention(m.id)}
                      className='w-full flex items-center gap-3 px-2 py-2 hover:bg-secondary/80 rounded-lg text-left transition-colors group'
                    >
                      <div className='w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center shrink-0 group-hover:border-border-hover transition-colors shadow-inner'>
                        {m.icon}
                      </div>
                      <div className='flex flex-col'>
                        <span className='text-sm font-medium text-foreground group-hover:text-foreground'>
                          {m.name}
                        </span>
                        <span className='text-[10px] text-muted-foreground uppercase tracking-wide'>
                          {m.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form
            onSubmit={handleSendMessage}
            className='flex items-end gap-2 bg-card border border-border p-2 rounded-2xl shadow-xl shadow-black/40 focus-within:border-border-hover transition-colors relative z-40'
          >
            {/* Left Actions */}
            <div className='flex gap-1 pb-1 px-1'>
              <button
                type='button'
                className='p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors'
                title={t('layout.attachFile')}
              >
                <Paperclip className='w-5 h-5' />
              </button>
            </div>

            {/* Main Text Input */}
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                  e.preventDefault()
                  handleSendMessage()
                }
                if (e.key === 'Escape' && showMentions) {
                  setShowMentions(false)
                }
              }}
              placeholder={t('chat.placeholder')}
              className='flex-1 bg-transparent border-0 resize-none py-3 px-2 max-h-32 min-h-[44px] text-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none scrollbar-thin'
              rows={1}
              style={{ height: 'auto' }}
            />

            {/* Right Actions */}
            <div className='flex gap-1 pb-1 pr-1'>
              <button
                type='button'
                className='p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors hidden sm:block'
                title={t('layout.voiceInput')}
              >
                <Mic className='w-5 h-5' />
              </button>
              <button
                type='submit'
                disabled={!inputMessage.trim() || !connStatus.canSend}
                className='p-2 bg-primary-foreground text-primary disabled:bg-secondary disabled:text-muted-foreground rounded-xl transition-all shadow-sm'
              >
                <Send className='w-5 h-5' />
              </button>
            </div>
          </form>
          <div className='text-center mt-2'>
            <span className='text-[10px] text-muted-foreground font-medium tracking-wide'>
              {t('chat.disclaimer')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function highlightMentions(text: string) {
  // Regex to split by @word while keeping the match
  const parts = text.split(/(@[a-zA-Z0-9-]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className='text-orange-400 font-medium bg-orange-500/10 px-1 py-0.5 rounded cursor-pointer hover:bg-orange-500/20 transition-colors'
        >
          {part}
        </span>
      )
    }
    return part
  })
}

function ChatMessage({
  message,
  t
}: {
  message: Message
  t: (key: string) => string
}) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'flex gap-4 p-4 rounded-2xl group transition-colors',
        isUser ? 'bg-secondary/50' : 'bg-transparent hover:bg-secondary/20'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm',
          isUser
            ? 'bg-secondary text-muted-foreground'
            : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-900/20 shadow-lg'
        )}
      >
        {isUser ? <User className='w-4 h-4' /> : <Bot className='w-4 h-4' />}
      </div>

      {/* Content Area */}
      <div className='flex-1 space-y-2 overflow-hidden'>
        <div className='flex items-center gap-2'>
          <span className='font-semibold text-sm text-foreground'>
            {isUser ? t('chat.you') : t('chat.assistant')}
          </span>
          <span className='text-xs text-muted-foreground'>
            {message.timestamp}
          </span>
        </div>

        <div className='text-foreground text-[15px] leading-relaxed whitespace-pre-wrap font-sans'>
          {highlightMentions(message.content)}
        </div>

        {/* Message Actions */}
        {!isUser && (
          <div className='flex items-center gap-1.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity'>
            <ActionIcon
              icon={<Copy className='w-3.5 h-3.5' />}
              tooltip={t('layout.copy')}
            />
            <ActionIcon
              icon={<RefreshCw className='w-3.5 h-3.5' />}
              tooltip={t('layout.regenerate')}
            />
            <div className='w-px h-4 bg-border mx-1'></div>
            <ActionIcon
              icon={<ThumbsUp className='w-3.5 h-3.5' />}
              tooltip={t('layout.goodResponse')}
            />
            <ActionIcon
              icon={<ThumbsDown className='w-3.5 h-3.5' />}
              tooltip={t('layout.badResponse')}
            />
            <div className='flex-1'></div>
            <ActionIcon
              icon={<MoreVertical className='w-3.5 h-3.5' />}
              tooltip={t('layout.more')}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ActionIcon({
  icon,
  tooltip
}: {
  icon: React.ReactNode
  tooltip: string
}) {
  return (
    <button className='p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors relative group/btn'>
      {icon}
      <span className='absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-medium px-2 py-1 rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10'>
        {tooltip}
      </span>
    </button>
  )
}
