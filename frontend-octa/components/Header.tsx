'use client';

import { Settings, CheckCircle2, Activity, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const buildStatus = useAppStore(state => state.buildStatus);
  const criticalError = useAppStore(state => state.criticalError);
  
  let statusColor = "text-octo-teal bg-octo-teal/10 border-octo-teal/20";
  let StatusIcon = CheckCircle2;
  let statusText = "Local agents online – Ollama running";

  if (buildStatus === 'building') {
    statusColor = "text-octo-amber bg-octo-amber/10 border-octo-amber/20";
    StatusIcon = Activity;
    statusText = "Agents working...";
  } else if (criticalError) {
    statusColor = "text-octo-error bg-octo-error/10 border-octo-error/20";
    StatusIcon = AlertCircle;
    statusText = "Error detected";
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
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${statusColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
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
