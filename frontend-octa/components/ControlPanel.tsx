'use client';

import { Folder, Play, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function ControlPanel() {
  const { 
    prompt, setPrompt, 
    outputFolder, setOutputFolder, 
    launchDive, buildStatus 
  } = useAppStore();

  const isBuilding = buildStatus === 'building';
  const canLaunch = prompt.trim().length > 0 && outputFolder.trim().length > 0 && !isBuilding;

  return (
    <div className="flex flex-col h-full p-4 gap-6">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-white uppercase mb-4">
          Build Control
        </h2>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prompt" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Application Blueprint
            </label>
            <textarea
              id="prompt"
              rows={8}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isBuilding}
              placeholder="Describe the app you want OctoForge to build... e.g. A markdown-based note taking app with local search."
              className="w-full bg-octo-bg border border-octo-border rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-octo-teal focus:border-octo-teal transition-all resize-none disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Output Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={outputFolder}
                className="flex-1 bg-octo-bg border border-octo-border rounded-lg p-2.5 text-xs font-mono text-slate-300 focus:outline-none truncate"
              />
              <button 
                type="button"
                disabled={isBuilding}
                className="p-2.5 rounded-lg border border-octo-border bg-octo-surface hover:bg-octo-surface-hover hover:border-slate-600 text-slate-400 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                onClick={() => {
                  // In a real app this opens a native file picker
                  setOutputFolder('/Users/developer/Projects/NewAwesomeApp');
                }}
              >
                <Folder className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-octo-border/50">
        <button
          onClick={launchDive}
          disabled={!canLaunch}
          className="w-full relative group overflow-hidden rounded-lg bg-octo-teal hover:bg-octo-teal-hover text-white font-semibold py-3 px-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-octo-teal"
        >
          {isBuilding ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Diving...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Launch Dive</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
