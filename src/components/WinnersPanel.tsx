import React from 'react';
import { Trophy } from 'lucide-react';
import { RewardLogEntry } from '../types';
import { useLanguage } from '../LanguageContext';

interface Props {
  entries: RewardLogEntry[];
  latestId?: string;
}

export default function WinnersPanel({ entries, latestId }: Props) {
  const { t } = useLanguage();

  return (
    <div className="liquid-glass-dark rounded-[24px] w-full flex flex-col overflow-hidden lg:h-[448px] min-h-[240px]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-2 font-bold text-brand-gold">
          <Trophy className="w-4 h-4" /> {t('game.winners')}
        </div>
        <span className="text-xs font-mono text-white/60">{entries.length}</span>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/40 text-sm p-6">
          {t('game.noWinners')}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-black/60 text-white/50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">{t('game.winnerId')}</th>
                <th className="px-3 py-2 text-left">{t('game.winnerName')}</th>
                <th className="px-3 py-2 text-left">{t('game.winnerPrize')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr
                  key={e.id}
                  className={`border-t border-white/5 ${e.id === latestId ? 'bg-[#FF6B35]/15' : ''}`}
                >
                  <td className="px-3 py-2 text-white/40">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-brand-gold">{e.winnerId}</td>
                  <td className="px-3 py-2 truncate max-w-[150px]">{e.winnerName}</td>
                  <td className="px-3 py-2 text-white/70 truncate max-w-[120px]">{e.prize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
