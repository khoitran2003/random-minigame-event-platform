import React from 'react';

export const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

export type AnswerState = 'idle' | 'correct' | 'wrong' | 'dimmed';

export const ANSWER_STATE_CLASS: Record<AnswerState, { card: string; badge: string }> = {
  idle: {
    card: 'border-white/15 bg-white/5',
    badge: 'border-neon-cyan/70 text-neon-cyan',
  },
  correct: {
    card: 'border-neon-lime bg-neon-lime/10 shadow-[0_0_28px_rgba(163,230,53,0.35)]',
    badge: 'border-neon-lime bg-neon-lime text-arcade-ink',
  },
  wrong: {
    card: 'border-neon-magenta bg-neon-magenta/10 shadow-[0_0_28px_rgba(232,121,249,0.35)]',
    badge: 'border-neon-magenta bg-neon-magenta text-arcade-ink',
  },
  dimmed: {
    card: 'border-white/10 bg-white/[0.02] opacity-35',
    badge: 'border-white/30 text-white/50',
  },
};

export default function AnswerBadge({ index, state = 'idle', className = 'w-10 h-10 text-lg' }: {
  index: number;
  state?: AnswerState;
  className?: string;
}) {
  return (
    <span
      className={`${className} ${ANSWER_STATE_CLASS[state].badge} shrink-0 inline-flex items-center justify-center rounded-lg border-2 font-mono font-bold`}
    >
      {ANSWER_LETTERS[index]}
    </span>
  );
}
