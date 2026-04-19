'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Monitor, FileSpreadsheet, AlertCircle, HelpCircle } from 'lucide-react';
import { useAppStore, Agent } from '@/lib/store';

// Helper to get agent specific color theme
function getRoleColor(role: string) {
  switch (role) {
    case 'Planner': return '#818cf8'; // indigo-400
    case 'Backend': return '#2dd4bf'; // teal-400
    case 'Frontend': return '#fbbf24'; // amber-400
    case 'Security': return '#f43f5e'; // rose-500
    default: return '#f59e0b'; // orange
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

function AgentIcon({ role, className }: { role: string, className?: string }) {
  const c = className || "w-5 h-5";
  switch (role) {
    case 'Planner': return <FileSpreadsheet className={`${c} text-[#818cf8]`} />;
    case 'Backend': return <Terminal className={`${c} text-[#2dd4bf]`} />;
    case 'Frontend': return <Monitor className={`${c} text-[#fbbf24]`} />;
    case 'Security': return <Shield className={`${c} text-[#f87171]`} />;
    default: return <div className={`${c} bg-slate-500 rounded-sm`} />;
  }
}

function VectorSquid({ state, color = "#f97316", className = "w-16 h-16" }: { state: string, color?: string, className?: string }) {
  const isWorking = state === 'working';
  const isError = state === 'error';
  const isConfused = state === 'confused';
  const isCelebrating = state === 'celebrating';

  return (
    <svg viewBox="0 0 48 48" className={`${className} overflow-visible drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]`}>
      {/* Celebrating Arms - Back */}
      {isCelebrating && (
        <>
          <path d="M 12 24 C 6 18, 6 10, 10 6" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
          <path d="M 36 24 C 42 18, 42 10, 38 6" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
        </>
      )}

      {/* Main Body */}
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
      
      {/* Celebrating Arms - Front */}
      {isCelebrating && (
        <>
          <path d="M 12 24 C 6 18, 6 10, 10 6" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 36 24 C 42 18, 42 10, 38 6" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* Eyes */}
      <circle cx="18" cy="22" r="2.5" fill="#0f172a" />
      <circle cx="30" cy="22" r="2.5" fill="#0f172a" />
      {/* Eye highlights */}
      <circle cx="17.2" cy="21.2" r="1" fill="#fff" />
      <circle cx="29.2" cy="21.2" r="1" fill="#fff" />

      {/* Mouth */}
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

function AgentCodeViewer({ agent, roleColor, onClose }: { agent: Agent, roleColor: string, onClose: () => void }) {
  // Determine placement based on role
  let placementClass = "";
  if (agent.role === 'Planner') placementClass = "top-0 left-[125%]";
  else if (agent.role === 'Backend') placementClass = "top-1/2 right-[125%] -translate-y-1/2";
  else if (agent.role === 'Frontend') placementClass = "top-1/2 left-[125%] -translate-y-1/2";
  else placementClass = "bottom-0 left-[125%]";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, x: agent.role === 'Backend' ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: agent.role === 'Backend' ? 20 : -20 }}
      className={`absolute ${placementClass} w-[260px] rounded-xl border bg-[#050b14]/95 backdrop-blur-2xl flex flex-col overflow-hidden shadow-2xl z-[100] pointer-events-auto`}
      style={{ borderColor: `${roleColor}50`, boxShadow: `0 20px 40px -10px rgba(0,0,0,0.8), 0 0 30px -10px ${roleColor}60` }}
    >
      {/* Title Bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e293b]/80 bg-[#020617]/80 justify-between relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ffffff05] to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 z-10">
          <div className="flex gap-1.5 cursor-pointer group" onClick={onClose} title="Close Terminal">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] border border-[#ef4444]/50 group-hover:bg-red-400 transition-colors"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-[#f59e0b]/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-[#22c55e]/50"></div>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest ml-2 uppercase" style={{ color: roleColor, textShadow: `0 0 10px ${roleColor}80` }}>
            {agent.role.toLowerCase()}_{agent.state === 'working' ? 'active' : 'idle'}.ts
          </span>
        </div>
        {agent.state === 'working' && (
          <div className="flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: roleColor, boxShadow: `0 0 8px ${roleColor}` }}></span>
            <span className="text-[8px] font-mono uppercase tracking-wider font-bold" style={{ color: roleColor }}>Sync</span>
          </div>
        )}
      </div>

      {/* Code Area */}
      <div className="p-4 font-mono text-[10px] leading-relaxed select-none overflow-hidden text-left relative min-h-[140px]">
        {/* Subtle scanline */}
        <motion.div 
          animate={{ top: ['-20%', '120%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent pointer-events-none z-0"
        />

        <div className="relative z-10">
          <div style={{ color: roleColor }} className="opacity-80">{'// Synthesizing ' + agent.role.toLowerCase() + ' routines...'}</div>
          <div className="h-2"></div>
          {agent.role === 'Planner' && (
            <>
              <div className="text-[#f472b6]">import <span className="text-white">&#123; architect &#125;</span> from <span className="text-[#86efac]">&apos;@/core/planner&apos;</span>;</div>
              <div className="text-white mt-1">const <span className="text-[#818cf8]">blueprint</span> = <span className="text-[#fef08a]">architect.parse</span>();</div>
            </>
          )}
          {agent.role === 'Frontend' && (
            <>
              <div className="text-[#f472b6]">import <span className="text-white">React</span> from <span className="text-[#86efac]">&apos;react&apos;</span>;</div>
              <div className="text-white mt-1">export function <span className="text-[#fef08a]">Component</span>() &#123;</div>
              <div className="ml-4 text-white">return <span className="text-[#86efac]">&lt;div/&gt;</span>;</div>
              <div className="text-white">&#125;</div>
            </>
          )}
          {agent.role === 'Backend' && (
            <>
              <div className="text-[#f472b6]">import <span className="text-white">express</span> from <span className="text-[#86efac]">&apos;express&apos;</span>;</div>
              <div className="text-[#818cf8] mt-1">const <span className="text-white">app</span> = <span className="text-[#fef08a]">express</span>();</div>
              <div className="text-white">app.<span className="text-[#fef08a]">listen</span>(<span className="text-[#fdba74]">3000</span>);</div>
            </>
          )}
          {agent.role === 'Security' && (
            <>
              <div className="text-[#f472b6]">import <span className="text-white">&#123; verify &#125;</span> from <span className="text-[#86efac]">&apos;crypto&apos;</span>;</div>
              <div className="text-white mt-1">const <span className="text-[#818cf8]">secure</span> = <span className="text-[#fef08a]">verify</span>(payload);</div>
            </>
          )}
          
          <div className="h-3"></div>
          {agent.state === 'working' ? (
            <>
              <div className="text-[#64748b] italic break-words whitespace-pre-wrap leading-tight">{'> ' + agent.lastMessage}</div>
              <motion.div 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-1.5 h-3 mt-1 inline-block align-middle rounded-sm"
                style={{ backgroundColor: roleColor, boxShadow: `0 0 8px ${roleColor}` }}
              />
            </>
          ) : (
            <div className="text-[#64748b] italic opacity-50">Waiting for task allocation...</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AgentSprite({ agent, positionClass, isTerminalOpen, onToggleTerminal }: { agent: Agent, positionClass: string, isTerminalOpen: boolean, onToggleTerminal: () => void }) {
  const isWorking = agent.state === 'working';
  const isError = agent.state === 'error';
  const isConfused = agent.state === 'confused';
  const isCelebrating = agent.state === 'celebrating';
  const isWalking = agent.state === 'walking';
  
  const roleColor = getRoleColor(agent.role);
  const bodyColor = isError ? '#ef4444' : roleColor;

  return (
    <div className={`absolute ${positionClass} flex flex-col items-center pointer-events-none group z-30 w-32 h-32`}>
      
      {/* HUD Emitter Base (God Mode floor projection) */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border border-dashed pointer-events-none transform rotateX-60 perspective-[500px]" style={{ borderColor: `${roleColor}30` }}>
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

      {/* Thought bubble */}
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
          
          {/* Active indicator dot inside the bubble */}
          {isWorking && (
             <motion.span 
               animate={{ opacity: [0.3, 1, 0.3] }} 
               transition={{ duration: 1.5, repeat: Infinity }}
               className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
               style={{ backgroundColor: roleColor, boxShadow: `0 0 8px ${roleColor}` }}
             />
          )}

          {/* Tail */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#020617]/90 border-b border-r rotate-45" style={{ borderColor: isWorking ? `${roleColor}80` : '#1e293b' }}></div>
        </motion.div>
      </div>

      {/* Main Sprite Area - Clickable to toggle terminal */}
      <div 
        className="relative mt-8 flex-1 flex items-center justify-center pointer-events-auto cursor-pointer hover:scale-105 transition-transform duration-300"
        onClick={onToggleTerminal}
      >
        {/* Status Accessories */}
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

        {/* Vector Body */}
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
          <VectorSquid state={agent.state} color={bodyColor} className="w-16 h-16" />          {/* Working Aura/Sparks */}
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
        
        {/* Hover ring indicator for clickability */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-white/20 transition-colors duration-300 pointer-events-none scale-125" />
        
        {/* Dynamic Shadow / Floor Ambient Glow */}
        <div 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-3 rounded-[100%] blur-[4px] pointer-events-none transition-all duration-300"
          style={{ 
            backgroundColor: isWorking ? `${roleColor}30` : isError ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.5)',
            boxShadow: isWorking ? `0 0 15px ${roleColor}60` : 'none'
          }}
        />
      </div>

      {/* Terminal Panel (God Mode Code Viewer for this specific agent) */}
      <AnimatePresence>
        {isTerminalOpen && (
           <AgentCodeViewer agent={agent} roleColor={roleColor} onClose={onToggleTerminal} />
        )}
      </AnimatePresence>

      {/* Sleek Cyberpunk Role Badge - Also clickable */}
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

// Tech Data Stream Line
function DataLink({ x1, y1, x2, y2, active, color }: { x1: number, y1: number, x2: number, y2: number, active: boolean, color: string }) {
  // Calculate dynamic dasharray to make pulses travel correctly
  const pathLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  
  return (
    <g>
      {/* Base tech track */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1e293b" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" opacity={active ? "0.2" : "0.05"} strokeLinecap="round" />
      
      {/* Activated flowing data beam */}
      {active && (
        <>
          {/* Main glow thick layer */}
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
          {/* Core bright laser ping */}
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
      
      {/* Node Endpoints (Sockets) */}
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
  const buildProgress = useAppStore(state => state.buildProgress);
  const buildStatus = useAppStore(state => state.buildStatus);
  const isBuilding = buildStatus === 'building';

  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  const planner = agents.find(a => a.role === 'Planner');
  const backend = agents.find(a => a.role === 'Backend');
  const frontend = agents.find(a => a.role === 'Frontend');
  const security = agents.find(a => a.role === 'Security');

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020617] flex items-center justify-center">
      
      {/* Background Radial Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_80%)] z-0 pointer-events-none" />

      {/* Holographic 3D Perspective Grid */}
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

      {/* Floating Binary Dust Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(40)].map((_, i) => {
          // Deterministic pseudo-random values based on index to prevent hydration mismatches
          const prng1 = Math.abs(Math.sin(i * 12.9898));
          const prng2 = Math.abs(Math.sin(i * 78.233));
          const prng3 = Math.abs(Math.sin(i * 45.123));
          
          const size = prng1 > 0.8 ? 'text-[10px]' : 'text-[8px]';
          const depthOpacity = Number((prng2 * 0.4 + 0.1).toFixed(2));
          const char = prng3 > 0.5 ? '1' : '0';
          
          return (
            <motion.div
              key={`dust-${i}`}
              className={`absolute font-mono text-[#818cf8] ${size}`}
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

      {/* Main Container - Centered, no more horizontal shift since we got rid of the standalone code viewer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-8 z-10 w-full h-full max-h-screen">
        
        {/* Core Stage Box (500x500 precise coordinate space) */}
        <div className="relative w-[500px] h-[500px] flex-shrink-0">
          
          {/* Data Lines connecting Central Orchestrator (250,250) to Agents */}
          {/* Coordinates scaled precisely to inner center points of 500x500 box */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
            {planner && <DataLink x1={250} y1={250} x2={250} y2={60} active={planner.state !== 'idle'} color={getRoleColor('Planner')} />}
            {frontend && <DataLink x1={250} y1={250} x2={60} y2={250} active={frontend.state !== 'idle'} color={getRoleColor('Frontend')} />}
            {backend && <DataLink x1={250} y1={250} x2={440} y2={250} active={backend.state !== 'idle'} color={getRoleColor('Backend')} />}
            {security && <DataLink x1={250} y1={250} x2={250} y2={440} active={security.state !== 'idle'} color={getRoleColor('Security')} />}
          </svg>

          {/* Central Pedestal Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#4f46e5]/10 blur-[40px] pointer-events-none z-0"></div>
          
          {/* Intensive Build Glow */}
          {isBuilding && (
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#6366f1]/20 blur-[60px] rounded-full z-0 pointer-events-none"
            />
          )}

          {/* 3D Gyroscopic Rings (God Mode Power rings) */}
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

          {/* Central Orchestrator Octopus Base */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-10 w-full h-[150px] -translate-y-[45px]">
              <div className="absolute bottom-0 w-32 h-6 bg-black/90 rounded-[100%] blur-[6px]" />
          </div>

          {/* Central Orchestrator Octopus */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto z-20 group">
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative flex items-center justify-center drop-shadow-[0_0_30px_rgba(79,70,229,0.5)]"
            >
              <VectorSquid state="idle" color={isBuilding ? "#818cf8" : "#6366f1"} className="w-36 h-36 transition-colors duration-1000" />
              
              {/* Giant Crown/Brain indicator */}
              <motion.div 
                animate={{ opacity: isBuilding ? [0.6, 1, 0.6] : 0.4 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-3 w-6 h-6 rounded-full bg-white blur-[4px] shadow-[0_0_20px_#ffffff,0_0_40px_#818cf8]"
              ></motion.div>
            </motion.div>
          </div>

          {/* Sub-Agents positioned precisely using explicit Cartesian coordinates based on 500x500 box */}
          {planner && <AgentSprite agent={planner} positionClass="top-[2%] left-1/2 -translate-x-1/2" isTerminalOpen={activeTerminalId === planner.id} onToggleTerminal={() => setActiveTerminalId(activeTerminalId === planner.id ? null : planner.id)} />}
          {frontend && <AgentSprite agent={frontend} positionClass="top-1/2 -left-[6%] -translate-y-1/2" isTerminalOpen={activeTerminalId === frontend.id} onToggleTerminal={() => setActiveTerminalId(activeTerminalId === frontend.id ? null : frontend.id)} />}
          {backend && <AgentSprite agent={backend} positionClass="top-1/2 -right-[6%] -translate-y-1/2" isTerminalOpen={activeTerminalId === backend.id} onToggleTerminal={() => setActiveTerminalId(activeTerminalId === backend.id ? null : backend.id)} />}
          {security && <AgentSprite agent={security} positionClass="bottom-[2%] left-1/2 -translate-x-1/2" isTerminalOpen={activeTerminalId === security.id} onToggleTerminal={() => setActiveTerminalId(activeTerminalId === security.id ? null : security.id)} />}
        </div>
      </div>
    </div>
  );
}

