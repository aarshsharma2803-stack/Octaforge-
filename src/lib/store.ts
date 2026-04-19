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

export interface OllamaStatus {
  running: boolean;
  ready: boolean;
  available: string[];
  missing: string[];
}

export interface ConsensusMatrix {
  agents: string[];
  matrix: number[][];
  avg_alignment: number;
}

export interface QualityScores {
  files: Record<string, { dimensions: Record<string, number>; overall: number }>;
  overall: number;
  dimensions: Record<string, number>;
}

export interface VoiceEvent {
  agent: string;
  spoken_text: string;
  audio_b64?: string;
  has_audio: boolean;
}

export interface VoiceState {
  enabled: boolean;
  muted: boolean;
  currentSpeaker: string | null;
  subtitle: string | null;
  queue: VoiceEvent[];
}

export interface TimingState {
  elapsedS: number;
  phases: Record<string, number>;
  timeToSecurityS: number | null;
  totalS: number | null;
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
  ollamaStatus: OllamaStatus;
  /** Per-agent live code buffer — keyed by agent name (lowercase). Updated token-by-token during streaming. */
  agentCode: Record<string, string>;
  /** AI analytics — consensus matrix from agent embeddings */
  consensusMatrix: ConsensusMatrix | null;
  /** AI analytics — code quality scores from embeddings */
  qualityScores: QualityScores | null;
  /** Voice discussion state */
  voice: VoiceState;
  /** Build timing */
  timing: TimingState;

  setPrompt: (prompt: string) => void;
  setOutputFolder: (folder: string) => void;
  launchDive: () => void;
  dismissError: () => void;
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  updateAgent: (id: string, update: Partial<Agent>) => void;
  updatePhase: (id: string, update: Partial<AppPhase>) => void;
  setBuildStatus: (status: AppStore['buildStatus']) => void;
  setCriticalError: (error: string | null) => void;
  setOllamaStatus: (status: OllamaStatus) => void;
  clearAgentCode: (agentName: string) => void;
  appendAgentCode: (agentName: string, token: string) => void;
  setConsensusMatrix: (matrix: ConsensusMatrix) => void;
  setQualityScores: (scores: QualityScores) => void;
  enqueueVoice: (event: VoiceEvent) => void;
  dequeueVoice: () => VoiceEvent | undefined;
  setVoiceSpeaker: (agent: string | null, subtitle: string | null) => void;
  toggleVoiceMute: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
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
  ollamaStatus: { running: false, ready: false, available: [], missing: [] },
  agentCode: {},
  consensusMatrix: null,
  qualityScores: null,
  voice: { enabled: false, muted: false, currentSpeaker: null, subtitle: null, queue: [] },
  timing: { elapsedS: 0, phases: {}, timeToSecurityS: null, totalS: null },

  setPrompt: (prompt) => set({ prompt }),
  setOutputFolder: (outputFolder) => set({ outputFolder }),

  addLog: (entry) => set(state => ({
    logs: [...state.logs, { ...entry, id: Date.now().toString() + Math.random(), timestamp: Date.now() }]
  })),

  updateAgent: (id, update) => set(state => ({
    agents: state.agents.map(a => a.id === id ? { ...a, ...update } : a)
  })),

  updatePhase: (id, update) => set(state => ({
    phases: state.phases.map(p => p.id === id ? { ...p, ...update } : p)
  })),

  setBuildStatus: (status) => set({ buildStatus: status }),
  setCriticalError: (error) => set({ criticalError: error }),
  setOllamaStatus: (status) => set({ ollamaStatus: status }),

  clearAgentCode: (agentName) => set(state => ({
    agentCode: { ...state.agentCode, [agentName.toLowerCase()]: '' }
  })),

  setConsensusMatrix: (matrix) => set({ consensusMatrix: matrix }),
  setQualityScores: (scores) => set({ qualityScores: scores }),
  enqueueVoice: (event) => set(state => ({
    voice: { ...state.voice, queue: [...state.voice.queue, event] }
  })),
  dequeueVoice: () => {
    const state = get();
    const [next, ...rest] = state.voice.queue;
    set({ voice: { ...state.voice, queue: rest } });
    return next;
  },
  setVoiceSpeaker: (agent, subtitle) => set(state => ({
    voice: { ...state.voice, currentSpeaker: agent, subtitle }
  })),
  toggleVoiceMute: () => set(state => ({
    voice: { ...state.voice, muted: !state.voice.muted }
  })),

  appendAgentCode: (agentName, token) => set(state => {
    const key = agentName.toLowerCase();
    const current = state.agentCode[key] || '';
    // Keep last 6000 chars to avoid unbounded memory growth
    const next = (current + token).slice(-6000);
    return { agentCode: { ...state.agentCode, [key]: next } };
  }),

  // SSE-driven build — connects to Python sidecar
  launchDive: () => {
    const state = get();
    if (!state.prompt.trim() || !state.outputFolder.trim()) return;

    set({
      buildStatus: 'building',
      buildProgress: 0,
      criticalError: null,
      agentCode: {},
      consensusMatrix: null,
      qualityScores: null,
      timing: { elapsedS: 0, phases: {}, timeToSecurityS: null, totalS: null },
      phases: get().phases.map(p => ({ ...p, status: 'pending' as PhaseStatus, startedAt: undefined, endedAt: undefined })),
      agents: get().agents.map(a => ({ ...a, state: 'idle' as AgentState, lastMessage: 'Preparing...', progress: 0 })),
      logs: [{ id: 'start', timestamp: Date.now(), agent: 'System', message: 'Dive launched. Orchestrator awakened.', level: 'info' }],
    });

    const url = `http://localhost:8765/build/stream?prompt=${encodeURIComponent(state.prompt)}&folder=${encodeURIComponent(state.outputFolder)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { updateAgent, updatePhase, addLog, clearAgentCode, appendAgentCode } = get();

        const agentName = (data.agent || '').toLowerCase();

        // ── Live code streaming ──
        if (data.event === 'code_stream_start') {
          clearAgentCode(agentName);
          // Also set agent to working state
          const agent = get().agents.find(a => a.name.toLowerCase() === agentName);
          if (agent) updateAgent(agent.id, { state: 'working' as AgentState, lastMessage: data.message || 'Generating...' });
        } else if (data.event === 'code_stream') {
          // Append token to per-agent code buffer (this is called very frequently)
          if (data.token) appendAgentCode(agentName, data.token);
          else if (data.message) appendAgentCode(agentName, data.message);
        } else if (data.event === 'code_stream_end') {
          // Agent finished streaming — keep code visible, update state
          const agent = get().agents.find(a => a.name.toLowerCase() === agentName);
          if (agent) updateAgent(agent.id, { lastMessage: 'Generation complete.' });

        // ── Agent state updates ──
        } else if (data.event === 'agent_state') {
          const agent = get().agents.find(a => a.name.toLowerCase() === agentName);
          if (agent) {
            const newState = (data.state as AgentState) || agent.state;
            updateAgent(agent.id, { state: newState, lastMessage: data.message || agent.lastMessage });
          }

        // ── Feedback messages ──
        } else if (data.event === 'feedback') {
          const agent = get().agents.find(a => a.name.toLowerCase() === agentName);
          if (agent) {
            // Strip markdown symbols before displaying in UI bubbles
            const stripped = (data.message || '')
              .replace(/#{1,6}\s+/g, '')         // ### headings
              .replace(/\*{1,3}([^*]*)\*{1,3}/g, '$1') // **bold** / *italic*
              .replace(/`{1,3}[^`]*`{1,3}/g, '')  // `code`
              .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [link](url)
              .replace(/^[-*+]\s+/gm, '')          // bullet points
              .replace(/\s+/g, ' ')
              .trim();
            updateAgent(agent.id, { lastMessage: stripped.slice(0, 80) });
          }

        // ── Phase tracking ──
        } else if (data.event === 'round_start') {
          // Orchestrator 9-round protocol mapping:
          // 1=Analysis, 2=Discussion, 3=Consensus → Requirements
          // 4=Architecture → Architecture
          // 5=Backend → Backend
          // 6=Frontend → Frontend
          // 7=Security → Security
          // 8=Deployment, 9=Finalize → Vault
          const round = data.round as number;
          const phaseMap: Record<number, string> = {
            1: 'Requirements', 2: 'Requirements', 3: 'Requirements',
            4: 'Architecture',
            5: 'Backend',
            6: 'Frontend',
            7: 'Security',
            8: 'Vault', 9: 'Vault',
          };
          const label = phaseMap[round];
          if (label) {
            const phases = get().phases;
            const targetPhase = phases.find(p => p.label.toLowerCase().includes(label.toLowerCase()));
            if (targetPhase) {
              // Mark all currently-running phases as done first
              phases.forEach(p => {
                if (p.status === 'running' && p.id !== targetPhase.id) {
                  updatePhase(p.id, { status: 'done', endedAt: Date.now() });
                }
              });
              updatePhase(targetPhase.id, { status: 'running', startedAt: Date.now() });
            }
          }
        } else if (data.event === 'phase_start') {
          const phases = get().phases;
          const targetPhase = phases.find(p => p.label.toLowerCase().includes((data.phase || '').toLowerCase()));
          if (targetPhase) {
            phases.forEach(p => {
              if (p.status === 'running' && p.id !== targetPhase.id) {
                updatePhase(p.id, { status: 'done', endedAt: Date.now() });
              }
            });
            updatePhase(targetPhase.id, { status: 'running', startedAt: Date.now() });
          }
        } else if (data.event === 'phase_complete') {
          const phase = get().phases.find(p => p.label.toLowerCase().includes((data.phase || '').toLowerCase()));
          if (phase) updatePhase(phase.id, { status: 'done', endedAt: Date.now() });

        // ── Voice events ──
        } else if (data.event === 'voice_status') {
          set(state => ({ voice: { ...state.voice, enabled: data.available || false } }));
        } else if (data.event === 'voice_stream' || data.event === 'voice_text') {
          get().enqueueVoice({
            agent: data.agent || '',
            spoken_text: data.spoken_text || '',
            audio_b64: data.audio_b64,
            has_audio: data.has_audio || false,
          });

        // ── AI Analytics ──
        } else if (data.event === 'consensus_matrix') {
          get().setConsensusMatrix({
            agents: data.agents || [],
            matrix: data.matrix || [],
            avg_alignment: data.avg_alignment || 0,
          });
        } else if (data.event === 'quality_scores') {
          get().setQualityScores({
            files: data.files || {},
            overall: data.overall || 0,
            dimensions: data.dimensions || {},
          });

        // ── Timing ──
        } else if (data.event === 'timing') {
          set(state => ({
            timing: {
              elapsedS: data.elapsed_s || state.timing.elapsedS,
              phases: data.phases || state.timing.phases,
              timeToSecurityS: (data.phases && data.phases.reached_security) ?? state.timing.timeToSecurityS,
              totalS: state.timing.totalS,
            },
          }));

        // ── Build complete ──
        } else if (data.event === 'build_complete') {
          set(state => ({
            buildStatus: 'done',
            buildProgress: 100,
            phases: get().phases.map(p => ({ ...p, status: 'done' as PhaseStatus, endedAt: p.endedAt || Date.now() })),
            timing: {
              elapsedS: data.total_s || state.timing.elapsedS,
              phases: data.phase_times || state.timing.phases,
              timeToSecurityS: data.time_to_security_s ?? state.timing.timeToSecurityS,
              totalS: data.total_s || null,
            },
          }));
          get().agents.forEach(a => updateAgent(a.id, { state: 'celebrating' as AgentState, lastMessage: '🎉 Build complete!' }));
          eventSource.close();

        // ── Error ──
        } else if (data.event === 'error') {
          set({ buildStatus: 'error', criticalError: data.message });
          eventSource.close();
        }

        // Log most events (skip raw token stream to avoid log spam)
        if (data.message && data.agent && data.event !== 'code_stream') {
          addLog({ agent: data.agent, message: data.message.slice(0, 200), level: (data.level as LogEntry['level']) || 'info' });
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // Sidecar not running — run demo simulation
      eventSource.close();
      runDemoSimulation(set, get);
    };
  },

  dismissError: () => set({ criticalError: null }),
}));

// Demo simulation when sidecar is not running
function runDemoSimulation(
  _set: unknown,
  _get: unknown
) {
  const store = () => useAppStore.getState();
  const log = (agent: string, message: string, level: LogEntry['level'] = 'info') =>
    store().addLog({ agent, message, level });

  useAppStore.setState({
    phases: store().phases.map((p, i) => i === 0 ? { ...p, status: 'running' as PhaseStatus, startedAt: Date.now() } : p),
    agents: store().agents.map(a => a.role === 'Planner' ? { ...a, state: 'working' as AgentState, lastMessage: 'Analyzing user prompt...' } : a),
  });
  log('Archie', 'Analyzing requirements...');

  setTimeout(() => {
    useAppStore.setState({
      buildProgress: 30,
      phases: store().phases.map((p, i) =>
        i === 0 ? { ...p, status: 'done' as PhaseStatus, endedAt: Date.now() } :
        i === 1 ? { ...p, status: 'running' as PhaseStatus, startedAt: Date.now() } : p
      ),
      agents: store().agents.map(a =>
        a.role === 'Planner' ? { ...a, state: 'idle' as AgentState, lastMessage: 'Blueprint ready.' } :
        a.role === 'Backend' ? { ...a, state: 'working' as AgentState, lastMessage: 'Designing database schema...' } : a
      ),
    });
    log('Archie', 'Analysis complete. Architecture drafted.');
    log('Byron', 'Spacedocks humming. Spinning up DB schema.');
  }, 3500);

  // Voice discussion simulation
  const voiceLines: Array<{ delay: number; agent: string; text: string }> = [
    { delay: 1000, agent: 'orchestrator', text: "Alright team, so... we've got a new project coming in. Let me break down what we're looking at here." },
    { delay: 4500, agent: 'archie', text: "Hmm, okay so looking at this... I'm thinking we go with a pretty standard React plus FastAPI setup. Let me draft the blueprint." },
    { delay: 6500, agent: 'byron', text: "Right, so basically I'll need to set up the API routes and database models. I'll make sure the auth middleware is solid." },
    { delay: 8500, agent: 'faye', text: "Okay okay, so I see the blueprint and — ooh, this is gonna be fun. I'll build the components to match Byron's API exactly." },
    { delay: 10000, agent: 'sentry', text: "Hold on — I need to flag something. We need rate limiting on those AI endpoints. I'll do a full audit once everything's built." },
    { delay: 12000, agent: 'orchestrator', text: "Good call, Sentry. Alright, everyone knows their part. Let's build this thing." },
    { delay: 16500, agent: 'byron', text: "Backend's done. All routes are up, auth is locked down, database migrations are ready to go." },
    { delay: 18500, agent: 'faye', text: "Frontend's looking great! I've connected all of Byron's endpoints and the UI is responsive." },
    { delay: 20000, agent: 'sentry', text: "Audit complete. Score is 85 out of 100. A few medium issues but nothing critical. We're good to ship." },
  ];

  voiceLines.forEach(({ delay, agent, text }) => {
    setTimeout(() => {
      store().enqueueVoice({ agent, spoken_text: text, has_audio: false });
    }, delay);
  });

  // AI Analytics: Consensus matrix arrives after agent intentions
  setTimeout(() => {
    useAppStore.setState({
      consensusMatrix: {
        agents: ['Archie', 'Byron', 'Faye', 'Sentry'],
        matrix: [
          [1.0, 0.82, 0.76, 0.69],
          [0.82, 1.0, 0.88, 0.73],
          [0.76, 0.88, 1.0, 0.65],
          [0.69, 0.73, 0.65, 1.0],
        ],
        avg_alignment: 0.755,
      },
    });
    store().addLog({ agent: 'System', message: 'AI Analytics: Agent consensus matrix computed via embeddings', level: 'info' });
  }, 5000);

  setTimeout(() => {
    useAppStore.setState({
      buildProgress: 55,
      phases: store().phases.map((p, i) =>
        i === 1 ? { ...p, status: 'done' as PhaseStatus, endedAt: Date.now() } :
        i === 2 ? { ...p, status: 'running' as PhaseStatus, startedAt: Date.now() } : p
      ),
      agents: store().agents.map(a =>
        a.role === 'Backend' ? { ...a, state: 'working' as AgentState, lastMessage: 'Writing API routes...' } : a
      ),
    });
    log('Byron', 'FastAPI routes generated. Auth middleware injected.');
  }, 7000);

  setTimeout(() => {
    useAppStore.setState({
      buildProgress: 72,
      phases: store().phases.map((p, i) =>
        i === 2 ? { ...p, status: 'done' as PhaseStatus, endedAt: Date.now() } :
        i === 3 ? { ...p, status: 'running' as PhaseStatus, startedAt: Date.now() } : p
      ),
      agents: store().agents.map(a =>
        a.role === 'Backend' ? { ...a, state: 'idle' as AgentState, lastMessage: 'Backend complete.' } :
        a.role === 'Frontend' ? { ...a, state: 'working' as AgentState, lastMessage: 'Scaffolding React components...' } : a
      ),
    });
    log('Faye', 'Painting pixels. React tree initializing...');
  }, 11000);

  setTimeout(() => {
    useAppStore.setState({
      buildProgress: 88,
      phases: store().phases.map((p, i) =>
        i === 3 ? { ...p, status: 'done' as PhaseStatus, endedAt: Date.now() } :
        i === 4 ? { ...p, status: 'running' as PhaseStatus, startedAt: Date.now() } : p
      ),
      agents: store().agents.map(a =>
        a.role === 'Frontend' ? { ...a, state: 'idle' as AgentState, lastMessage: 'UI delivered.' } :
        a.role === 'Security' ? { ...a, state: 'working' as AgentState, lastMessage: 'Scanning for vulnerabilities...' } : a
      ),
    });
    log('Sentry', 'Initiating security audit... running OWASP checks.');
    log('Sentry', 'No SQL injection vectors found.', 'info');
    log('Sentry', 'JWT expiry properly configured.', 'info');
    log('Sentry', 'Recommend rate-limiting on /auth endpoint.', 'warning');
  }, 15000);

  setTimeout(() => {
    useAppStore.setState({
      buildProgress: 100,
      buildStatus: 'done',
      phases: store().phases.map((p, i) =>
        i === 4 ? { ...p, status: 'done' as PhaseStatus, endedAt: Date.now() } :
        i === 5 ? { ...p, status: 'done' as PhaseStatus, startedAt: Date.now() - 500, endedAt: Date.now() } : p
      ),
      agents: store().agents.map(a => ({ ...a, state: 'celebrating' as AgentState, lastMessage: 'Mission accomplished! 🎉' })),
    });
    log('System', 'Build complete! All files written to disk.');
    log('System', 'Knowledge graph generated at .brain/graph.html');
  }, 19000);

  // AI Analytics: Quality scores arrive near end
  setTimeout(() => {
    useAppStore.setState({
      qualityScores: {
        files: {
          'main.py': { dimensions: { structure: 82, security: 75, readability: 88, completeness: 79 }, overall: 81 },
          'routes/auth.py': { dimensions: { structure: 77, security: 91, readability: 73, completeness: 85 }, overall: 82 },
          'src/App.tsx': { dimensions: { structure: 85, security: 68, readability: 92, completeness: 80 }, overall: 81 },
          'src/components/Header.tsx': { dimensions: { structure: 90, security: 65, readability: 95, completeness: 72 }, overall: 80 },
          'models.py': { dimensions: { structure: 88, security: 82, readability: 86, completeness: 91 }, overall: 87 },
        },
        overall: 82,
        dimensions: { structure: 84, security: 76, readability: 87, completeness: 81 },
      },
    });
    store().addLog({ agent: 'System', message: 'AI Analytics: Code quality scored via embedding similarity — 82/100', level: 'info' });
  }, 17000);

}
