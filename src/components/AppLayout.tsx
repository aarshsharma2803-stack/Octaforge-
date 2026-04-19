import { useState } from 'react';
import Header from './Header';
import ControlPanel from './ControlPanel';
import DeepSeaStage from './DeepSeaStage';
import BuildTimeline from './BuildTimeline';
import LogConsole from './LogConsole';
import SettingsModal from './SettingsModal';
import ErrorOverlay from './ErrorOverlay';
import AIInsights from './AIInsights';
import VoicePlayer from './VoicePlayer';

export default function AppLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <div className="h-screen w-screen bg-octo-bg text-slate-200 overflow-hidden flex flex-col font-sans selection:bg-octo-teal/30">
        <Header onOpenSettings={() => setIsSettingsOpen(true)} />

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-[260px] border-r border-octo-border flex flex-col bg-octo-surface shrink-0 z-20">
            <ControlPanel />
          </aside>

          <main className="flex-1 flex flex-col min-w-0 bg-octo-bg relative">
            <div className="flex-1 flex min-h-0 relative">
              <div className="flex-1 min-w-0 relative z-0">
                <DeepSeaStage />
              </div>
              <aside className="w-[320px] flex flex-col bg-octo-surface z-10 shrink-0 border-l border-octo-border shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
                <BuildTimeline />
              </aside>
            </div>

            <div className="h-[260px] flex flex-col z-20 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
              <LogConsole />
            </div>
          </main>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <ErrorOverlay />
      <AIInsights />
      <VoicePlayer />
    </>
  );
}
