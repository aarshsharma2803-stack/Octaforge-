import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Monitor, FileSpreadsheet, AlertCircle, HelpCircle } from 'lucide-react';
import { useAppStore, Agent } from '@/lib/store';

function getRoleColor(role: string) {
  switch (role) {
    case 'Planner': return '#818cf8';
    case 'Backend': return '#2dd4bf';
    case 'Frontend': return '#fbbf24';
    case 'Security': return '#f43f5e';
    default: return '#f59e0b';
  }
}

function getRoleDescription(role: string) {
  switch (role) {
    case 'Planner': return 'Architects blueprint & spec';
    case 'Backend': return 'Implements API & Data';
    case 'Frontend': return 'Builds React UI/UX';
    case 'Security': return 'Audits & Hardens Code';
    default: return 'Support Protocol';
  }
}

function AgentIcon({ role, className }: { role: string; className?: string }) {
  const c = className || "w-5 h-5";
  switch (role) {
    case 'Planner': return <FileSpreadsheet className={`${c} text-[#818cf8]`} />;
    case 'Backend': return <Terminal className={`${c} text-[#2dd4bf]`} />;
    case 'Frontend': return <Monitor className={`${c} text-[#fbbf24]`} />;
    case 'Security': return <Shield className={`${c} text-[#f87171]`} />;
    default: return <div className={`${c} bg-slate-500 rounded-sm`} />;
  }
}

function VectorSquid({ state, color = "#f97316", className = "w-16 h-16" }: { state: string; color?: string; className?: string }) {
  const isError = state === 'error';
  const isConfused = state === 'confused';
  const isCelebrating = state === 'celebrating';

  return (
    <svg viewBox="0 0 48 48" className={`${className} overflow-visible drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]`}>
      {isCelebrating && (
        <>
          <path d="M 12 24 C 6 18, 6 10, 10 6" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
          <path d="M 36 24 C 42 18, 42 10, 38 6" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
        </>
      )}
      <path
        d="M 10 28
           C 10 10, 38 10, 38 28
           Q 38 34 34.5 34
           Q 31 34 31 28
           Q 31 34 27.5 34
           Q 24 34 24 28
           Q 24 34 20.5 34
           Q 17 34 17 28
           Q 17 34 13.5 34
           Q 10 34 10 28 Z"
        fill={color}
        stroke="#0f172a"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {isCelebrating && (
        <>
          <path d="M 12 24 C 6 18, 6 10, 10 6" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 36 24 C 42 18, 42 10, 38 6" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      <circle cx="18" cy="22" r="2.5" fill="#0f172a" />
      <circle cx="30" cy="22" r="2.5" fill="#0f172a" />
      <circle cx="17.2" cy="21.2" r="1" fill="#fff" />
      <circle cx="29.2" cy="21.2" r="1" fill="#fff" />
      {isError ? (
        <path d="M 21 28 Q 24 25 27 28" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : isConfused ? (
        <path d="M 22 26 L 26 26" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      ) : isCelebrating ? (
        <path d="M 21 26 Q 24 30 27 26 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M 22 26 Q 24 29 26 26" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

function AgentCodeViewer({ agent, roleColor, onClose, cornerClass }: { agent: Agent; roleColor: string; onClose: () => void; cornerClass: string }) {
  const agentCode = useAppStore(state => state.agentCode);
  const liveCode = agentCode[agent.name.toLowerCase()] || '';
  const isStreaming = agent.state === 'working' && liveCode.length > 0;

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as code streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [liveCode]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className={`absolute ${cornerClass} w-[340px] rounded-xl border bg-[#050b14]/98 backdrop-blur-2xl flex flex-col overflow-hidden shadow-2xl pointer-events-auto z-[100]`}
      style={{ borderColor: `${roleColor}50`, boxShadow: `0 20px 40px -10px rgba(0,0,0,0.8), 0 0 30px -10px ${roleColor}60` }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e293b]/80 bg-[#020617]/80 justify-between relative shrink-0">
        <div className="flex items-center gap-2 z-10">
          <div className="flex gap-1.5 cursor-pointer group" onClick={onClose} title="Close">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] border border-[#ef4444]/50 group-hover:bg-red-400 transition-colors"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-[#f59e0b]/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-[#22c55e]/50"></div>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest ml-2 uppercase" style={{ color: roleColor, textShadow: `0 0 10px ${roleColor}80` }}>
            {agent.name.toLowerCase()}_{agent.state === 'working' ? 'active' : 'idle'}.log
          </span>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: roleColor, boxShadow: `0 0 8px ${roleColor}` }}></span>
            <span className="text-[8px] font-mono uppercase tracking-wider font-bold" style={{ color: roleColor }}>Live</span>
          </div>
        )}
      </div>

      {/* Code area */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 font-mono text-[9.5px] leading-[1.6] overflow-y-auto text-left"
        style={{ maxHeight: '280px', minHeight: '140px' }}
      >
        {liveCode ? (
          <div className="relative">
            {/* Scan line effect */}
            {isStreaming && (
              <motion.div
                animate={{ top: ['-5%', '105%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-6 bg-gradient-to-b from-transparent via-white/[0.025] to-transparent pointer-events-none z-10"
              />
            )}
            <pre
              className="whitespace-pre-wrap break-all text-[#a5f3fc] relative z-0"
              style={{ textShadow: isStreaming ? `0 0 6px ${roleColor}50` : undefined }}
            >
              {liveCode}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                  className="inline-block w-[7px] h-[11px] ml-[1px] align-text-bottom rounded-[1px]"
                  style={{ backgroundColor: roleColor, boxShadow: `0 0 8px ${roleColor}` }}
                />
              )}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-[#1e293b]">
            {/* Placeholder skeleton lines when idle */}
            <div style={{ color: roleColor }} className="opacity-60 mb-1">{'// ' + agent.role.toLowerCase() + ' terminal — click agent to open'}</div>
            {agent.state === 'working' ? (
              <div className="text-[#64748b] flex items-center gap-2">
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                  ●
                </motion.span>
                <span>{agent.lastMessage}</span>
              </div>
            ) : (
              <div className="text-[#334155] italic">Waiting for task allocation...</div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 border-t border-[#0f172a] bg-[#020617]/60 flex items-center justify-between shrink-0">
        <span className="text-[8px] font-mono text-[#334155] uppercase tracking-wider">{agent.role}</span>
        <span className="text-[8px] font-mono" style={{ color: `${roleColor}80` }}>
          {liveCode.length > 0 ? `${liveCode.length.toLocaleString()} chars` : agent.state}
        </span>
      </div>
    </motion.div>
  );
}

function AgentSprite({ agent, positionClass, isTerminalOpen, onToggleTerminal }: {
  agent: Agent;
  positionClass: string;
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
}) {
  const isWorking = agent.state === 'working';
  const isError = agent.state === 'error';
  const isConfused = agent.state === 'confused';
  const isCelebrating = agent.state === 'celebrating';
  const isWalking = agent.state === 'walking';

  const roleColor = getRoleColor(agent.role);
  const bodyColor = isError ? '#ef4444' : roleColor;

  return (
    <div className={`absolute ${positionClass} flex flex-col items-center pointer-events-none group z-30 w-32 h-32`}>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border border-dashed pointer-events-none" style={{ borderColor: `${roleColor}30` }}>
        <motion.div
          animate={{ rotateZ: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="w-full h-full rounded-full border-2 border-transparent border-t-current opacity-30"
          style={{ color: roleColor }}
        />
        {isWorking && (
          <motion.div
            animate={{ rotateZ: -360, scale: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full border border-current opacity-50"
            style={{ color: roleColor }}
          />
        )}
      </div>

      <div className="absolute top-0 w-[180px] -translate-y-[110%] flex justify-center pointer-events-none z-40">
        <motion.div
          animate={{
            opacity: agent.state === 'idle' ? 0.0 : 1,
            y: agent.state === 'idle' ? 5 : 0,
            scale: agent.state === 'idle' ? 0.95 : 1
          }}
          className="bg-[#020617]/90 backdrop-blur-xl border text-[11px] font-medium text-slate-100 px-3 py-2 rounded-lg text-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] pointer-events-auto transition-all duration-300 relative truncate w-full"
          style={{
            borderColor: isWorking ? `${roleColor}80` : '#1e293b',
            boxShadow: isWorking ? `0 0 20px -5px ${roleColor}` : undefined
          }}
        >
          {isError && <AlertCircle className="w-3.5 h-3.5 text-red-500 inline mr-1.5 align-text-bottom" />}
          {isConfused && <HelpCircle className="w-3.5 h-3.5 text-amber-400 inline mr-1.5 align-text-bottom" />}
          {agent.lastMessage}
          {isWorking && (
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: roleColor, boxShadow: `0 0 8px ${roleColor}` }}
            />
          )}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#020617]/90 border-b border-r rotate-45" style={{ borderColor: isWorking ? `${roleColor}80` : '#1e293b' }}></div>
        </motion.div>
      </div>

      <div
        className="relative mt-8 flex-1 flex items-center justify-center pointer-events-auto cursor-pointer hover:scale-105 transition-transform duration-300"
        onClick={onToggleTerminal}
      >
        {isCelebrating && (
          <motion.div
            animate={{ y: [-5, -15, -5], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl z-20"
          >
            ⭐
          </motion.div>
        )}
        {isConfused && (
          <motion.div
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-4 -right-2 text-3xl font-black text-amber-400 z-20 drop-shadow-lg"
          >
            ?
          </motion.div>
        )}
        {isError && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            className="absolute -top-4 -right-2 text-3xl font-black text-red-500 z-20 drop-shadow-lg"
          >
            !
          </motion.div>
        )}

        <motion.div
          animate={
            isWalking ? { y: [-3, 3, -3], rotate: [-6, 6, -6] } :
            isWorking ? { y: [-1.5, 1.5, -1.5] } :
            isError ? { x: [-4, 4, -4, 4, 0] } :
            isCelebrating ? { y: [0, -15, 0] } :
            { y: [-2, 2, -2] }
          }
          transition={{
            duration: isWalking ? 0.3 : isWorking ? 0.8 : isError ? 0.2 : isCelebrating ? 0.5 : 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative pointer-events-auto flex items-center justify-center w-full h-full"
        >
          <VectorSquid state={agent.state} color={bodyColor} className="w-16 h-16" />
          {isWorking && (
            <>
              <motion.div
                animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 m-auto w-20 h-20 rounded-full blur-[14px] z-[-1]"
                style={{ backgroundColor: roleColor }}
              />
              <motion.div
                animate={{ rotate: [-20, 20, -20] }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="absolute bottom-2 -right-1 text-xl origin-bottom-left"
              >
                🔧
                <motion.div
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: [0, -10, -20] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="absolute -top-2 -right-1 text-xs font-bold drop-shadow-md"
                  style={{ color: roleColor }}
                >
                  ✨
                </motion.div>
              </motion.div>
            </>
          )}
        </motion.div>

        <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-white/20 transition-colors duration-300 pointer-events-none scale-125" />
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-3 rounded-[100%] blur-[4px] pointer-events-none transition-all duration-300"
          style={{
            backgroundColor: isWorking ? `${roleColor}30` : isError ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.5)',
            boxShadow: isWorking ? `0 0 15px ${roleColor}60` : 'none'
          }}
        />
      </div>

      <div
        className="absolute -bottom-11 flex flex-col items-center pointer-events-auto w-[160px] z-[50] cursor-pointer hover:scale-105 transition-transform"
        onClick={onToggleTerminal}
      >
        <div
          className="px-3.5 py-1.5 rounded-full bg-[#020617]/95 border shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 backdrop-blur-xl relative z-10 transition-colors duration-300"
          style={{
            borderColor: isWorking ? `${roleColor}aa` : '#1e293b',
            boxShadow: isWorking ? `0 0 15px ${roleColor}30, inset 0 0 8px ${roleColor}20` : undefined
          }}
        >
          <AgentIcon role={agent.role} className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold tracking-[0.15em] text-[#f8fafc] uppercase leading-none">
            {agent.name}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-center w-full">
          <span
            className="text-[7.5px] font-mono tracking-widest uppercase font-bold px-2 py-0.5 whitespace-nowrap"
            style={{ color: roleColor, textShadow: `0 0 8px ${roleColor}60` }}
          >
            {getRoleDescription(agent.role)}
          </span>
        </div>
      </div>
    </div>
  );
}

function DataLink({ x1, y1, x2, y2, active, color }: { x1: number; y1: number; x2: number; y2: number; active: boolean; color: string }) {
  const pathLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e293b" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" opacity={active ? "0.2" : "0.05"} strokeLinecap="round" />
      {active && (
        <>
          <motion.line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`15 ${pathLength / 4}`}
            initial={{ strokeDashoffset: pathLength }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            opacity="0.7"
            style={{ filter: `blur(3px)` }}
            strokeLinecap="round"
          />
          <motion.line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray={`15 ${pathLength / 4}`}
            initial={{ strokeDashoffset: pathLength }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            opacity="0.9"
            style={{ filter: `drop-shadow(0 0 5px ${color})` }}
            strokeLinecap="round"
          />
        </>
      )}
      <circle cx={x1} cy={y1} r="4" fill="#020617" stroke={color} strokeWidth="1.5" opacity={active ? 0.9 : 0.3} />
      <circle cx={x2} cy={y2} r="4" fill="#020617" stroke={color} strokeWidth="1.5" opacity={active ? 0.9 : 0.3} />
      {active && (
        <>
          <circle cx={x1} cy={y1} r="2" fill={color} style={{ filter: `blur(1px)` }} />
          <circle cx={x2} cy={y2} r="2" fill={color} style={{ filter: `blur(1px)` }} />
        </>
      )}
    </g>
  );
}

export default function DeepSeaStage() {
  const agents = useAppStore(state => state.agents);
  const buildStatus = useAppStore(state => state.buildStatus);
  const isBuilding = buildStatus === 'building';

  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  const planner = agents.find(a => a.role === 'Planner');
  const backend = agents.find(a => a.role === 'Backend');
  const frontend = agents.find(a => a.role === 'Frontend');
  const security = agents.find(a => a.role === 'Security');

  const activeAgent = agents.find(a => a.id === activeTerminalId) || null;
  const terminalCornerClass =
    activeAgent?.role === 'Planner' ? 'top-4 left-4'
    : activeAgent?.role === 'Backend' ? 'top-4 right-4'
    : activeAgent?.role === 'Frontend' ? 'bottom-4 left-4'
    : activeAgent?.role === 'Security' ? 'bottom-4 right-4'
    : 'top-4 right-4';

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#020617] via-[#031326] to-[#04253d] flex items-center justify-center"
      onClick={(e) => {
        // Click anywhere on stage background closes terminal
        if (activeTerminalId && e.target === e.currentTarget) setActiveTerminalId(null);
      }}
    >
      {/* Deep sea radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,40,60,0.6)_0%,rgba(2,6,23,1)_85%)] z-0 pointer-events-none" />

      {/* Caustic light rays from above */}
      <motion.div
        className="absolute -top-20 left-[10%] w-[50%] h-[120%] pointer-events-none z-0"
        animate={{ x: [-30, 30, -30], opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(180deg, rgba(125,211,252,0.35) 0%, rgba(125,211,252,0) 70%)',
          filter: 'blur(40px)',
          transform: 'skewX(-18deg)',
        }}
      />
      <motion.div
        className="absolute -top-20 right-[5%] w-[40%] h-[120%] pointer-events-none z-0"
        animate={{ x: [20, -20, 20], opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(180deg, rgba(45,212,191,0.3) 0%, rgba(45,212,191,0) 70%)',
          filter: 'blur(50px)',
          transform: 'skewX(15deg)',
        }}
      />

      {/* Rising bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(22)].map((_, i) => {
          const p1 = Math.abs(Math.sin(i * 23.1 + 1.3));
          const p2 = Math.abs(Math.sin(i * 41.7 + 2.9));
          const p3 = Math.abs(Math.sin(i * 67.9 + 5.2));
          const sizePx = 4 + Math.round(p1 * 10);
          const dur = 9 + p3 * 14;
          const leftPct = Number((p2 * 100).toFixed(1));
          const driftPx = Math.round((p3 - 0.5) * 60);
          const opacity = 0.15 + p1 * 0.25;
          return (
            <motion.div
              key={`bubble-${i}`}
              className="absolute rounded-full border border-cyan-200/40"
              style={{
                left: `${leftPct}%`,
                width: sizePx,
                height: sizePx,
                background: 'radial-gradient(circle at 30% 30%, rgba(186,230,253,0.8), rgba(125,211,252,0.1) 70%)',
                boxShadow: 'inset 0 0 2px rgba(255,255,255,0.6)',
              }}
              initial={{ y: '110%', opacity: 0 }}
              animate={{ y: '-15%', x: [0, driftPx, -driftPx, 0], opacity: [0, opacity, opacity, 0] }}
              transition={{ duration: dur, repeat: Infinity, delay: p1 * 8, ease: 'easeInOut' }}
            />
          );
        })}
      </div>

      {/* God-rays — volumetric shafts slicing down */}
      {[0.12, 0.32, 0.55, 0.78].map((leftFrac, i) => (
        <motion.div
          key={`ray-${i}`}
          className="absolute top-0 pointer-events-none z-0"
          style={{
            left: `${leftFrac * 100}%`,
            width: '160px',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(186,230,253,0.22) 0%, rgba(186,230,253,0) 85%)',
            filter: 'blur(28px)',
            transform: `skewX(${[-12, 8, -6, 14][i]}deg)`,
            mixBlendMode: 'screen',
          }}
          animate={{ opacity: [0.25, 0.55, 0.25], x: [-10, 10, -10] }}
          transition={{ duration: 7 + i * 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.9 }}
        />
      ))}

      {/* Plankton — tiny floating motes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(60)].map((_, i) => {
          const p1 = Math.abs(Math.sin(i * 13.7 + 0.5));
          const p2 = Math.abs(Math.sin(i * 29.3 + 1.7));
          const p3 = Math.abs(Math.sin(i * 51.9 + 3.1));
          const size = 1 + p1 * 2;
          const x = Number((p2 * 100).toFixed(1));
          const y = Number((p3 * 100).toFixed(1));
          const dur = 14 + p1 * 18;
          return (
            <motion.div
              key={`plk-${i}`}
              className="absolute rounded-full bg-cyan-200"
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, filter: 'blur(0.3px)' }}
              animate={{
                x: [0, (p2 - 0.5) * 40, (p3 - 0.5) * 30, 0],
                y: [0, (p3 - 0.5) * 30, (p1 - 0.5) * 40, 0],
                opacity: [0.15, 0.6, 0.2, 0.45],
              }}
              transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay: p1 * 5 }}
            />
          );
        })}
      </div>

      {/* Fish shoals — swim across behind everything */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(7)].map((_, i) => {
          const p1 = Math.abs(Math.sin(i * 19.3 + 2.1));
          const p2 = Math.abs(Math.sin(i * 37.7 + 4.5));
          const dir = i % 2 === 0 ? 1 : -1;
          const topPct = 15 + p1 * 60;
          const dur = 30 + p2 * 35;
          const scale = 0.6 + p1 * 0.8;
          const tint = ['#7dd3fc', '#67e8f9', '#5eead4', '#93c5fd', '#a5f3fc'][i % 5];
          const delay = -p2 * dur; // stagger so they don't all start together
          return (
            <motion.div
              key={`fish-${i}`}
              className="absolute"
              style={{ top: `${topPct}%`, opacity: 0.55 }}
              initial={{ x: dir > 0 ? '-10vw' : '110vw' }}
              animate={{ x: dir > 0 ? '110vw' : '-10vw' }}
              transition={{ duration: dur, repeat: Infinity, ease: 'linear', delay }}
            >
              {/* Flip wrapper — static, survives parent translate */}
              <div style={{ transform: `scaleX(${-dir})` }}>
              {/* Gentle vertical bob */}
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 2 + p1, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transform: `scale(${scale})` }}
              >
                {i % 3 === 0 ? (
                  // Small shoal — 3 fish grouped
                  <svg width="60" height="24" viewBox="0 0 60 24">
                    {[0, 22, 44].map((x, j) => (
                      <g key={j} transform={`translate(${x}, ${j === 1 ? 6 : 0})`}>
                        <path d="M0,6 Q5,0 12,6 Q5,12 0,6 Z M12,6 L18,2 L18,10 Z" fill={tint} opacity="0.75" />
                        <circle cx="4" cy="5" r="0.8" fill="#0f172a" />
                      </g>
                    ))}
                  </svg>
                ) : (
                  // Single fish
                  <svg width="36" height="18" viewBox="0 0 36 18">
                    <path d="M0,9 Q8,0 20,9 Q8,18 0,9 Z" fill={tint} opacity="0.8" />
                    <path d="M20,9 L30,3 L30,15 Z" fill={tint} opacity="0.7" />
                    <circle cx="6" cy="8" r="1" fill="#0f172a" />
                    <path d="M8,9 Q14,7 18,9" stroke={tint} strokeWidth="0.4" fill="none" opacity="0.5" />
                  </svg>
                )}
              </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Jellyfish — pulse and drift up */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[
          { left: '12%', delay: 0, hue: '#a5f3fc', size: 42 },
          { left: '78%', delay: 8, hue: '#ddd6fe', size: 34 },
          { left: '45%', delay: 16, hue: '#bae6fd', size: 50 },
        ].map((j, i) => (
          <motion.div
            key={`jelly-${i}`}
            className="absolute"
            style={{ left: j.left, width: j.size, opacity: 0.45 }}
            initial={{ y: '110%' }}
            animate={{ y: '-20%', x: [-15, 15, -15] }}
            transition={{
              y: { duration: 38, repeat: Infinity, ease: 'linear', delay: j.delay },
              x: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <motion.svg
              viewBox="0 0 50 90"
              animate={{ scaleY: [1, 0.85, 1], scaleX: [1, 1.1, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: `drop-shadow(0 0 10px ${j.hue}88)` }}
            >
              <path d="M5,30 Q5,5 25,5 Q45,5 45,30 Q45,35 40,35 L10,35 Q5,35 5,30 Z" fill={j.hue} opacity="0.55" />
              <path d="M10,35 Q8,50 12,70 M18,35 Q16,55 20,80 M25,35 Q25,60 25,85 M32,35 Q34,55 30,78 M40,35 Q42,50 38,72"
                stroke={j.hue} strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" />
            </motion.svg>
          </motion.div>
        ))}
      </div>

      {/* Swaying kelp strands — left and right */}
      <div className="absolute bottom-0 left-0 h-[55%] w-full pointer-events-none z-0 overflow-hidden">
        {[
          { left: '3%', height: 220, delay: 0, hue: '#0e7490' },
          { left: '8%', height: 180, delay: 1.2, hue: '#134e4a' },
          { left: '14%', height: 260, delay: 0.6, hue: '#0c4a6e' },
          { left: '88%', height: 240, delay: 0.3, hue: '#134e4a' },
          { left: '93%', height: 200, delay: 1.5, hue: '#0e7490' },
          { left: '97%', height: 280, delay: 0.9, hue: '#0c4a6e' },
        ].map((k, i) => (
          <motion.svg
            key={`kelp-${i}`}
            className="absolute bottom-0"
            style={{ left: k.left, height: k.height, width: 40, opacity: 0.7, transformOrigin: 'bottom center' }}
            viewBox="0 0 40 300"
            preserveAspectRatio="none"
            animate={{ rotate: [-3, 3, -3], skewX: [-2, 2, -2] }}
            transition={{ duration: 5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: k.delay }}
          >
            <path
              d="M20,300 Q14,240 22,200 Q28,160 18,120 Q10,80 22,40 Q26,20 20,0"
              stroke={k.hue} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.8"
            />
            {[60, 120, 180, 240].map((y, j) => (
              <ellipse key={j} cx={j % 2 === 0 ? 26 : 14} cy={y} rx="7" ry="3" fill={k.hue} opacity="0.6" />
            ))}
          </motion.svg>
        ))}
      </div>

      {/* Coral clusters along seafloor */}
      <div className="absolute bottom-0 left-0 w-full h-[90px] pointer-events-none z-0">
        {[
          { left: '18%', scale: 1 },
          { left: '32%', scale: 0.8 },
          { left: '55%', scale: 1.1 },
          { left: '68%', scale: 0.9 },
          { left: '82%', scale: 1 },
        ].map((c, i) => (
          <div key={`coral-${i}`} className="absolute bottom-2" style={{ left: c.left, transform: `scale(${c.scale})` }}>
            <svg width="70" height="80" viewBox="0 0 70 80">
              {/* Branch coral */}
              <path d="M35,80 L35,40 M35,55 L20,30 M35,55 L50,32 M35,40 L28,20 M35,40 L44,22 M20,30 L14,15 M50,32 L56,18"
                stroke="#f472b6" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.55" />
              {/* Tube coral */}
              <circle cx="12" cy="72" r="6" fill="#f59e0b" opacity="0.5" />
              <circle cx="58" cy="74" r="5" fill="#fb7185" opacity="0.5" />
              {/* Anemone tendrils */}
              <g opacity="0.55">
                {[...Array(6)].map((_, j) => (
                  <motion.line
                    key={j}
                    x1={25 + j * 4} y1={80}
                    x2={25 + j * 4} y2={60}
                    stroke="#ec4899"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    animate={{ x2: [25 + j * 4 - 2, 25 + j * 4 + 2, 25 + j * 4 - 2] }}
                    transition={{ duration: 2 + j * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}
              </g>
            </svg>
          </div>
        ))}
      </div>

      {/* Seafloor silhouette */}
      <svg
        className="absolute bottom-0 left-0 w-full h-[80px] pointer-events-none z-0 opacity-80"
        viewBox="0 0 1000 80" preserveAspectRatio="none"
      >
        <path d="M0,80 L0,45 Q80,30 160,40 T320,35 Q400,25 480,42 T640,38 Q720,28 820,45 T1000,40 L1000,80 Z" fill="#020617" />
        <path d="M0,80 L0,60 Q100,52 200,58 T400,55 Q500,48 600,60 T800,55 Q900,48 1000,58 L1000,80 Z" fill="#000814" />
      </svg>

      {/* Vignette edges — tighten focus toward center */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,4,12,0.6) 100%)',
        }}
      />

      <motion.div
        className="absolute inset-0 opacity-[0.06] pointer-events-none z-0"
        animate={{ backgroundPositionY: ['0px', '50px'] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 2 }}
        style={{
          backgroundImage: `
            linear-gradient(to right, #6366f1 1px, transparent 1px),
            linear-gradient(to bottom, #6366f1 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: 'perspective(1000px) rotateX(65deg) scale(3) translateY(-100px)',
          transformOrigin: 'top center'
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(40)].map((_, i) => {
          const prng1 = Math.abs(Math.sin(i * 12.9898));
          const prng2 = Math.abs(Math.sin(i * 78.233));
          const prng3 = Math.abs(Math.sin(i * 45.123));
          const size = prng1 > 0.8 ? 'text-[10px]' : 'text-[8px]';
          const depthOpacity = Number((prng2 * 0.4 + 0.1).toFixed(2));
          const char = prng3 > 0.5 ? '1' : '0';

          return (
            <motion.div
              key={`dust-${i}`}
              className={`absolute font-mono text-[#38bdf8] ${size}`}
              style={{ opacity: depthOpacity }}
              initial={{ y: '110vh', x: Number((prng1 * 100).toFixed(1)) + 'vw' }}
              animate={{
                y: '-10vh',
                opacity: [0, depthOpacity * 2, 0],
                rotate: Number((prng2 * 180 - 90).toFixed(1))
              }}
              transition={{
                duration: Number((15 + prng3 * 20).toFixed(1)),
                repeat: Infinity,
                delay: Number((prng1 * 10).toFixed(1)),
                ease: 'linear'
              }}
            >
              {char}
            </motion.div>
          );
        })}
      </div>

      {/* Click-anywhere-to-close backdrop */}
      {activeTerminalId && (
        <div
          className="absolute inset-0 z-[5] cursor-pointer"
          onClick={() => setActiveTerminalId(null)}
        />
      )}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-8 z-10 w-full h-full max-h-screen">
        <div className="relative w-[500px] h-[500px] flex-shrink-0">
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
            {planner && <DataLink x1={250} y1={250} x2={250} y2={60} active={planner.state !== 'idle'} color={getRoleColor('Planner')} />}
            {frontend && <DataLink x1={250} y1={250} x2={60} y2={250} active={frontend.state !== 'idle'} color={getRoleColor('Frontend')} />}
            {backend && <DataLink x1={250} y1={250} x2={440} y2={250} active={backend.state !== 'idle'} color={getRoleColor('Backend')} />}
            {security && <DataLink x1={250} y1={250} x2={250} y2={440} active={security.state !== 'idle'} color={getRoleColor('Security')} />}
          </svg>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#4f46e5]/10 blur-[40px] pointer-events-none z-0"></div>

          {isBuilding && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#6366f1]/20 blur-[60px] rounded-full z-0 pointer-events-none"
            />
          )}

          <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10" style={{ perspective: '800px' }}>
            {isBuilding && (
              <>
                <motion.div
                  animate={{ rotateZ: 360, rotateX: [60, 75, 60], rotateY: [-15, 15, -15] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  className="absolute w-[200px] h-[200px] rounded-full border border-indigo-500/30 border-t-[#818cf8] border-l-[#818cf8]/50 shadow-[inset_0_0_20px_rgba(79,70,229,0.2)]"
                />
                <motion.div
                  animate={{ rotateZ: -360, rotateX: [75, 60, 75], rotateY: [15, -15, 15] }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  className="absolute w-[280px] h-[280px] rounded-full border border-indigo-500/20 border-b-[#2dd4bf]/80 border-r-[#2dd4bf]/40 border-dashed"
                />
              </>
            )}
            <motion.div
              animate={isBuilding ? { rotateZ: 360, scale: [1, 1.02, 1] } : { rotateZ: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute w-[380px] h-[380px] rounded-full border-[1px] border-[#818cf8]/15"
            />
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-10 w-full h-[150px] -translate-y-[45px]">
            <div className="absolute bottom-0 w-32 h-6 bg-black/90 rounded-[100%] blur-[6px]" />
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto z-20 group">
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative flex items-center justify-center drop-shadow-[0_0_30px_rgba(79,70,229,0.5)]"
            >
              <VectorSquid state="idle" color={isBuilding ? "#818cf8" : "#6366f1"} className="w-36 h-36 transition-colors duration-1000" />
              <motion.div
                animate={{ opacity: isBuilding ? [0.6, 1, 0.6] : 0.4 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-3 w-6 h-6 rounded-full bg-white blur-[4px] shadow-[0_0_20px_#ffffff,0_0_40px_#818cf8]"
              ></motion.div>
            </motion.div>
          </div>

          {planner && <AgentSprite agent={planner} positionClass="top-[2%] left-1/2 -translate-x-1/2" isTerminalOpen={activeTerminalId === planner.id} onToggleTerminal={() => setActiveTerminalId(activeTerminalId === planner.id ? null : planner.id)} />}
          {frontend && <AgentSprite agent={frontend} positionClass="top-1/2 -left-[6%] -translate-y-1/2" isTerminalOpen={activeTerminalId === frontend.id} onToggleTerminal={() => setActiveTerminalId(activeTerminalId === frontend.id ? null : frontend.id)} />}
          {backend && <AgentSprite agent={backend} positionClass="top-1/2 -right-[6%] -translate-y-1/2" isTerminalOpen={activeTerminalId === backend.id} onToggleTerminal={() => setActiveTerminalId(activeTerminalId === backend.id ? null : backend.id)} />}
          {security && <AgentSprite agent={security} positionClass="bottom-[2%] left-1/2 -translate-x-1/2" isTerminalOpen={activeTerminalId === security.id} onToggleTerminal={() => setActiveTerminalId(activeTerminalId === security.id ? null : security.id)} />}
        </div>
      </div>

      {/* Stage-level terminal overlay — fixed corner by role, no overlap with disc/sprites */}
      <AnimatePresence>
        {activeAgent && (
          <AgentCodeViewer
            key={activeAgent.id}
            agent={activeAgent}
            roleColor={getRoleColor(activeAgent.role)}
            onClose={() => setActiveTerminalId(null)}
            cornerClass={terminalCornerClass}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
