import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, BrainCircuit } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const agents = useAppStore(state => state.agents);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-octo-surface border border-octo-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b border-octo-border flex items-center justify-between bg-octo-bg">
              <h2 className="text-lg font-semibold text-white">Settings</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-octo-surface-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6 overflow-y-auto max-h-[60vh]">
              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" />
                  Local Models
                </h3>

                <div className="bg-octo-bg border border-octo-border rounded-lg divide-y divide-octo-border">
                  {agents.map(agent => (
                    <div key={agent.id} className="flex items-center justify-between p-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-200">{agent.name}</span>
                        <span className="text-[10px] text-slate-500">{agent.role}</span>
                      </div>
                      <select className="bg-octo-surface border border-octo-border rounded-md text-xs text-slate-300 py-1.5 px-2 focus:outline-none focus:border-octo-teal">
                        <option>qwen2.5-coder:14b</option>
                        <option>deepseek-r1:14b</option>
                        <option>phi4:14b</option>
                        <option>qwen2.5-coder:7b</option>
                        <option>llama3:8b</option>
                      </select>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-indigo-400">Orchestrator</span>
                      <span className="text-[10px] text-slate-500">Central Mind</span>
                    </div>
                    <select className="bg-octo-surface border border-octo-border rounded-md text-xs text-slate-300 py-1.5 px-2 focus:outline-none focus:border-octo-teal">
                      <option>phi4:14b</option>
                      <option>deepseek-r1:14b</option>
                      <option>llama3:70b</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Voice Integration
                </h3>
                <div className="flex flex-col gap-3 bg-octo-bg border border-octo-border rounded-lg p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-octo-border bg-octo-surface text-octo-teal focus:ring-octo-teal focus:ring-offset-octo-bg" />
                    <span className="text-sm text-slate-300">Enable ElevenLabs Voice Responses</span>
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase text-slate-500">ElevenLabs API Key</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      className="w-full bg-octo-surface border border-octo-border rounded-md px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-octo-teal"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="p-4 border-t border-octo-border flex justify-end gap-3 bg-octo-bg">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-octo-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-octo-teal hover:bg-octo-teal-hover text-white transition-colors shadow-lg shadow-octo-teal/20"
              >
                Save Preferences
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
