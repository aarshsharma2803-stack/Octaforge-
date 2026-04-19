import { useEffect, useState } from 'react';
import { Settings, CheckCircle2, Activity, AlertCircle, Loader2, Brain, Timer } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const buildStatus = useAppStore(state => state.buildStatus);
  const criticalError = useAppStore(state => state.criticalError);
  const ollamaStatus = useAppStore(state => state.ollamaStatus);
  const setOllamaStatus = useAppStore(state => state.setOllamaStatus);
  const consensusMatrix = useAppStore(state => state.consensusMatrix);
  const qualityScores = useAppStore(state => state.qualityScores);
  const timing = useAppStore(state => state.timing);

  const isBuilding = buildStatus === 'building';

  // Live ticker while building
  const [liveElapsed, setLiveElapsed] = useState(0);
  useEffect(() => {
    if (!isBuilding) return;
    const start = Date.now() - timing.elapsedS * 1000;
    const id = setInterval(() => setLiveElapsed((Date.now() - start) / 1000), 200);
    return () => clearInterval(id);
  }, [isBuilding, timing.elapsedS]);

  const fmtTime = (s: number) => {
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const rem = Math.floor(s % 60);
    return `${m}m ${rem}s`;
  };
  const shownElapsed = isBuilding ? liveElapsed : (timing.totalS ?? timing.elapsedS);
  const aiConsensusPct = consensusMatrix ? Math.round(consensusMatrix.avg_alignment * 100) : null;
  const aiQuality = qualityScores ? qualityScores.overall : null;

  // Poll sidecar health every 8 seconds
  useEffect(() => {
    const check = async () => {
      try {
        const resp = await fetch('http://localhost:8765/ollama/health');
        const data = await resp.json();
        setOllamaStatus({
          running: data.ollama_running,
          ready: data.ready,
          available: data.available_models ?? [],
          missing: data.missing_models ?? [],
        });
      } catch {
        setOllamaStatus({ running: false, ready: false, available: [], missing: [] });
      }
    };
    check();
    const id = setInterval(check, 8000);
    return () => clearInterval(id);
  }, [setOllamaStatus]);

  let statusColor = "text-octo-teal bg-octo-teal/10 border-octo-teal/20";
  let StatusIcon: React.ElementType = CheckCircle2;
  let statusText = "Local agents online";

  if (buildStatus === 'building') {
    statusColor = "text-octo-amber bg-octo-amber/10 border-octo-amber/20";
    StatusIcon = Activity;
    statusText = "Agents working...";
  } else if (criticalError) {
    statusColor = "text-octo-error bg-octo-error/10 border-octo-error/20";
    StatusIcon = AlertCircle;
    statusText = "Error detected";
  } else if (!ollamaStatus.running) {
    statusColor = "text-slate-400 bg-slate-400/10 border-slate-400/20";
    StatusIcon = AlertCircle;
    statusText = "Ollama offline";
  } else if (!ollamaStatus.ready) {
    statusColor = "text-octo-amber bg-octo-amber/10 border-octo-amber/20";
    StatusIcon = Loader2;
    const need = ollamaStatus.missing.length;
    statusText = `Downloading models (${need} left)...`;
  }

  return (
    <header className="h-[48px] border-b border-octo-border bg-octo-bg flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="font-sans font-semibold text-lg tracking-tight text-white flex items-center gap-2">
          <span className="text-xl">🐙</span> OctoForge
        </h1>
        <div className="hidden sm:flex items-center px-2.5 py-1 rounded-full bg-octo-surface border border-octo-border/50 text-xs font-medium text-slate-400 gap-1.5">
          <span className="opacity-80">🦑</span> Deep Sea AI Workshop
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Timing HUD */}
        {(isBuilding || timing.totalS !== null) && (
          <div
            className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors ${
              isBuilding
                ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
            }`}
            title="Build timing — from prompt to done"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{fmtTime(shownElapsed)}</span>
            {timing.timeToSecurityS !== null && (
              <span className="opacity-80">· 🛡 {fmtTime(timing.timeToSecurityS)}</span>
            )}
          </div>
        )}

        {/* AI/ML embedding analytics HUD */}
        <div
          className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors ${
            aiConsensusPct !== null || aiQuality !== null
              ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-200'
              : isBuilding
                ? 'bg-indigo-500/5 border-indigo-400/20 text-indigo-400/70 animate-pulse'
                : 'bg-slate-500/5 border-slate-500/20 text-slate-500'
          }`}
          title="Embedding-based consensus & code quality (nomic-embed-text)"
        >
          <Brain className="w-3.5 h-3.5" />
          {aiConsensusPct !== null || aiQuality !== null ? (
            <>
              <span>AI</span>
              {aiConsensusPct !== null && <span>· consensus <span className="font-bold text-indigo-100">{aiConsensusPct}%</span></span>}
              {aiQuality !== null && <span>· quality <span className="font-bold text-indigo-100">{aiQuality}/100</span></span>}
            </>
          ) : isBuilding ? (
            <span>AI · computing embeddings…</span>
          ) : (
            <span>AI analytics standby</span>
          )}
        </div>

        {/* Model availability indicator */}
        {ollamaStatus.running && !ollamaStatus.ready && (
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
            {ollamaStatus.available.map(m => (
              <span key={m} className="px-1.5 py-0.5 rounded bg-octo-teal/10 text-octo-teal border border-octo-teal/20">✓ {m}</span>
            ))}
            {ollamaStatus.missing.map(m => (
              <span key={m} className="px-1.5 py-0.5 rounded bg-octo-amber/10 text-octo-amber border border-octo-amber/20 animate-pulse">⟳ {m}</span>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${statusColor}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${StatusIcon === Loader2 ? 'animate-spin' : ''}`} />
          {statusText}
        </div>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-octo-surface-hover transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
