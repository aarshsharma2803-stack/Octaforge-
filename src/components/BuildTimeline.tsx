import { useAppStore, AppPhase } from '@/lib/store';
import { Check, Circle, Loader2, PlayCircle, Library } from 'lucide-react';
import { motion } from 'motion/react';

async function invokeCommand(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(cmd, args);
}

function PhaseRow({ phase }: { phase: AppPhase }) {
  const isRunning = phase.status === 'running';
  const isDone = phase.status === 'done';
  const isError = phase.status === 'error';

  return (
    <div className={`relative flex gap-4 ${isRunning ? 'opacity-100' : isDone ? 'opacity-80' : 'opacity-40'}`}>
      <div className="flex flex-col items-center">
        <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center bg-octo-bg
          ${isDone ? 'text-octo-green' : isRunning ? 'text-indigo-400' : isError ? 'text-octo-error' : 'text-slate-500'}`}
        >
          {isDone ? (
            <Check className="w-4 h-4" />
          ) : isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Circle className="w-3 h-3" />
          )}
        </div>
        <div className={`w-px h-full -mb-2 mt-1 ${isDone ? 'bg-octo-green/30' : 'bg-octo-border'}`} />
      </div>

      <div className="pb-6">
        <div className={`text-sm font-medium ${isRunning ? 'text-white' : 'text-slate-300'}`}>
          {phase.label}
        </div>
        {isRunning && (
          <div className="text-[10px] uppercase tracking-wider text-indigo-400 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            In Progress
          </div>
        )}
        {isDone && phase.startedAt && phase.endedAt && (
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            {((phase.endedAt - phase.startedAt) / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      {isRunning && (
        <motion.div
          layoutId="active-indicator"
          className="absolute -inset-x-2 -inset-y-1 border border-indigo-500/20 bg-indigo-500/5 rounded-lg -z-10"
        />
      )}
    </div>
  );
}

export default function BuildTimeline() {
  const phases = useAppStore(state => state.phases);
  const outputFolder = useAppStore(state => state.outputFolder);

  const handleRunApp = async () => {
    try {
      await invokeCommand('run_app_in_terminal', { projectPath: outputFolder });
    } catch (e) {
      console.error('run_app_in_terminal error:', e);
      alert(`Open terminal in: ${outputFolder}`);
    }
  };

  const handleOpenBrain = async () => {
    const brainPath = outputFolder + '/.brain';
    try {
      await invokeCommand('open_in_obsidian', { path: brainPath });
    } catch (e) {
      try {
        await invokeCommand('open_in_finder', { path: brainPath });
      } catch (e2) {
        console.error('open_in_obsidian error:', e2);
        alert(`Brain at: ${brainPath}`);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-octo-surface border-l border-octo-border z-10 w-full relative">
      <div className="p-4 border-b border-octo-border shrink-0">
        <h2 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
          Build Timeline
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {phases.map((phase) => (
          <PhaseRow key={phase.id} phase={phase} />
        ))}
      </div>

      <div className="p-4 border-t border-octo-border shrink-0 flex flex-col gap-3 bg-octo-bg">
        <button
          disabled={!outputFolder}
          className="w-full bg-slate-100 hover:bg-white text-slate-900 font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleRunApp}
        >
          <PlayCircle className="w-4 h-4" />
          <span>Run App</span>
        </button>
        <button
          disabled={!outputFolder}
          className="w-full bg-octo-surface hover:bg-octo-surface-hover border border-octo-border hover:border-slate-500 text-slate-200 font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleOpenBrain}
        >
          <Library className="w-4 h-4 text-purple-400" />
          <span>Open Brain in Obsidian</span>
        </button>
      </div>
    </div>
  );
}
