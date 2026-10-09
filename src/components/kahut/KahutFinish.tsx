import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Settings } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

interface Props {
  score: number;
  total: number;
  onReplay: () => void;
  onBackToConfig: () => void;
}

const R = 90;
const C = 2 * Math.PI * R;

export default function KahutFinish({ score, total, onReplay, onBackToConfig }: Props) {
  const { t } = useLanguage();
  const ratio = total > 0 ? score / total : 0;
  const percent = Math.round(ratio * 100);

  useEffect(() => {
    const end = Date.now() + 2500;
    const colors = ['#22D3EE', '#E879F9', '#A3E635', '#FB923C'];
    const id = window.setInterval(() => {
      if (Date.now() > end) {
        window.clearInterval(id);
        return;
      }
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center text-white gap-8 font-display">
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-xs tracking-[0.5em] text-neon-magenta">{t('kahut.finishTag')}</span>
        <h1 className="text-4xl md:text-7xl font-bold animate-[glow-pulse_4s_ease-in-out_infinite]">{t('kahut.congrats')}</h1>
      </div>

      <div className="relative w-64 h-64 md:w-80 md:h-80">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" strokeWidth="10" className="stroke-white/10" />
          <circle
            cx="100" cy="100" r={R} fill="none" strokeWidth="10" strokeLinecap="round"
            className="stroke-neon-cyan drop-shadow-[0_0_8px_#22D3EE] transition-[stroke-dashoffset] duration-1000 ease-out"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xs tracking-widest text-white/60">{t('kahut.finalScore')}</span>
          <span className="font-mono font-bold text-6xl md:text-7xl text-neon-cyan drop-shadow-[0_0_14px_rgba(34,211,238,0.7)]">
            {score}<span className="text-white/40 text-3xl md:text-4xl">/{total}</span>
          </span>
          <span className="font-mono text-sm text-neon-lime mt-1">{t('kahut.percentCorrect', { percent })}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={onReplay}
          className="flex items-center gap-2 border-2 border-neon-lime text-neon-lime font-bold px-8 py-3.5 rounded-lg hover:bg-neon-lime/15 hover:shadow-[0_0_24px_rgba(163,230,53,0.4)] transition-all"
        >
          <RotateCcw className="w-5 h-5" /> {t('kahut.replay')}
        </button>
        <button
          onClick={onBackToConfig}
          className="flex items-center gap-2 border border-white/25 text-white/80 font-bold px-8 py-3.5 rounded-lg hover:border-white/50 hover:bg-white/5 transition-all"
        >
          <Settings className="w-5 h-5" /> {t('kahut.backToConfig')}
        </button>
      </div>
    </div>
  );
}
