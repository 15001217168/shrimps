import { useState, useEffect } from 'react'
import { Plus, Play, Image as ImageIcon, Settings2, Blocks } from 'lucide-react'
import { Modal } from '../components/Modal'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { useConnectionState, useConfigData, useLanguage } from '../context'

const INITIAL_SKILLS: Array<any> = []

export function SkillsPage() {
  const connectionState = useConnectionState()
  const configState = useConfigData()
  const { t } = useLanguage()
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
      toast.error(t('skills.nameRequired'))
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
      toast.success(`${t('skills.skillName')} "${name}" ${t('skills.skillUpdated')}`)
    } else {
      const newSkill = {
        id: Date.now(),
        name,
        description,
        type: 'Custom',
        icon: Plus,
        color: 'text-muted-foreground',
        code,
        markdown
      }
      setSkills([...skills, newSkill])
      toast.success(`${t('skills.skillName')} "${name}" ${t('skills.skillCreated')}`)
    }
    setIsModalOpen(false)
  }

  return (
    <div className='h-full flex flex-col p-6 overflow-y-auto bg-background text-foreground'>
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('skills.title')}</h1>
          <p className='text-muted-foreground mt-1'>
            {t('skills.subtitle')}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className='flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20'
        >
          <Plus className='w-4 h-4' />
          {t('skills.createSkill')}
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {skills.map((skill) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={skill.skillKey}
            onClick={() => openEditModal(skill)}
            className='bg-card border border-border rounded-xl p-5 hover:border-border-hover transition-colors group cursor-pointer flex flex-col gap-4 shadow-sm hover:shadow-md'
          >
            <div className='flex items-start justify-between'>
              <div className='w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center shadow-inner group-hover:border-border-hover transition-colors'>
                {skill.emoji ? (
                  skill.emoji
                ) : (
                  <Blocks className={`w-5 h-5 ${skill.color}`} />
                )}
              </div>
              <span className='text-[10px] font-mono text-muted-foreground bg-background px-2 py-1 rounded-md border border-border'>
                {skill.source}
              </span>
            </div>
            <div>
              <h3 className='text-foreground font-semibold text-base mb-1 group-hover:text-primary transition-colors'>
                {skill.name}
              </h3>
              <p className='text-muted-foreground text-sm line-clamp-2 leading-relaxed'>
                {skill.description}
              </p>
            </div>
            <div className='mt-auto pt-4 flex items-center justify-between border-t border-border opacity-0 group-hover:opacity-100 transition-opacity'>
              <button className='text-xs text-muted-foreground hover:text-primary transition-colors font-medium flex items-center gap-1.5'>
                <Settings2 className='w-3.5 h-3.5' /> {t('skills.configure')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toast(`${t('skills.testing')} ${skill.name}`)
                }}
                className='text-xs text-muted-foreground hover:text-green-400 transition-colors font-medium flex items-center gap-1.5'
              >
                <Play className='w-3.5 h-3.5' /> {t('skills.test')}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSkillId ? t('skills.configureSkill') : t('skills.createCustomSkill')}
        width='lg'
      >
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-muted-foreground mb-1.5'>
              {t('skills.skillName')}
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('skills.skillNamePlaceholder')}
              className='w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary-hover/50 focus:outline-none transition-colors'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-muted-foreground mb-1.5'>
              {t('skills.description')}
            </label>
            <input
              type='text'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('skills.descriptionPlaceholder')}
              className='w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary-hover/50 focus:outline-none transition-colors'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-muted-foreground mb-1.5 flex items-center justify-between'>
                <span>{t('skills.executionLogic')}</span>
                <span className='text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground'>
                  Code
                </span>
              </label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('skills.codePlaceholder')}
                className='w-full h-40 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-primary-hover/50 focus:outline-none transition-colors resize-none scrollbar-thin'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-muted-foreground mb-1.5 flex items-center justify-between'>
                <span>{t('skills.mdConfiguration')}</span>
                <span className='text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground'>
                  Docs
                </span>
              </label>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder={t('skills.mdPlaceholder')}
                className='w-full h-40 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-primary-hover/50 focus:outline-none transition-colors resize-none scrollbar-thin'
              />
            </div>
          </div>

          <div className='pt-4 flex justify-end gap-3 border-t border-border'>
            <button
              onClick={() => setIsModalOpen(false)}
              className='px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              className='px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors shadow-md'
            >
              {t('skills.saveSkill')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
