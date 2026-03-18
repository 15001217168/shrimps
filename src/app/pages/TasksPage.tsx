import { useState } from "react";
import { Plus, Clock, Play, MoreHorizontal, Settings, Calendar, PlayCircle, Workflow, Network, CheckCircle2, ChevronRight } from "lucide-react";
import { Modal } from "../components/Modal";
import { toast } from "sonner";
import { motion } from "motion/react";
import clsx from "clsx";

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

  // Form State
  const [taskName, setTaskName] = useState("");
  const [cronExpr, setCronExpr] = useState("0 9 * * *");
  const [selectedAgent, setSelectedAgent] = useState("");

  const handleCreateCron = () => {
    if (!taskName) {
      toast.error("Task name is required.");
      return;
    }
    const newJob = {
      id: Date.now(),
      name: taskName,
      schedule: cronExpr,
      status: "Active",
      nextRun: "Calculating...",
      agent: selectedAgent || "Default Agent"
    };
    setJobs([...jobs, newJob]);
    setIsCronModalOpen(false);
    toast.success(`Scheduled task "${taskName}" created.`);
    setTaskName("");
    setCronExpr("0 9 * * *");
    setSelectedAgent("");
  };

  const handleTestRun = (name: string) => {
    toast(`Triggered test run for: ${name}`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Page Header */}
      <div className="shrink-0 p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automation & Tasks</h1>
            <p className="text-zinc-400 mt-1">Manage scheduled cron jobs and multi-agent orchestrations.</p>
          </div>
          <button
            onClick={() => setIsCronModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="flex items-center gap-6 border-b border-zinc-800">
          <button 
            onClick={() => setActiveTab("cron")}
            className={clsx(
              "pb-3 text-sm font-medium transition-colors relative flex items-center gap-2",
              activeTab === "cron" ? "text-orange-400" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Clock className="w-4 h-4" />
            Scheduled Tasks
            {activeTab === "cron" && (
              <motion.div layoutId="taskTabIndicator" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500 rounded-t-md" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("orchestration")}
            className={clsx(
              "pb-3 text-sm font-medium transition-colors relative flex items-center gap-2",
              activeTab === "orchestration" ? "text-orange-400" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Workflow className="w-4 h-4" />
            Orchestration
            {activeTab === "orchestration" && (
              <motion.div layoutId="taskTabIndicator" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-orange-500 rounded-t-md" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {activeTab === "cron" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-5xl">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-900/50 text-zinc-500 border-b border-zinc-800">
                    <th className="font-medium p-4 py-3">Task Name</th>
                    <th className="font-medium p-4 py-3">Schedule (Cron)</th>
                    <th className="font-medium p-4 py-3">Assigned Agent</th>
                    <th className="font-medium p-4 py-3">Next Run</th>
                    <th className="font-medium p-4 py-3">Status</th>
                    <th className="font-medium p-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="p-4 py-3 font-medium text-zinc-100 flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        {job.name}
                      </td>
                      <td className="p-4 py-3">
                        <span className="font-mono text-xs bg-zinc-950 px-2 py-1 rounded text-orange-300 border border-zinc-800">
                          {job.schedule}
                        </span>
                      </td>
                      <td className="p-4 py-3 text-zinc-400 flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        </div>
                        {job.agent}
                      </td>
                      <td className="p-4 py-3 text-zinc-400 text-xs">{job.nextRun}</td>
                      <td className="p-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={clsx("w-2 h-2 rounded-full", job.status === "Active" ? "bg-green-500" : "bg-zinc-500")} />
                          <span className={clsx("text-xs font-medium", job.status === "Active" ? "text-green-400" : "text-zinc-500")}>
                            {job.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 py-3">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleTestRun(job.name)} className="p-1.5 text-zinc-400 hover:text-orange-400 hover:bg-zinc-800 rounded transition-colors" title="Test Run">
                            <PlayCircle className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors" title="Settings">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No scheduled tasks configured.
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
              <h2 className="text-lg font-medium tracking-tight mb-4 flex items-center gap-2 text-zinc-200">
                <Network className="w-5 h-5 text-orange-500" />
                Common Orchestration Workflows
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORKFLOW_TEMPLATES.map(tmpl => (
                  <div key={tmpl.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start justify-between relative z-10">
                      <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner group-hover:border-zinc-700 transition-colors">
                        <tmpl.icon className="w-5 h-5 text-orange-400" />
                      </div>
                      <button className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs font-medium px-2 py-1 bg-zinc-800/50 rounded-md">
                        Use Template <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-4 relative z-10">
                      <h3 className="text-zinc-100 font-medium mb-1">{tmpl.name}</h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">{tmpl.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Workflow Builder Placeholder */}
            <div className="border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-inner">
                <Workflow className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-zinc-200 font-medium text-lg mb-1">Visual Task Builder</h3>
              <p className="text-zinc-400 text-sm max-w-md mb-6 leading-relaxed">
                Connect multiple agents and skills using a drag-and-drop node interface. Create complex decision trees and pipelines.
              </p>
              <button onClick={() => toast("Opening Visual Builder...")} className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                Launch Node Editor
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <Modal isOpen={isCronModalOpen} onClose={() => setIsCronModalOpen(false)} title="Create Scheduled Task" width="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Task Name</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g., Morning Briefing"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5 flex justify-between">
              <span>Cron Expression</span>
              <span className="text-xs text-zinc-500 font-mono">Minute Hour Day Month Week</span>
            </label>
            <input
              type="text"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              placeholder="0 9 * * *"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:border-orange-500/50 focus:outline-none transition-colors"
            />
            <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Runs every day at 09:00 AM.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Assigned Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-orange-500/50 focus:outline-none transition-colors appearance-none"
            >
              <option value="" disabled>Select an agent to execute</option>
              <option value="Software Engineer">Software Engineer</option>
              <option value="Copywriter">Copywriter</option>
              <option value="Data Analyst">Data Analyst</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800/80">
            <button
              onClick={() => setIsCronModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCron}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
            >
              Save Schedule
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
