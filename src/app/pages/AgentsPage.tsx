import { useState, useEffect } from 'react'
import {
  Plus,
  Users,
  Code2,
  PenTool,
  BarChart3,
  MoreVertical,
  Search,
  Zap,
  CheckCircle2
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { useConnectionState, useConfigData } from '../context'

const INITIAL_AGENTS = [
  {
    id: 1,
    name: 'Software Engineer',
    description: 'Expert in writing, reviewing, and debugging code.',
    avatar: Code2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    skills: ['Code Exec', 'Web Search'],
    prompt: 'You are a senior software engineer...',
    model: 'Use Global Default'
  },
  {
    id: 2,
    name: 'Copywriter',
    description: 'Creative writing, SEO optimization, and content structuring.',
    avatar: PenTool,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    skills: ['Web Search'],
    prompt: 'You are an expert copywriter...',
    model: 'OpenClaw-70B-Pro'
  },
  {
    id: 3,
    name: 'Data Analyst',
    description: 'Analyze datasets, build charts, and provide insights.',
    avatar: BarChart3,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    skills: ['Code Exec', 'SQL Query'],
    prompt: 'You are a data analyst...',
    model: 'Use Global Default'
  }
]

export function AgentsPage() {
  const connectionState = useConnectionState()
  const configState = useConfigData()
  const [agents, setAgents] = useState(INITIAL_AGENTS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAgentId, setEditingAgentId] = useState<number | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('Use Global Default')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  // 监听连接状态变化
  useEffect(() => {
    console.log('[AgentsPage] 连接状态:', connectionState)

    // 当连接成功时，获取聊天历史
    if (connectionState === 'connected') {
      window.ipcRenderer
        .invoke('openclaw-ws:get-agents')
        .then((response) => {
          console.log('[AgentsPage] Agent列表响应:', response)
        })
        .catch((error) => {
          console.error('[AgentsPage] Agent列表响应失败:', error)
        })
    }
  }, [connectionState])

  const openCreateModal = () => {
    setEditingAgentId(null)
    setName('')
    setDescription('')
    setSystemPrompt('')
    setSelectedModel('Use Global Default')
    setSelectedSkills([])
    setIsModalOpen(true)
  }

  const openEditModal = (agent: any) => {
    setEditingAgentId(agent.id)
    setName(agent.name)
    setDescription(agent.description)
    setSystemPrompt(agent.prompt || '')
    setSelectedModel(agent.model || 'Use Global Default')
    setSelectedSkills(agent.skills || [])
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (!name || !description) {
      toast.error('Name and description are required.')
      return
    }

    if (editingAgentId) {
      setAgents(
        agents.map((a) =>
          a.id === editingAgentId
            ? {
                ...a,
                name,
                description,
                prompt: systemPrompt,
                model: selectedModel,
                skills: selectedSkills.length ? selectedSkills : ['None']
              }
            : a
        )
      )
      toast.success(`Agent "${name}" updated successfully.`)
    } else {
      const newAgent = {
        id: Date.now(),
        name,
        description,
        avatar: Users,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
        prompt: systemPrompt,
        model: selectedModel,
        skills: selectedSkills.length ? selectedSkills : ['None']
      }
      setAgents([...agents, newAgent])
      toast.success(`Agent "${name}" configured successfully.`)
    }
    setIsModalOpen(false)
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  return (
    <div className='h-full flex flex-col p-6 overflow-y-auto bg-zinc-950 text-zinc-100'>
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Agent Roster</h1>
          <p className='text-zinc-400 mt-1'>
            Configure specialized digital employees with unique system prompts.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className='flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20'
        >
          <Plus className='w-4 h-4' />
          Create Agent
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {agents.map((agent) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            key={agent.id}
            onClick={() => openEditModal(agent)}
            className='bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all shadow-sm group cursor-pointer relative overflow-hidden'
          >
            <div
              className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full ${agent.bg} pointer-events-none opacity-50`}
            />

            <div className='flex justify-between items-start mb-4'>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner border border-zinc-800/80 ${agent.bg}`}
              >
                <agent.avatar className={`w-6 h-6 ${agent.color}`} />
              </div>
              <button
                className='text-zinc-500 hover:text-zinc-300 transition-colors p-1 relative z-10'
                onClick={(e) => {
                  e.stopPropagation()
                  openEditModal(agent)
                }}
              >
                <MoreVertical className='w-4 h-4' />
              </button>
            </div>

            <h3 className='text-zinc-100 font-semibold text-lg tracking-tight mb-2 group-hover:text-orange-400 transition-colors'>
              {agent.name}
            </h3>
            <p className='text-zinc-400 text-sm line-clamp-2 leading-relaxed h-10 mb-4'>
              {agent.description}
            </p>

            <div className='flex items-center gap-2 flex-wrap'>
              {agent.skills.map((s) => (
                <span
                  key={s}
                  className='px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-950 border border-zinc-800 text-zinc-400'
                >
                  {s}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAgentId ? 'Edit Agent' : 'Configure Custom Agent'}
        width='lg'
      >
        <div className='space-y-5'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-zinc-400 mb-1.5'>
                Agent Name
              </label>
              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., SEO Specialist'
                className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none transition-colors'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-zinc-400 mb-1.5'>
                Model Override (Optional)
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-orange-500/50 focus:outline-none transition-colors appearance-none'
              >
                <option>Use Global Default</option>
                <option>OpenClaw-8B-Flash</option>
                <option>OpenClaw-70B-Pro</option>
                <option>GLM-4</option>
                <option>GPT-4o</option>
              </select>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-zinc-400 mb-1.5'>
              Description
            </label>
            <input
              type='text'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this agent's specialty?"
              className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none transition-colors'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-zinc-400 mb-1.5 flex items-center justify-between'>
              <span>System Prompt</span>
              <span className='text-[10px] font-mono text-zinc-500'>
                system_message
              </span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder='You are an expert SEO specialist...'
              className='w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-700 focus:border-orange-500/50 focus:outline-none transition-colors resize-none scrollbar-thin'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-zinc-400 mb-2'>
              Attach Skills
            </label>
            <div className='grid grid-cols-2 gap-2'>
              {[
                'Web Search',
                'Code Exec',
                'Image Gen',
                'Doc Reader',
                'SQL Query'
              ].map((skill) => (
                <div
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={clsx(
                    'flex items-center gap-2 p-2 rounded-lg border text-sm cursor-pointer transition-colors select-none',
                    selectedSkills.includes(skill)
                      ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
                  )}
                >
                  <div
                    className={clsx(
                      'w-4 h-4 rounded-sm flex items-center justify-center shrink-0 border',
                      selectedSkills.includes(skill)
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-zinc-700 bg-zinc-900'
                    )}
                  >
                    {selectedSkills.includes(skill) && (
                      <CheckCircle2 className='w-3 h-3 text-white' />
                    )}
                  </div>
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>

          <div className='pt-4 flex justify-end gap-3 border-t border-zinc-800/80'>
            <button
              onClick={() => setIsModalOpen(false)}
              className='px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className='px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-md'
            >
              Save Agent
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
