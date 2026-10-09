import React from 'react';
import { ArrowLeft, Play, Check, Clock } from 'lucide-react';
import { KahutQuestion } from '../../types';
import { useLanguage } from '../../LanguageContext';
import AnswerBadge from './AnswerBadge';

interface Props {
  questions: KahutQuestion[];
  imageUrls: Record<number, string>;
  onBack: () => void;
  onRun: () => void;
}

export default function KahutPreview({ questions, imageUrls, onBack, onRun }: Props) {
  const { t } = useLanguage();
  return (
    <div className="max-w-[1120px] mx-auto p-6 md:p-10 text-white flex flex-col gap-6 font-display">
      <div className="flex items-center justify-between gap-4 sticky top-0 z-20 py-3 px-4 rounded-xl liquid-glass-dark border border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm border border-white/20 text-white/80 hover:border-neon-cyan hover:text-neon-cyan transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> {t('game.back')}
        </button>
        <h2 className="font-mono text-sm md:text-base text-neon-cyan tracking-wider">{t('kahut.previewTitle', { count: questions.length })}</h2>
        <button
          onClick={onRun}
          className="flex items-center gap-2 border-2 border-neon-cyan text-neon-cyan font-bold px-6 py-2 rounded-lg hover:bg-neon-cyan/15 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
        >
          <Play className="w-4 h-4" /> {t('kahut.run')}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map(q => (
          <article key={q.id} className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-4 md:p-5 flex flex-col md:flex-row gap-5">
            <div className="md:w-5/12 flex flex-col gap-3 min-w-0">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-neon-magenta tracking-[0.3em]">{t('kahut.questionLabel')} {String(q.id).padStart(2, '0')}</span>
                <span className="flex items-center gap-1 text-white/60"><Clock className="w-3.5 h-3.5" />{q.timeSec}s</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold break-words">{q.question}</h3>
              {imageUrls[q.id] && (
                <img src={imageUrls[q.id]} alt="" className="w-full max-h-40 object-cover rounded-lg border border-neon-cyan/40" />
              )}
            </div>
            <ul className="md:w-7/12 flex flex-col gap-2">
              {q.answers.map((a, i) => {
                const right = i === q.correctIndex;
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      right ? 'border-neon-lime bg-neon-lime/10' : 'border-white/10 bg-white/[0.03] text-white/70'
                    }`}
                  >
                    <AnswerBadge index={i} state={right ? 'correct' : 'idle'} className="w-7 h-7 text-sm" />
                    <span className="flex-1 break-words">{a}</span>
                    {right && <Check className="w-4 h-4 text-neon-lime shrink-0" strokeWidth={3} />}
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
