import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function ErrorOverlay() {
  const { criticalError, dismissError, launchDive } = useAppStore();

  return (
    <AnimatePresence>
      {criticalError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-950/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative max-w-lg w-full bg-octo-surface border-2 border-red-500/30 rounded-2xl shadow-[0_0_100px_rgba(225,29,72,0.4)] overflow-hidden flex flex-col items-center text-center p-8"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <AlertOctagon className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Build Failed</h2>

            <div className="bg-black/40 rounded-lg p-4 mb-8 w-full border border-red-500/20 select-text">
              <p className="text-sm font-mono text-red-300 break-words whitespace-pre-wrap">
                {criticalError}
              </p>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={dismissError}
                className="flex-1 px-4 py-3 rounded-xl font-medium text-slate-300 hover:text-white bg-octo-bg hover:bg-octo-border border border-octo-border transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  dismissError();
                  launchDive();
                }}
                className="flex-1 px-4 py-3 rounded-xl font-medium bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                <RotateCcw className="w-5 h-5" />
                Retry Dive
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
