import { useState } from "react";
import { Plus, Clock, Play, MoreHorizontal, Settings, Calendar, PlayCircle, Workflow, Network, CheckCircle2, ChevronRight } from "lucide-react";
import { Modal } from "../components/Modal";
import { toast } from "sonner";
import { motion } from "motion/react";
import clsx from "clsx";
import { useLanguage } from "../context";

const INITIAL_CRON_JOBS = [
  { id: 1, name: "Daily ArXiv Summarizer", schedule: "0 8 * * *", status: "Active", nextRun: "Tomorrow, 08:00 AM", agent: "Research Assistant" },
  { id: 2, name: "Weekly Codebase Backup", schedule: "0 2 * * 0", status: "Active", nextRun: "Sunday, 02:00 AM", agent: "System Admin" },
  { id: 3, name: "Crypto Price Alerts", schedule: "*/15 * * * *", status: "Paused", nextRun: "-", agent: "Data Analyst" },
];

const WORKFLOW_TEMPLATES = [
  { id: "tmpl-1", name: "News Reader -> Email Summary", icon: Network, desc: "Search the web, summarize news, format into HTML, and dispatch email." },
  { id: "tmpl-2", name: "Code Review Pipeline", icon: Workflow, desc: "Monitor git changes, run linter, write AI review, post PR comment." },
];

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<"cron" | "orchestration">("cron");
  const [jobs, setJobs] = useState(INITIAL_CRON_JOBS);
  const [isCronModalOpen, setIsCronModalOpen] = useState(false);
  const { t } = useLanguage();

  // Form State
  const [taskName, setTaskName] = useState("");
  const [cronExpr, setCronExpr] = useState("0 9 * * *");
  const [selectedAgent, setSelectedAgent] = useState("");

  const handleCreateCron = () => {
    if (!taskName) {
      toast.error(t('tasks.nameRequired'));
      return;
    }
    const newJob = {
      id: Date.now(),
      name: taskName,
      schedule: cronExpr,
      status: t('tasks.active'),
      nextRun: t('tasks.calculating'),
      agent: selectedAgent || t('tasks.defaultAgent')
    };
    setJobs([...jobs, newJob]);
    setIsCronModalOpen(false);
    toast.success(`${t('tasks.taskCreated')} "${taskName}"`);
    setTaskName("");
    setCronExpr("0 9 * * *");
    setSelectedAgent("");
  };

  const handleTestRun = (name: string) => {
    toast(`${t('tasks.testRunTriggered')}: ${name}`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background text-foreground">
      {/* Page Header */}
      <div className="shrink-0 p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('tasks.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('tasks.subtitle')}</p>
          </div>
          <button
            onClick={() => setIsCronModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20"
          >
            <Plus className="w-4 h-4" />
            {t('tasks.newTask')}
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex items-center gap-6 border-b border-border">
          <button
            onClick={() => setActiveTab("cron")}
            className={clsx(
              "pb-3 text-sm font-medium transition-colors relative flex items-center gap-2",
              activeTab === "cron" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="w-4 h-4" />
            {t('tasks.scheduledTasks')}
            {activeTab === "cron" && (
              <motion.div layoutId="taskTabIndicator" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary-hover rounded-t-md" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("orchestration")}
            className={clsx(
              "pb-3 text-sm font-medium transition-colors relative flex items-center gap-2",
              activeTab === "orchestration" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Workflow className="w-4 h-4" />
            {t('tasks.orchestration')}
            {activeTab === "orchestration" && (
              <motion.div layoutId="taskTabIndicator" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary-hover rounded-t-md" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-scrollbar-thumb">
        {activeTab === "cron" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-5xl">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-card/50 text-muted-foreground border-b border-border">
                    <th className="font-medium p-4 py-3">{t('tasks.taskName')}</th>
                    <th className="font-medium p-4 py-3">{t('tasks.schedule')}</th>
                    <th className="font-medium p-4 py-3">{t('tasks.assignedAgent')}</th>
                    <th className="font-medium p-4 py-3">{t('tasks.nextRun')}</th>
                    <th className="font-medium p-4 py-3">{t('tasks.status')}</th>
                    <th className="font-medium p-4 py-3 text-right">{t('tasks.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-secondary/30 transition-colors group">
                      <td className="p-4 py-3 font-medium text-foreground flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground/50" />
                        {job.name}
                      </td>
                      <td className="p-4 py-3">
                        <span className="font-mono text-xs bg-background px-2 py-1 rounded text-primary border border-border">
                          {job.schedule}
                        </span>
                      </td>
                      <td className="p-4 py-3 text-muted-foreground flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-secondary border border-border-hover flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        </div>
                        {job.agent}
                      </td>
                      <td className="p-4 py-3 text-muted-foreground text-xs">{job.nextRun}</td>
                      <td className="p-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={clsx("w-2 h-2 rounded-full", job.status === "Active" ? "bg-green-500" : "bg-muted-foreground/50")} />
                          <span className={clsx("text-xs font-medium", job.status === "Active" ? "text-green-400" : "text-muted-foreground/50")}>
                            {job.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 py-3">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleTestRun(job.name)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors" title="Test Run">
                            <PlayCircle className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors" title="Settings">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground/50">
                        {t('tasks.noTasks')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "orchestration" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-5xl">
            {/* Template Gallery */}
            <div>
              <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center gap-2 text-foreground">
                <Network className="w-5 h-5 text-primary-hover" />
                {t('tasks.commonWorkflows')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORKFLOW_TEMPLATES.map(tmpl => (
                  <div key={tmpl.id} className="bg-card border border-border rounded-xl p-5 hover:border-border-hover transition-colors group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-hover/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between relative z-10">
                      <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center shadow-inner group-hover:border-border-hover transition-colors">
                        <tmpl.icon className="w-5 h-5 text-primary" />
                      </div>
                      <button className="text-muted-foreground hover:text-white flex items-center gap-1 text-xs font-medium px-2 py-1 bg-secondary/50 rounded-md">
                        Use Template <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-4 relative z-10">
                      <h3 className="text-foreground font-medium mb-1">{tmpl.name}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{tmpl.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Workflow Builder Placeholder */}
            <div className="border border-dashed border-border rounded-xl bg-card/30 p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4 shadow-inner">
                <Workflow className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-foreground font-medium text-lg mb-1">{t('tasks.visualBuilder')}</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
                {t('tasks.visualBuilderDesc')}
              </p>
              <button onClick={() => toast(t('tasks.openingBuilder'))} className="px-5 py-2.5 bg-foreground hover:bg-white text-background rounded-lg text-sm font-semibold transition-colors shadow-sm">
                {t('tasks.launchEditor')}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <Modal isOpen={isCronModalOpen} onClose={() => setIsCronModalOpen(false)} title={t('tasks.createScheduledTask')} width="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('tasks.taskName')}</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder={t('tasks.taskNamePlaceholder')}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary-hover/50 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5 flex justify-between">
              <span>{t('tasks.cronExpression')}</span>
              <span className="text-xs text-muted-foreground/50 font-mono">{t('tasks.cronFormat')}</span>
            </label>
            <input
              type="text"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              placeholder="0 9 * * *"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:border-primary-hover/50 focus:outline-none transition-colors"
            />
            <p className="text-xs text-muted-foreground/50 mt-1.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {t('tasks.cronExample')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t('tasks.assignedAgent')}</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary-hover/50 focus:outline-none transition-colors appearance-none"
            >
              <option value="" disabled>{t('tasks.selectAgent')}</option>
              <option value="Software Engineer">Software Engineer</option>
              <option value="Copywriter">Copywriter</option>
              <option value="Data Analyst">Data Analyst</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-border/80">
            <button
              onClick={() => setIsCronModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCreateCron}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors shadow-md"
            >
              {t('tasks.saveSchedule')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
