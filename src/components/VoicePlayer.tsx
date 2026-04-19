import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAppStore } from '@/lib/store';

function getAgentColor(name: string) {
  switch (name.toLowerCase()) {
    case 'archie': return '#818cf8';
    case 'byron': return '#2dd4bf';
    case 'faye': return '#fbbf24';
    case 'sentry': return '#f43f5e';
    case 'orchestrator': return '#a78bfa';
    default: return '#94a3b8';
  }
}

function getAgentLabel(name: string) {
  switch (name.toLowerCase()) {
    case 'archie': return 'Archie — Planner';
    case 'byron': return 'Byron — Backend';
    case 'faye': return 'Faye — Frontend';
    case 'sentry': return 'Sentry — Security';
    case 'orchestrator': return 'Orchestrator';
    default: return name;
  }
}

export default function VoicePlayer() {
  const voice = useAppStore(state => state.voice);
  const dequeueVoice = useAppStore(state => state.dequeueVoice);
  const setVoiceSpeaker = useAppStore(state => state.setVoiceSpeaker);
  const toggleVoiceMute = useAppStore(state => state.toggleVoiceMute);

  const isPlaying = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNext = useCallback(() => {
    if (isPlaying.current) return;

    const state = useAppStore.getState();
    if (state.voice.queue.length === 0) {
      setVoiceSpeaker(null, null);
      return;
    }

    const event = dequeueVoice();
    if (!event) return;

    isPlaying.current = true;
    setVoiceSpeaker(event.agent, event.spoken_text);

    if (event.has_audio && event.audio_b64 && !state.voice.muted) {
      // Play audio
      const audioSrc = `data:audio/mp3;base64,${event.audio_b64}`;
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onended = () => {
        isPlaying.current = false;
        audioRef.current = null;
        // Small pause between speakers
        setTimeout(playNext, 400);
      };
      audio.onerror = () => {
        isPlaying.current = false;
        audioRef.current = null;
        setTimeout(playNext, 200);
      };
      audio.play().catch(() => {
        isPlaying.current = false;
        setTimeout(playNext, 200);
      });
    } else {
      // No audio — show subtitle for estimated reading time
      const readTime = Math.max(2000, event.spoken_text.length * 40);
      setTimeout(() => {
        isPlaying.current = false;
        playNext();
      }, readTime);
    }
  }, [dequeueVoice, setVoiceSpeaker]);

  // Process queue when new items arrive
  useEffect(() => {
    if (voice.queue.length > 0 && !isPlaying.current) {
      playNext();
    }
  }, [voice.queue.length, playNext]);

  // Stop audio on mute
  useEffect(() => {
    if (voice.muted && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      isPlaying.current = false;
    }
  }, [voice.muted]);

  const speakerColor = voice.currentSpeaker ? getAgentColor(voice.currentSpeaker) : '#94a3b8';

  return (
    <>
      {/* Subtitle bar — shows at bottom of DeepSeaStage area */}
      <AnimatePresence>
        {voice.currentSpeaker && voice.subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-[270px] left-1/2 -translate-x-1/2 z-40 max-w-[600px] w-full pointer-events-none"
          >
            <div
              className="mx-4 px-5 py-3 rounded-xl border bg-[#020617]/95 backdrop-blur-2xl shadow-2xl"
              style={{
                borderColor: `${speakerColor}40`,
                boxShadow: `0 0 30px ${speakerColor}20`,
              }}
            >
              {/* Speaker indicator */}
              <div className="flex items-center gap-2 mb-1.5">
                {/* Animated speaking indicator */}
                <div className="flex items-center gap-[2px]">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: ['3px', '12px', '3px'] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                      }}
                      className="w-[2px] rounded-full"
                      style={{ backgroundColor: speakerColor }}
                    />
                  ))}
                </div>
                <span
                  className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]"
                  style={{ color: speakerColor }}
                >
                  {getAgentLabel(voice.currentSpeaker)}
                </span>
              </div>

              {/* Subtitle text */}
              <p className="text-[13px] text-slate-200 leading-relaxed font-medium">
                {voice.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute toggle button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={toggleVoiceMute}
        className="fixed bottom-[280px] right-[400px] z-50 w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-xl transition-colors"
        style={{
          backgroundColor: voice.muted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 23, 42, 0.8)',
          borderColor: voice.muted ? 'rgba(239, 68, 68, 0.4)' : voice.currentSpeaker ? `${speakerColor}50` : 'rgba(30, 41, 59, 0.8)',
          boxShadow: voice.currentSpeaker && !voice.muted ? `0 0 15px ${speakerColor}30` : 'none',
        }}
        title={voice.muted ? 'Unmute agents' : 'Mute agents'}
      >
        {voice.muted ? (
          <VolumeX className="w-4 h-4 text-red-400" />
        ) : (
          <Volume2 className="w-4 h-4" style={{ color: voice.currentSpeaker ? speakerColor : '#64748b' }} />
        )}

        {/* Speaking pulse */}
        {voice.currentSpeaker && !voice.muted && (
          <motion.div
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: speakerColor }}
          />
        )}
      </motion.button>
    </>
  );
}
