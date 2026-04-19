import { create } from 'zustand';

export type AgentState = 'idle' | 'walking' | 'working' | 'celebrating' | 'error' | 'confused';

export interface Agent {
  id: string;
  name: string;
  role: string;
  state: AgentState;
  lastMessage: string;
  progress: number;
}

export type PhaseStatus = 'pending' | 'running' | 'done' | 'error';

export interface AppPhase {
  id: string;
  label: string;
  status: PhaseStatus;
  startedAt?: number;
  endedAt?: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  agent: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}

interface AppStore {
  agents: Agent[];
  phases: AppPhase[];
  logs: LogEntry[];
  buildStatus: 'idle' | 'building' | 'done' | 'error';
  buildProgress: number;
  criticalError: string | null;
  outputFolder: string;
  prompt: string;

  setPrompt: (prompt: string) => void;
  setOutputFolder: (folder: string) => void;
  launchDive: () => void;
  dismissError: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  agents: [
    { id: '1', name: 'Archie', role: 'Planner', state: 'idle', lastMessage: 'Waiting for orders...', progress: 0 },
    { id: '2', name: 'Byron', role: 'Backend', state: 'idle', lastMessage: 'Servers standing by.', progress: 0 },
    { id: '3', name: 'Faye', role: 'Frontend', state: 'idle', lastMessage: 'DOM ready to paint.', progress: 0 },
    { id: '4', name: 'Sentry', role: 'Security', state: 'idle', lastMessage: 'Shields at 100%.', progress: 0 },
  ],
  phases: [
    { id: '1', label: 'Requirements Analysis', status: 'pending' },
    { id: '2', label: 'Architecture & DB Design', status: 'pending' },
    { id: '3', label: 'Backend Synthesis', status: 'pending' },
    { id: '4', label: 'Frontend Construction', status: 'pending' },
    { id: '5', label: 'Security & QA Pass', status: 'pending' },
    { id: '6', label: 'Vault Compilation', status: 'pending' },
  ],
  logs: [
    { id: 'l1', timestamp: Date.now() - 60000, agent: 'System', message: 'OctoForge initialized. All endpoints open.', level: 'info' }
  ],
  buildStatus: 'idle',
  buildProgress: 0,
  criticalError: null,
  outputFolder: '/Users/developer/Projects/GeneratedApp',
  prompt: '',

  setPrompt: (prompt) => set({ prompt }),
  setOutputFolder: (outputFolder) => set({ outputFolder }),
  
  // Dummy implementation for demo
  launchDive: () => {
    set({ 
      buildStatus: 'building', 
      buildProgress: 15,
      phases: useAppStore.getState().phases.map((p, i) => i === 0 ? { ...p, status: 'running', startedAt: Date.now() } : p),
      agents: useAppStore.getState().agents.map(a => a.role === 'Planner' ? { ...a, state: 'working', lastMessage: 'Analyzing user prompt...' } : { ...a, state: 'idle' }),
      logs: [
        ...useAppStore.getState().logs,
        { id: Date.now().toString(), timestamp: Date.now(), agent: 'System', message: 'Dive launched. Orchestrator awakened.', level: 'info' },
        { id: Date.now().toString()+1, timestamp: Date.now()+100, agent: 'Archie', message: 'Analyzing requirements...', level: 'info' }
      ]
    });
    
    // Simulate some progress
    setTimeout(() => {
      set(state => ({
        buildProgress: 45,
        phases: state.phases.map((p, i) => i === 0 ? { ...p, status: 'done', endedAt: Date.now() } : i === 1 ? { ...p, status: 'running', startedAt: Date.now() } : p),
        agents: state.agents.map(a => 
          a.role === 'Planner' ? { ...a, state: 'idle', lastMessage: 'Analysis complete.' } : 
          a.role === 'Backend' ? { ...a, state: 'working', lastMessage: 'Designing database schema...' } : a
        ),
        logs: [
          ...state.logs,
          { id: Date.now().toString(), timestamp: Date.now(), agent: 'Archie', message: 'Analysis complete. Handing off architecture.', level: 'info' },
          { id: Date.now().toString()+1, timestamp: Date.now(), agent: 'Byron', message: 'Spacedocks humming. Spinning up DB.', level: 'info' }
        ]
      }))
    }, 4000);
  },
  
  dismissError: () => set({ criticalError: null })
}));
