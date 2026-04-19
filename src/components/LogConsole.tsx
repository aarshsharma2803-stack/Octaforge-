import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { TerminalSquare, ShieldAlert, AlertTriangle, Info } from 'lucide-react';

export default function LogConsole() {
  const logs = useAppStore(state => state.logs);
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter(log => filter === 'all' || log.level === filter);

  return (
    <div className="flex flex-col h-full bg-octo-surface border-t border-octo-border w-full">
      <div className="h-10 border-b border-octo-border flex items-center justify-between px-4 bg-octo-bg shrink-0">
        <div className="flex items-center gap-3">
          <TerminalSquare className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Log Console
          </h2>
          <span className="px-1.5 py-0.5 rounded-md bg-octo-surface border border-octo-border text-[10px] font-mono text-slate-400">
            {logs.length}
          </span>
        </div>

        <div className="flex bg-octo-surface rounded-md p-0.5 border border-octo-border">
          {(['all', 'info', 'warning', 'error'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-[10px] uppercase tracking-wider font-medium transition-colors ${
                filter === f
                  ? 'bg-octo-border text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed select-text space-y-1"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 italic">No logs found matching filter.</div>
        ) : (
          filteredLogs.map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString(undefined, {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            const isError = log.level === 'error';
            const isWarn = log.level === 'warning';

            return (
              <div
                key={log.id}
                className={`flex gap-3 py-1 group ${
                  isError ? 'text-red-400 bg-red-950/20 px-2 -mx-2 rounded' :
                  isWarn ? 'text-amber-400' :
                  'text-slate-300'
                }`}
              >
                <div className="text-slate-500 shrink-0 w-[80px]">{time}</div>
                <div className="shrink-0 w-[80px] font-semibold flex items-center gap-1.5">
                  {isError && <ShieldAlert className="w-3 h-3" />}
                  {isWarn && <AlertTriangle className="w-3 h-3" />}
                  {!isError && !isWarn && <Info className="w-3 h-3 opacity-50" />}
                  <span className={isError ? 'text-red-300' : isWarn ? 'text-amber-300' : 'text-indigo-300'}>
                    [{log.agent}]
                  </span>
                </div>
                <div className="flex-1 break-words">{log.message}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
