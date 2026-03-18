import { useState } from "react";
import { 
  Network, Plus, ArrowLeft, Play, Save, Settings, Trash2, 
  Users, Code, Search, MessageSquare, Database, FileText, 
  Globe, GitBranch, LayoutGrid, Clock, PenTool, ChevronRight, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import { toast } from "sonner";
import { Modal } from "../components/Modal";

// Block Types
type NodeType = "trigger" | "agent" | "skill" | "action";

interface Node {
  id: string;
  type: NodeType;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  nodes: Node[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Clock, Search, PenTool, Database, Code, Users, Play, Globe, FileText, MessageSquare, GitBranch, Zap
};

const INITIAL_WORKSPACES: Workspace[] = [
  { 
    id: '1', 
    name: 'Daily Tech Newsletter', 
    description: 'Searches latest AI news, summarizes with Copywriter Agent, and saves to database.', 
    updatedAt: '2 hours ago',
    nodes: [
      { id: 'n1', type: 'trigger', title: 'Schedule (Cron)', description: 'Runs daily at 8:00 AM', icon: 'Clock', color: 'text-zinc-400' },
      { id: 'n2', type: 'skill', title: 'Web Search', description: 'Query: "Latest AI technology news"', icon: 'Search', color: 'text-blue-400' },
      { id: 'n3', type: 'agent', title: 'Copywriter', description: 'Summarize into newsletter format', icon: 'PenTool', color: 'text-pink-500' },
      { id: 'n4', type: 'action', title: 'Save to DB', description: 'Insert into Newsletters table', icon: 'Database', color: 'text-amber-400' }
    ]
  },
  { 
    id: '2', 
    name: 'Auto PR Reviewer', 
    description: 'Triggers on GitHub PR, runs code execution sandbox, and posts review comments.', 
    updatedAt: 'Yesterday',
    nodes: [
      { id: 'n1', type: 'trigger', title: 'Webhook', description: 'Listen to GitHub PR events', icon: 'GitBranch', color: 'text-purple-400' },
      { id: 'n2', type: 'agent', title: 'Software Engineer', description: 'Analyze code diff', icon: 'Code', color: 'text-emerald-500' },
      { id: 'n3', type: 'action', title: 'Post Comment', description: 'Send review back to GitHub', icon: 'MessageSquare', color: 'text-blue-500' }
    ]
  }
];

const TOOLBOX_ITEMS = [
  { category: "Triggers", items: [
    { type: 'trigger', title: 'Schedule (Cron)', icon: 'Clock', color: 'text-zinc-400', description: 'Run on a timer' },
    { type: 'trigger', title: 'Webhook', icon: 'Globe', color: 'text-purple-400', description: 'Trigger via HTTP' }
  ]},
  { category: "Agents", items: [
    { type: 'agent', title: 'Software Engineer', icon: 'Code', color: 'text-emerald-500', description: 'Code analysis & writing' },
    { type: 'agent', title: 'Copywriter', icon: 'PenTool', color: 'text-pink-500', description: 'Content generation' },
    { type: 'agent', title: 'Data Analyst', icon: 'Database', color: 'text-blue-500', description: 'Data processing' }
  ]},
  { category: "Skills", items: [
    { type: 'skill', title: 'Web Search', icon: 'Search', color: 'text-blue-400', description: 'Search the internet' },
    { type: 'skill', title: 'Code Exec', icon: 'Code', color: 'text-green-400', description: 'Run scripts in sandbox' },
    { type: 'skill', title: 'Doc Reader', icon: 'FileText', color: 'text-rose-400', description: 'Parse PDF/Docx' }
  ]},
  { category: "Actions", items: [
    { type: 'action', title: 'Save to DB', icon: 'Database', color: 'text-amber-400', description: 'Store data' },
    { type: 'action', title: 'Send Message', icon: 'MessageSquare', color: 'text-blue-400', description: 'Slack/Discord/Email' }
  ]}
];

export function WorkflowsPage() {
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  // Builder State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isNodeModalOpen, setNodeModalOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState(-1); // -1 means append at end

  const openBuilder = (ws: Workspace) => {
    setActiveWorkspace(ws);
    setNodes(ws.nodes);
    setView('builder');
  };

  const createWorkspace = () => {
    const newWs: Workspace = {
      id: Date.now().toString(),
      name: 'Untitled Workflow',
      description: 'A new empty orchestration flow.',
      updatedAt: 'Just now',
      nodes: []
    };
    setWorkspaces([newWs, ...workspaces]);
    openBuilder(newWs);
  };

  const saveWorkspace = () => {
    if (activeWorkspace) {
      const updated = { ...activeWorkspace, nodes };
      setWorkspaces(workspaces.map(w => w.id === updated.id ? updated : w));
      toast.success('Workflow saved successfully.');
    }
  };

  const handleAddNodeRequest = (index: number) => {
    setInsertIndex(index);
    setNodeModalOpen(true);
  };

  const handleInsertNode = (template: any) => {
    const newNode: Node = {
      id: Date.now().toString(),
      type: template.type,
      title: template.title,
      description: template.description,
      icon: template.icon,
      color: template.color
    };
    
    const newNodes = [...nodes];
    if (insertIndex === -1) {
      newNodes.push(newNode);
    } else {
      newNodes.splice(insertIndex, 0, newNode);
    }
    setNodes(newNodes);
    setNodeModalOpen(false);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <LayoutGrid className="w-6 h-6 text-orange-500" />
                  Workspaces
                </h1>
                <p className="text-zinc-400 mt-1">Manage and orchestrate complex multi-agent workflows.</p>
              </div>
              <button
                onClick={createWorkspace}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20"
              >
                <Plus className="w-4 h-4" />
                New Workspace
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
              {workspaces.map((ws) => (
                <div 
                  key={ws.id}
                  onClick={() => openBuilder(ws)}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:shadow-lg hover:-translate-y-0.5 transition-all group cursor-pointer flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-inner">
                      <Network className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                      {ws.updatedAt}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100 mb-2 group-hover:text-orange-400 transition-colors">{ws.name}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-6 flex-1">
                    {ws.description}
                  </p>
                  
                  <div className="flex items-center gap-3 border-t border-zinc-800/80 pt-4">
                    <div className="flex -space-x-2">
                      {ws.nodes.slice(0, 4).map((n, i) => {
                        const Icon = ICON_MAP[n.icon] || Search;
                        return (
                          <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center shrink-0" title={n.title}>
                            <Icon className={clsx("w-3 h-3", n.color)} />
                          </div>
                        )
                      })}
                      {ws.nodes.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center shrink-0 text-[9px] font-bold text-zinc-400">
                          +{ws.nodes.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 font-medium">{ws.nodes.length} Blocks</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'builder' && (
          <motion.div 
            key="builder"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden bg-zinc-950"
          >
            {/* Builder Header */}
            <div className="h-14 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0 z-10 relative">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-zinc-700"></div>
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-orange-500" />
                  <input 
                    type="text" 
                    value={activeWorkspace?.name || ''} 
                    onChange={(e) => setActiveWorkspace(prev => prev ? {...prev, name: e.target.value} : null)}
                    className="bg-transparent border-none text-zinc-100 font-semibold focus:outline-none focus:ring-0 w-64 hover:bg-zinc-800/50 px-2 py-1 rounded transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toast("Running workflow sandbox...")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-sm font-medium transition-colors border border-zinc-700/50"
                >
                  <Play className="w-4 h-4 text-green-400" />
                  Test Run
                </button>
                <button 
                  onClick={saveWorkspace}
                  className="flex items-center gap-2 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>

            {/* Builder Main Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Toolbox Sidebar */}
              <div className="w-64 border-r border-zinc-800 bg-zinc-900/30 overflow-y-auto p-4 shrink-0 scrollbar-thin scrollbar-thumb-zinc-700 hidden md:block">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Components</h3>
                
                <div className="space-y-6">
                  {TOOLBOX_ITEMS.map((cat, i) => (
                    <div key={i}>
                      <h4 className="text-sm font-medium text-zinc-300 mb-2">{cat.category}</h4>
                      <div className="space-y-2">
                        {cat.items.map((item, j) => {
                          const Icon = ICON_MAP[item.icon] || Code;
                          return (
                            <div 
                              key={j}
                              className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/5 cursor-grab transition-colors"
                            >
                              <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                <Icon className={clsx("w-3.5 h-3.5", item.color)} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-zinc-200">{item.title}</div>
                                <div className="text-[10px] text-zinc-500">{item.description}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas Area */}
              <div className="flex-1 bg-zinc-950 overflow-y-auto p-8 flex flex-col items-center relative scrollbar-thin scrollbar-thumb-zinc-800 background-grid">
                {/* Background Pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                     style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}>
                </div>

                <div className="max-w-2xl w-full flex flex-col items-center py-10 relative z-10">
                  <AnimatePresence>
                    {nodes.length === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
                          <Zap className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-300 mb-2">Empty Workflow</h3>
                        <p className="text-zinc-500 text-sm mb-6 max-w-sm">Start building by adding a trigger or your first agent node.</p>
                        <button onClick={() => handleAddNodeRequest(-1)} className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-sm font-semibold transition-colors">
                          Add First Node
                        </button>
                      </motion.div>
                    )}

                    {nodes.map((node, index) => {
                      const Icon = ICON_MAP[node.icon] || Code;
                      const isTrigger = node.type === 'trigger';
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                          key={node.id} 
                          className="w-full relative flex flex-col items-center"
                        >
                          {/* Node Card */}
                          <div className={clsx(
                            "w-full max-w-lg bg-zinc-900 border rounded-xl p-4 shadow-xl flex items-center gap-4 group/node transition-colors hover:border-zinc-600 relative overflow-hidden",
                            isTrigger ? "border-zinc-700 bg-zinc-900/80" : "border-zinc-800"
                          )}>
                            {isTrigger && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500" />}
                            
                            <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner group-hover/node:border-zinc-700 transition-colors">
                              <Icon className={clsx("w-5 h-5", node.color)} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="text-[15px] font-semibold text-zinc-100 truncate">{node.title}</h4>
                                <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-500">
                                  {node.type}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 truncate">{node.description}</p>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity">
                              <button className="p-1.5 text-zinc-500 hover:text-orange-400 hover:bg-zinc-800 rounded transition-colors" title="Settings">
                                <Settings className="w-4 h-4" />
                              </button>
                              <button onClick={() => removeNode(node.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors" title="Remove">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Connection Line & Insert Button */}
                          {index < nodes.length - 1 && (
                            <div className="relative flex flex-col items-center my-1 py-2 group/line w-full h-12">
                              <div className="absolute top-0 bottom-0 w-0.5 bg-zinc-700 group-hover/line:bg-orange-500/50 transition-colors" />
                              <button 
                                onClick={() => handleAddNodeRequest(index + 1)}
                                className="absolute top-1/2 -translate-y-1/2 bg-zinc-800 border border-zinc-600 rounded-full p-1 opacity-0 group-hover/line:opacity-100 hover:bg-orange-500 hover:border-orange-500 text-zinc-400 hover:text-white transition-all z-10 shadow-lg scale-90 hover:scale-100"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}

                    {nodes.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 relative flex flex-col items-center">
                        <div className="w-0.5 h-6 bg-zinc-800 mb-1" />
                        <button 
                          onClick={() => handleAddNodeRequest(-1)}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-dashed border-zinc-700 hover:border-orange-500/50 hover:bg-orange-500/5 hover:text-orange-400 text-zinc-400 rounded-lg text-sm font-medium transition-all group"
                        >
                          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          Add Step
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select Node Modal */}
      <Modal isOpen={isNodeModalOpen} onClose={() => setNodeModalOpen(false)} title="Add Node" width="lg">
        <div className="space-y-6">
          {TOOLBOX_ITEMS.map((cat, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{cat.category}</h4>
              <div className="grid grid-cols-2 gap-3">
                {cat.items.map((item, j) => {
                  const Icon = ICON_MAP[item.icon] || Code;
                  return (
                    <button 
                      key={j}
                      onClick={() => handleInsertNode(item)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Icon className={clsx("w-4 h-4", item.color)} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-200 group-hover:text-orange-400 transition-colors">{item.title}</div>
                        <div className="text-[10px] text-zinc-500 truncate w-32">{item.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
