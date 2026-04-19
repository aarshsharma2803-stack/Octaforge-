import { useEffect, useState } from 'react';
import { Folder, Play, Loader2, Library, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ProjectInspect {
  exists: boolean;
  has_brain: boolean;
  has_architecture: boolean;
  suggested_prompt_prefix: string;
}

export default function ControlPanel() {
  const {
    prompt, setPrompt,
    outputFolder, setOutputFolder,
    launchDive, buildStatus
  } = useAppStore();

  const isBuilding = buildStatus === 'building';
  const canLaunch = prompt.trim().length > 0 && outputFolder.trim().length > 0 && !isBuilding;

  const [inspect, setInspect] = useState<ProjectInspect | null>(null);
  useEffect(() => {
    if (!outputFolder.trim()) { setInspect(null); return; }
    const ctrl = new AbortController();
    const url = `http://localhost:8765/project/inspect?folder=${encodeURIComponent(outputFolder)}`;
    fetch(url, { signal: ctrl.signal })
      .then(r => r.json())
      .then(setInspect)
      .catch(() => setInspect(null));
    return () => ctrl.abort();
  }, [outputFolder]);

  const applyRevisitHint = () => {
    if (!inspect?.suggested_prompt_prefix) return;
    if (prompt.startsWith(inspect.suggested_prompt_prefix)) return;
    setPrompt(inspect.suggested_prompt_prefix + prompt);
  };

  const handlePickFolder = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, multiple: false, title: 'Select Output Folder' });
      if (!selected) return;
      const path = typeof selected === 'string' ? selected : selected[0];
      if (path) setOutputFolder(path);
    } catch {
      // Fallback for web / dev mode
      const input = window.prompt('Enter output folder path:', outputFolder);
      if (input) setOutputFolder(input);
    }
  };

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
                placeholder="/path/to/output"
                className="flex-1 bg-octo-bg border border-octo-border rounded-lg p-2.5 text-xs font-mono text-slate-300 focus:outline-none truncate"
              />
              <button
                type="button"
                disabled={isBuilding}
                className="p-2.5 rounded-lg border border-octo-border bg-octo-surface hover:bg-octo-surface-hover hover:border-slate-600 text-slate-400 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                onClick={handlePickFolder}
              >
                <Folder className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {inspect?.has_brain && !isBuilding && (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
            <Library className="w-3.5 h-3.5" />
            Existing project detected
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            This folder has an OctoForge build with Obsidian vault. Prepend context hint so agents read the vault first.
          </p>
          <button
            onClick={applyRevisitHint}
            className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-2 py-1.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-100 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Add vault-first hint to prompt
          </button>
        </div>
      )}

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
