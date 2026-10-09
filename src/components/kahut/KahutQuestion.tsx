import React, { useEffect, useRef, useState } from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import { KahutQuestion as Question } from '../../types';
import { useLanguage } from '../../LanguageContext';
import AnswerBadge, { ANSWER_STATE_CLASS, AnswerState } from './AnswerBadge';

interface Props {
  question: Question;
  index: number;
  total: number;
  score: number;
  /** Outcome of each already-finished question, in order. */
  results: boolean[];
  imageUrl?: string;
  /** undefined = still answering, null = timed out, number = chosen answer */
  answer: number | null | undefined;
  onAnswer: (choice: number | null) => void;
  onNext: () => void;
}

const LOW_TIME_SEC = 5;

function SegmentedProgress({ total, index, results, revealed }: { total: number; index: number; results: boolean[]; revealed: boolean }) {
  return (
    <div className="flex-1 flex gap-1 min-w-0" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        let cls = 'bg-white/15';
        if (i < results.length) cls = results[i] ? 'bg-neon-lime' : 'bg-neon-magenta';
        else if (i === index && !revealed) cls = 'bg-neon-cyan animate-[segment-pulse_1.2s_ease-in-out_infinite]';
        return <div key={i} className={`h-1.5 flex-1 rounded-full ${cls}`} />;
      })}
    </div>
  );
}

export default function KahutQuestion({ question, index, total, score, results, imageUrl, answer, onAnswer, onNext }: Props) {
  const { t } = useLanguage();
  const revealed = answer !== undefined;
  const [timeLeft, setTimeLeft] = useState(question.timeSec);
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  useEffect(() => {
    if (revealed) return;
    setTimeLeft(question.timeSec);
    const start = Date.now();
    const id = window.setInterval(() => {
      const left = question.timeSec - (Date.now() - start) / 1000;
      if (left <= 0) {
        window.clearInterval(id);
        setTimeLeft(0);
        onAnswerRef.current(null);
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [revealed, question.id, question.timeSec]);

  const isCorrect = answer === question.correctIndex;
  const isLast = index + 1 >= total;
  const low = timeLeft <= LOW_TIME_SEC;
  const pad = (n: number) => String(n).padStart(2, '0');

  const stateOf = (i: number): AnswerState => {
    if (!revealed) return 'idle';
    if (i === question.correctIndex) return 'correct';
    if (answer === i) return 'wrong';
    return 'dimmed';
  };

  return (
    <div className="flex flex-col min-h-screen w-full text-white font-display">
      {/* HUD */}
      <header className="flex items-center gap-4 px-4 md:px-8 pt-5">
        <div className="flex items-baseline gap-3 font-mono shrink-0">
          <span className="text-neon-cyan font-bold tracking-widest text-sm">GS Multiple-choice</span>
          <span className="text-white/60 text-sm">Q {pad(index + 1)}/{pad(total)}</span>
        </div>
        <SegmentedProgress total={total} index={index} results={results} revealed={revealed} />
        <div className="font-mono shrink-0 border border-neon-cyan/50 rounded-lg px-3 py-1 text-sm">
          <span className="text-white/60">{t('kahut.score')} </span>
          <span className="text-neon-cyan font-bold">{pad(score)}</span>
        </div>
      </header>

      {/* Timer bar */}
      <div className="flex items-center gap-3 px-4 md:px-8 pt-3">
        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              revealed ? 'bg-white/20' : low ? 'bg-neon-orange shadow-[0_0_12px_#FB923C]' : 'bg-neon-cyan shadow-[0_0_12px_#22D3EE]'
            }`}
            style={{ width: `${revealed ? 0 : (timeLeft / question.timeSec) * 100}%` }}
          />
        </div>
        <span className={`font-mono font-bold w-12 text-right ${low && !revealed ? 'text-neon-orange' : 'text-neon-cyan'}`}>
          {revealed ? '--' : `${Math.ceil(timeLeft)}s`}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 px-4 md:px-8 py-6 md:py-10 items-center">
        {/* Left: question + media + feedback */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          <div className="font-mono text-xs tracking-[0.3em] text-neon-magenta">
            {t('kahut.questionLabel')} {pad(index + 1)}
          </div>
          <h2 className="text-2xl md:text-4xl font-bold leading-tight break-words">{question.question}</h2>
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="max-h-[34vh] w-auto max-w-full self-start object-contain rounded-xl border border-neon-cyan/40 shadow-[0_0_30px_rgba(34,211,238,0.2)]"
            />
          )}
          {revealed && (
            <div className="flex flex-wrap items-center gap-4 animate-[fade-in_0.3s_ease-out]">
              <div
                className={`flex items-center gap-2 font-mono font-bold text-lg ${
                  isCorrect ? 'text-neon-lime' : answer === null ? 'text-neon-orange' : 'text-neon-magenta'
                }`}
              >
                {isCorrect ? <Check className="w-6 h-6" strokeWidth={3} /> : <X className="w-6 h-6" strokeWidth={3} />}
                {answer === null ? t('kahut.timeUp') : isCorrect ? `${t('kahut.correct')} +1` : t('kahut.incorrect')}
              </div>
              <button
                onClick={onNext}
                className="flex items-center gap-2 border-2 border-neon-cyan text-neon-cyan font-bold px-5 py-2.5 rounded-lg hover:bg-neon-cyan/15 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all"
              >
                {isLast ? t('kahut.results') : t('kahut.next')} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </section>

        {/* Right: answers */}
        <section className="lg:col-span-7 flex flex-col gap-3 md:gap-4">
          {question.answers.map((text, i) => {
            const state = stateOf(i);
            return (
              <button
                key={i}
                disabled={revealed}
                onClick={() => onAnswer(i)}
                className={`${ANSWER_STATE_CLASS[state].card} flex items-center gap-4 min-h-[72px] md:min-h-[96px] px-4 md:px-6 rounded-xl border-2 text-left backdrop-blur-sm transition-all ${
                  revealed
                    ? 'cursor-default'
                    : 'hover:border-neon-cyan hover:bg-neon-cyan/10 hover:-translate-x-1 hover:shadow-[0_0_24px_rgba(34,211,238,0.3)] active:scale-[0.99]'
                }`}
              >
                <AnswerBadge index={i} state={state} className="w-10 h-10 md:w-12 md:h-12 text-lg md:text-xl" />
                <span className="flex-1 text-lg md:text-2xl font-medium break-words">{text}</span>
                {state === 'correct' && <Check className="w-7 h-7 text-neon-lime shrink-0" strokeWidth={3} />}
                {state === 'wrong' && <X className="w-7 h-7 text-neon-magenta shrink-0" strokeWidth={3} />}
              </button>
            );
          })}
        </section>
      </div>
    </div>
  );
}
