import { useState, useEffect } from 'react'
import { Plus, Play, Image as ImageIcon, Settings2, Blocks } from 'lucide-react'
import { Modal } from '../components/Modal'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { useConnectionState, useConfigData } from '../context'

const INITIAL_SKILLS: Array<any> = []

export function SkillsPage() {
  const connectionState = useConnectionState()
  const configState = useConfigData()
  const [skills, setSkills] = useState(INITIAL_SKILLS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [markdown, setMarkdown] = useState('')

  // 监听连接状态变化
  useEffect(() => {
    console.log('[SkillsPage] 连接状态:', connectionState)

    // 当连接成功时，获取聊天历史
    if (connectionState === 'connected') {
      window.ipcRenderer
        .invoke('openclaw-ws:get-tools-catalog')
        .then((response) => {
          console.log('[SkillsPage] Skill列表响应:', response)
        })
        .catch((error) => {
          console.error('[SkillsPage] Skill列表响应失败:', error)
        })
      window.ipcRenderer
        .invoke('openclaw-ws:get-skills-status')
        .then((response) => {
          console.log('[SkillsPage] Skill状态列表响应:', response)

          if (response && response.success && response.data) {
            const { skills, managedSkillsDir, workspaceDir } = response.data
            setSkills(skills)
          }
        })
        .catch((error) => {
          console.error('[SkillsPage] Skill状态列表响应失败:', error)
        })
    }
  }, [connectionState])

  const openCreateModal = () => {
    setEditingSkillId(null)
    setName('')
    setDescription('')
    setCode('')
    setMarkdown('')
    setIsModalOpen(true)
  }

  const openEditModal = (skill: any) => {
    setEditingSkillId(skill.id)
    setName(skill.name)
    setDescription(skill.description)
    setCode(skill.code || '')
    setMarkdown(skill.markdown || '')
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (!name || !description) {
      toast.error('Name and description are required.')
      return
    }

    if (editingSkillId) {
      setSkills(
        skills.map((s) =>
          s.id === editingSkillId
            ? { ...s, name, description, code, markdown }
            : s
        )
      )
      toast.success(`Skill "${name}" updated successfully.`)
    } else {
      const newSkill = {
        id: Date.now(),
        name,
        description,
        type: 'Custom',
        icon: Plus,
        color: 'text-zinc-400',
        code,
        markdown
      }
      setSkills([...skills, newSkill])
      toast.success(`Skill "${name}" created successfully.`)
    }
    setIsModalOpen(false)
  }

  return (
    <div className='h-full flex flex-col p-6 overflow-y-auto bg-zinc-950 text-zinc-100'>
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Skills Library</h1>
          <p className='text-zinc-400 mt-1'>
            Manage and create custom skills for your agents.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className='flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20'
        >
          <Plus className='w-4 h-4' />
          Create Skill
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {skills.map((skill) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={skill.skillKey}
            onClick={() => openEditModal(skill)}
            className='bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group cursor-pointer flex flex-col gap-4 shadow-sm hover:shadow-md'
          >
            <div className='flex items-start justify-between'>
              <div className='w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner group-hover:border-zinc-700 transition-colors'>
                {skill.emoji ? (
                  skill.emoji
                ) : (
                  <Blocks className={`w-5 h-5 ${skill.color}`} />
                )}
              </div>
              <span className='text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800'>
                {skill.source}
              </span>
            </div>
            <div>
              <h3 className='text-zinc-100 font-semibold text-base mb-1 group-hover:text-orange-400 transition-colors'>
                {skill.name}
              </h3>
              <p className='text-zinc-400 text-sm line-clamp-2 leading-relaxed'>
                {skill.description}
              </p>
            </div>
            <div className='mt-auto pt-4 flex items-center justify-between border-t border-zinc-800/60 opacity-0 group-hover:opacity-100 transition-opacity'>
              <button className='text-xs text-zinc-400 hover:text-orange-400 transition-colors font-medium flex items-center gap-1.5'>
                <Settings2 className='w-3.5 h-3.5' /> Configure
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toast(`Running test for ${skill.name}`)
                }}
                className='text-xs text-zinc-400 hover:text-green-400 transition-colors font-medium flex items-center gap-1.5'
              >
                <Play className='w-3.5 h-3.5' /> Test
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSkillId ? 'Configure Skill' : 'Create Custom Skill'}
        width='lg'
      >
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-zinc-400 mb-1.5'>
              Skill Name
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., Send Slack Message'
              className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none transition-colors'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-zinc-400 mb-1.5'>
              Description
            </label>
            <input
              type='text'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Briefly describe what this skill does'
              className='w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none transition-colors'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-zinc-400 mb-1.5 flex items-center justify-between'>
                <span>Execution Logic</span>
                <span className='text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400'>
                  Code
                </span>
              </label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="def execute(args):\n  # Write your logic here\n  return {'status': 'success'}"
                className='w-full h-40 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-orange-500/50 focus:outline-none transition-colors resize-none scrollbar-thin'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-zinc-400 mb-1.5 flex items-center justify-between'>
                <span>MD Configuration</span>
                <span className='text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400'>
                  Docs
                </span>
              </label>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder='## Parameters\n- query: Search string\n- limit: Max results'
                className='w-full h-40 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono placeholder:text-zinc-700 focus:border-orange-500/50 focus:outline-none transition-colors resize-none scrollbar-thin'
              />
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
              Save Skill
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
