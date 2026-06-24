import React from 'react';
import { GameMode } from '../types';
import { Play, Grid, Flag, Ticket, Box, Gift, Target, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface Props {
  onSelectGame: (game: GameMode) => void;
  onBack: () => void;
}

export default function GameMenu({ onSelectGame, onBack }: Props) {
  const { t } = useLanguage();

  const games = [
    { id: 'LUCKY_NUMBERS', title: t('menu.LUCKY_NUMBERS'), desc: t('menu.LUCKY_NUMBERS_desc'), color: '#1E90FF', icon: Ticket },
    { id: 'HUMAN_ATHLETICS', title: t('menu.HUMAN_ATHLETICS'), desc: t('menu.HUMAN_ATHLETICS_desc'), color: '#00C853', icon: Flag },
    { id: 'LUCKY_WHEEL', title: t('menu.LUCKY_WHEEL'), desc: t('menu.LUCKY_WHEEL_desc'), color: '#FF6B35', icon: Target },
    { id: 'MYSTERY_CHESTS', title: t('menu.MYSTERY_CHESTS'), desc: t('menu.MYSTERY_CHESTS_desc'), color: '#1A1A1A', icon: Box },
    { id: 'GACHA_MACHINE', title: t('menu.GACHA_MACHINE'), desc: t('menu.GACHA_MACHINE_desc'), color: '#9C27B0', icon: Gift },
    { id: 'BALLOON_POP', title: t('menu.BALLOON_POP'), desc: t('menu.BALLOON_POP_desc'), color: '#E91E63', icon: Target },
    { id: 'CARD_FLIP', title: t('menu.CARD_FLIP'), desc: t('menu.CARD_FLIP_desc'), color: '#3F51B5', icon: Grid },
  ] as const;

  return (
    <div className="w-full max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-8 lg:py-12 flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-12 h-20 border-b border-white/10 relative z-50 pointer-events-auto">
        <h1 className="text-3xl lg:text-[36px] font-bold text-white">
          {t('menu.title')}
        </h1>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold bg-transparent text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] relative z-50 pointer-events-auto"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('menu.back')}
        </button>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-[16px] justify-items-center w-full">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id as GameMode)}
            style={{ backgroundColor: game.color }}
            className="w-[260px] h-[220px] rounded-2xl p-6 flex flex-col justify-center items-center gap-4 liquid-glass-card hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] transition-all duration-300 text-white group relative overflow-hidden"
          >
            {/* Background color overlay */}
            <div className="absolute inset-0 opacity-40 mix-blend-color" style={{ backgroundColor: game.color }}></div>
            
            <div className="bg-white/10 p-4 rounded-full group-hover:bg-white/20 transition-colors z-10">
              <game.icon className="w-10 h-10" />
            </div>
            <div className="text-center z-10">
              <h3 className="text-[20px] font-bold leading-[28px] mb-1">{game.title}</h3>
              <p className="text-[14px] text-white/80 font-medium leading-[20px]">{game.desc}</p>
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}
