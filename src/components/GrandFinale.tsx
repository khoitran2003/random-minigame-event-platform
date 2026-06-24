import React, { useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { EventConfig } from '../types';
import { Trophy, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface Props {
  config: EventConfig;
  onBack: () => void;
  sessionId: string;
}

export default function GrandFinale({ config, onBack, sessionId }: Props) {
  const { t } = useLanguage();

  const winners = useMemo(() => {
    // Show all accepted prizes from the current session only
    let accepted = config.rewardLog.filter(
      l => l.isAccepted && l.sessionId === sessionId
    );
    
    // Create a map of prize names to their index for sorting
    const prizeIndexMap = new Map<string, number>();
    config.prizes.forEach((p, idx) => prizeIndexMap.set(p.name, idx));

    // Sort by prize tier, then timestamp
    accepted.sort((a, b) => {
      const idxA = prizeIndexMap.get(a.prize) ?? 999;
      const idxB = prizeIndexMap.get(b.prize) ?? 999;
      if (idxA !== idxB) return idxA - idxB;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    return accepted;
  }, [config.rewardLog, config.prizes, sessionId]);

  useEffect(() => {
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const prizeTiers = config.prizes;
  const winnersByTier = prizeTiers.map((prize, index) => {
    const winnersForThisPrize = winners.filter(w => w.prize === prize.name);
    return {
      prizeName: prize.name,
      tierIndex: index,
      winners: winnersForThisPrize
    };
  });

  const podiumTiers = [
    { 
      place: 1, 
      height: '50vh', 
      delay: '1s', 
      gradient: 'from-amber-600 via-yellow-500 to-amber-300', 
      borderClass: 'border-amber-400', 
      glowClass: 'shadow-[0_0_50px_rgba(234,179,8,0.4),_inset_0_2px_10px_rgba(255,255,255,0.4)]', 
      orderClass: 'order-2', 
      z: 'z-30',
      data: winnersByTier[0]
    },
    { 
      place: 2, 
      height: '40vh', 
      delay: '0.6s', 
      gradient: 'from-slate-600 via-slate-400 to-slate-200', 
      borderClass: 'border-slate-300', 
      glowClass: 'shadow-[0_0_40px_rgba(203,213,225,0.3),_inset_0_2px_10px_rgba(255,255,255,0.4)]', 
      orderClass: 'order-1', 
      z: 'z-20',
      data: winnersByTier[1]
    },
    { 
      place: 3, 
      height: '30vh', 
      delay: '0.2s', 
      gradient: 'from-amber-900 via-amber-700 to-amber-500', 
      borderClass: 'border-amber-600', 
      glowClass: 'shadow-[0_0_30px_rgba(180,83,9,0.25),_inset_0_2px_10px_rgba(255,255,255,0.3)]', 
      orderClass: 'order-3', 
      z: 'z-10',
      data: winnersByTier[2]
    }
  ].filter(tier => tier.data && tier.data.winners.length > 0);

  const sidebarWinners = winners.filter(w => {
    const prizeIdx = prizeTiers.findIndex(p => p.name === w.prize);
    return prizeIdx === -1 || prizeIdx >= 3;
  });

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-stretch justify-start relative overflow-hidden bg-gradient-to-br from-[#2D1B4E] to-[#1A0F2E]">
      
      {/* Left/Center Area: Title and Podium */}
      <div className="flex-1 flex flex-col items-center justify-between pb-0 pt-24 px-4 md:px-8 relative overflow-hidden min-w-0">
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all z-50 border border-white/20"
        >
          <ArrowLeft className="w-5 h-5" /> {t('game.back')}
        </button>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-400 text-center animate-pulse drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] z-40 w-full px-4">
          {t('finale.title')}
        </h1>

        <div className="flex items-end justify-center gap-4 w-full max-w-4xl px-4 relative z-40 mt-auto pb-0">
          {podiumTiers.map((tier) => (
            <div 
              key={tier.place} 
              className={`flex-1 min-w-0 flex flex-col items-center ${tier.orderClass} animate-[pop-up_0.8s_ease-out_forwards] opacity-0`}
              style={{ animationDelay: tier.delay }}
            >
              <div className="relative w-full flex flex-col items-center justify-end">
                {/* Winner Info positioned directly ON TOP of the podium step */}
                <div className="absolute bottom-[100%] left-0 right-0 flex flex-row flex-wrap justify-center items-end gap-2 pb-6 z-40 max-w-full px-2">
                  {tier.data.winners.map((winner) => (
                    <div key={winner.id} className="flex flex-col items-center text-center max-w-[70px] md:max-w-[100px] shrink-0">
                      {/* Avatar / Initials */}
                      <div className={`w-10 h-10 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${tier.gradient} p-0.5 shadow-[0_0_15px_rgba(255,255,255,0.2)] mb-2 flex items-center justify-center relative`}>
                        <div className="w-full h-full rounded-full bg-[#150D2A] flex items-center justify-center text-[10px] md:text-sm font-black text-white">
                          {winner.winnerName.charAt(0).toUpperCase() || '?'}
                        </div>
                      </div>
                      
                      {/* Winner Name & ID Plate */}
                      <div className="bg-black/60 backdrop-blur-md px-1.5 py-1 rounded-lg border border-white/10 shadow-xl w-full">
                        <p className="text-white font-black truncate text-[9px] md:text-[11px]">{winner.winnerName}</p>
                        <p className="text-yellow-300 font-bold text-[8px] md:text-[9px] truncate mt-0.5">{winner.winnerId}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Podium Block with exact height 30vh, 40vh, 50vh */}
                <div 
                  className={`w-full bg-gradient-to-t ${tier.gradient} rounded-t-2xl border-t-2 border-x-2 ${tier.borderClass} ${tier.glowClass} flex items-start justify-center pt-6 relative overflow-visible`}
                  style={{ height: tier.height }}
                >
                  <div className="absolute inset-0 bg-black/10 rounded-t-2xl" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-40 rounded-t-2xl" />
                  <span className="text-4xl md:text-5xl lg:text-6xl font-black text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] relative z-10 select-none">
                    {tier.place}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar: 4th Tier and below winners list */}
      <div className="w-full md:w-[350px] border-t md:border-t-0 md:border-l border-white/10 bg-black/35 backdrop-blur-2xl flex flex-col justify-start shrink-0 z-40 overflow-hidden md:h-screen pt-20 md:pt-24 pb-8 px-6">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3 shrink-0">
          <Trophy className="text-yellow-400 w-6 h-6" /> {t('finale.others')}
        </h2>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {sidebarWinners.length === 0 ? (
            <div className="text-white/40 text-sm text-center py-8">
              {t('log.empty')}
            </div>
          ) : (
            sidebarWinners.map((log) => (
              <div key={log.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-white shrink-0 text-sm">
                    {log.winnerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{log.winnerName}</p>
                    <p className="text-xs text-white/60 truncate">{log.prize}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-white/40">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  <p className="text-[11px] font-mono text-white/50">{log.winnerId}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
