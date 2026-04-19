import { motion, AnimatePresence } from 'motion/react';
import { Brain, Cpu, X } from 'lucide-react';
import { useAppStore, ConsensusMatrix, QualityScores } from '@/lib/store';
import { useState } from 'react';

function getRoleColor(name: string) {
  switch (name.toLowerCase()) {
    case 'archie': return '#818cf8';
    case 'byron': return '#2dd4bf';
    case 'faye': return '#fbbf24';
    case 'sentry': return '#f43f5e';
    default: return '#94a3b8';
  }
}

function AlignmentCell({ value, rowAgent, colAgent }: { value: number; rowAgent: string; colAgent: string }) {
  const isDiagonal = rowAgent === colAgent;
  const intensity = Math.max(0, Math.min(1, (value - 0.3) / 0.7));
  const hue = intensity * 120; // 0=red, 60=yellow, 120=green
  const bg = isDiagonal
    ? 'rgba(255,255,255,0.05)'
    : `hsla(${hue}, 80%, 50%, ${0.15 + intensity * 0.4})`;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.05 * (Math.random() * 10) }}
      className="relative flex items-center justify-center rounded-md text-[10px] font-mono font-bold aspect-square"
      style={{ backgroundColor: bg }}
      title={`${rowAgent} ↔ ${colAgent}: ${(value * 100).toFixed(0)}%`}
    >
      {isDiagonal ? (
        <span className="text-slate-500">—</span>
      ) : (
        <span style={{ color: `hsl(${hue}, 90%, 70%)` }}>
          {(value * 100).toFixed(0)}
        </span>
      )}
    </motion.div>
  );
}

function ConsensusHeatmap({ data }: { data: ConsensusMatrix }) {
  const n = data.agents.length;
  if (n === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
          Agent Consensus
        </h3>
        <span className="text-[10px] font-mono text-slate-400">
          avg: <span className="text-indigo-300 font-bold">{(data.avg_alignment * 100).toFixed(0)}%</span>
        </span>
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${n}, 1fr)` }}>
        {/* Header row */}
        <div />
        {data.agents.map(name => (
          <div key={`h-${name}`} className="text-[8px] font-mono font-bold text-center uppercase tracking-wider truncate px-0.5"
            style={{ color: getRoleColor(name) }}>
            {name.slice(0, 3)}
          </div>
        ))}

        {/* Matrix rows */}
        {data.agents.map((rowAgent, i) => (
          <>
            <div key={`r-${rowAgent}`} className="text-[8px] font-mono font-bold uppercase tracking-wider flex items-center pr-1"
              style={{ color: getRoleColor(rowAgent) }}>
              {rowAgent.slice(0, 3)}
            </div>
            {data.matrix[i]?.map((val, j) => (
              <AlignmentCell
                key={`${i}-${j}`}
                value={val}
                rowAgent={rowAgent}
                colAgent={data.agents[j]}
              />
            ))}
          </>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-red-500/60 via-yellow-500/60 to-green-500/60" />
        <div className="flex gap-3 text-[8px] font-mono text-slate-500">
          <span>0% Divergent</span>
          <span>100% Aligned</span>
        </div>
      </div>
    </div>
  );
}

function QualityRadar({ data }: { data: QualityScores }) {
  const dims = Object.entries(data.dimensions);
  if (dims.length === 0) return null;

  const dimLabels: Record<string, string> = {
    structure: 'Structure',
    security: 'Security',
    readability: 'Readability',
    completeness: 'Completeness',
  };

  const dimColors: Record<string, string> = {
    structure: '#818cf8',
    security: '#f43f5e',
    readability: '#2dd4bf',
    completeness: '#fbbf24',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
          Code Quality
        </h3>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-lg font-black font-mono"
          style={{
            color: data.overall >= 70 ? '#2dd4bf' : data.overall >= 40 ? '#fbbf24' : '#f43f5e',
            textShadow: `0 0 10px ${data.overall >= 70 ? '#2dd4bf' : data.overall >= 40 ? '#fbbf24' : '#f43f5e'}50`,
          }}
        >
          {data.overall}
        </motion.span>
      </div>

      {/* Dimension bars */}
      <div className="space-y-2">
        {dims.map(([dim, score]) => (
          <div key={dim} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: dimColors[dim] || '#94a3b8' }}>
                {dimLabels[dim] || dim}
              </span>
              <span className="text-[9px] font-mono font-bold text-slate-400">{score}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  backgroundColor: dimColors[dim] || '#94a3b8',
                  boxShadow: `0 0 8px ${dimColors[dim] || '#94a3b8'}80`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Per-file scores */}
      {Object.keys(data.files).length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[8px] font-mono uppercase tracking-widest text-slate-500 mb-1">Per-File Scores</div>
          {Object.entries(data.files).slice(0, 6).map(([path, info]) => (
            <div key={path} className="flex items-center gap-2">
              <div className="flex-1 truncate text-[9px] font-mono text-slate-400">{path}</div>
              <div className="shrink-0 w-8 text-right text-[9px] font-mono font-bold"
                style={{
                  color: info.overall >= 70 ? '#2dd4bf' : info.overall >= 40 ? '#fbbf24' : '#f43f5e',
                }}>
                {info.overall}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIInsights() {
  const consensusMatrix = useAppStore(state => state.consensusMatrix);
  const qualityScores = useAppStore(state => state.qualityScores);
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const hasData = consensusMatrix || qualityScores;

  // Auto-open once when first data arrives (any build status)
  if (hasData && !isOpen && !hasAutoOpened) {
    setIsOpen(true);
    setHasAutoOpened(true);
  }

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: hasData ? 1 : 0.8, opacity: hasData ? 1 : 0.4 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[280px] right-[340px] z-50 h-10 px-3 rounded-full flex items-center justify-center gap-1.5 border backdrop-blur-xl transition-colors"
        style={{
          backgroundColor: hasData ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.8)',
          borderColor: hasData ? 'rgba(99, 102, 241, 0.5)' : 'rgba(30, 41, 59, 0.8)',
          boxShadow: hasData ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none',
        }}
        title="AI Insights"
      >
        <Brain className="w-5 h-5 text-indigo-400" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-200">AI/ML</span>
        {hasData && (
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-[#020617]"
          />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed bottom-[340px] right-[340px] z-50 w-[300px] max-h-[500px] overflow-y-auto rounded-xl border border-indigo-500/30 bg-[#050b14]/98 backdrop-blur-2xl shadow-2xl"
            style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.8), 0 0 40px -10px rgba(99,102,241,0.3)' }}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-indigo-500/20 bg-[#020617]/90 backdrop-blur-xl z-10">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">
                  AI Insights
                </span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {!hasData && (
                <div className="text-center py-8">
                  <Brain className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-[11px] text-slate-500 font-mono">
                    Analytics appear during build...
                  </p>
                  <p className="text-[9px] text-slate-600 font-mono mt-1">
                    Embedding-based consensus + quality scoring
                  </p>
                </div>
              )}

              {consensusMatrix && <ConsensusHeatmap data={consensusMatrix} />}
              {qualityScores && <QualityRadar data={qualityScores} />}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[#0f172a] bg-[#020617]/60 flex items-center justify-between">
              <span className="text-[7px] font-mono text-slate-600 uppercase tracking-wider">
                Powered by nomic-embed-text
              </span>
              <span className="text-[7px] font-mono text-indigo-500/50 uppercase tracking-wider">
                Vector Analytics
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
