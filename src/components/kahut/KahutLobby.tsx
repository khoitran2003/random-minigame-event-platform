import React from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

interface Props {
  total: number;
  onStart: () => void;
  onBack: () => void;
}

export default function KahutLobby({ total, onStart, onBack }: Props) {
  const { t } = useLanguage();
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-8 text-center text-white gap-10 font-display">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm border border-white/20 text-white/80 hover:border-neon-cyan hover:text-neon-cyan transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> {t('game.back')}
      </button>

      <div className="flex flex-col items-center gap-3">
        <span className="font-mono text-xs tracking-[0.5em] text-neon-magenta">{t('kahut.lobbyTag')}</span>
        <h1 className="text-5xl md:text-7xl font-bold tracking-wide text-white animate-[glow-pulse_4s_ease-in-out_infinite]">
          GS Multiple-choice
        </h1>
      </div>

      <div className="font-mono text-sm md:text-base text-neon-cyan flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-neon-lime animate-[segment-pulse_1s_ease-in-out_infinite]" />
        {t('kahut.lobbyInfo', { count: total })}
      </div>

      <button
        onClick={onStart}
        className="flex items-center gap-3 border-2 border-neon-cyan text-neon-cyan font-bold text-2xl md:text-3xl px-12 py-5 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.35)] hover:bg-neon-cyan/15 hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all"
      >
        <Play className="w-7 h-7" /> {t('kahut.start')}
      </button>
    </div>
  );
}
