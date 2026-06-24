import React, { useState, useEffect, useRef } from 'react';
import { EventConfig, Participant, Prize, RewardLogEntry } from '../types';
import { ArrowLeft, Play, Trophy, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, useAnimation } from 'motion/react';
import RewardDecisionModal from './RewardDecisionModal';
import RewardLogModal from './RewardLogModal';
import { useLanguage } from '../LanguageContext';

interface Props {
  config: EventConfig;
  onBack: () => void;
  updateConfig: (newConfig: Partial<EventConfig>) => void;
}

export default function LuckyNumbersGame({ config, onBack, updateConfig }: Props) {
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(() => {
    // Start at the first prize not yet fully awarded in the current session
    const sessionLog = config.rewardLog.filter(l => l.sessionId === config.currentSessionId && l.isAccepted);
    const firstUnfilled = config.prizes.find(p => {
      const count = sessionLog.filter(l => l.prize === p.name).length;
      return count < p.count;
    });
    return firstUnfilled?.id || config.prizes[0]?.id || '';
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [displayNumber, setDisplayNumber] = useState('000000');
  const [displayName, setDisplayName] = useState('???');
  const [showModal, setShowModal] = useState(false);
  const [showRewardLogModal, setShowRewardLogModal] = useState(false);
  const { t } = useLanguage();
  
  const drawIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const currentPrize = config.prizes.find(p => p.id === selectedPrizeId);
    if (!currentPrize) return;

    const sessionLog = config.rewardLog.filter(l => l.sessionId === config.currentSessionId);
    const acceptedCount = sessionLog.filter(l => l.prize === currentPrize.name && l.isAccepted).length;
    if (acceptedCount >= currentPrize.count) {
      // Find the first prize that hasn't reached its count in this session
      for (const p of config.prizes) {
        const count = sessionLog.filter(l => l.prize === p.name && l.isAccepted).length;
        if (count < p.count) {
          setSelectedPrizeId(p.id);
          break;
        }
      }
    }
  }, [config.rewardLog, config.prizes, config.currentSessionId, selectedPrizeId]);

  const currentPrize = config.prizes.find(p => p.id === selectedPrizeId);

  const handleDecision = (decision: 'ACCEPT' | 'REJECT_KEEP' | 'REJECT_REMOVE') => {
    if (!winner || !currentPrize) return;

    const logEntry: RewardLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      eventName: config.eventName,
      gameType: 'Lucky Numbers',
      prize: currentPrize.name,
      winnerId: winner.ids,
      winnerName: winner.name,
      isAccepted: decision === 'ACCEPT',
      isRejected: decision !== 'ACCEPT',
      isRemovedFromPool: decision === 'ACCEPT' || decision === 'REJECT_REMOVE',
      status: decision === 'ACCEPT' ? 'Accepted' : decision === 'REJECT_KEEP' ? 'Rejected (Kept)' : 'Rejected (Removed)',
      sessionId: config.currentSessionId,
    };

    let newRemaining = [...config.remainingParticipants];
    if (decision === 'ACCEPT' || decision === 'REJECT_REMOVE') {
      newRemaining = newRemaining.filter(p => p.ids !== winner.ids);
    }

    updateConfig({
      rewardLog: [...config.rewardLog, logEntry],
      remainingParticipants: newRemaining
    });

    setShowModal(false);
    setWinner(null);
  };

  const startDraw = () => {
    if (config.remainingParticipants.length === 0 || isDrawing) return;
    
    setIsDrawing(true);
    setWinner(null);
    setDisplayNumber('000000');
    setDisplayName('???');

    // Start rolling effect
    let iterations = 0;
    const maxIterations = 40; // 40 ticks
    
    drawIntervalRef.current = window.setInterval(() => {
      // Pick random participant for the tick
      const randomP = config.remainingParticipants[Math.floor(Math.random() * config.remainingParticipants.length)];
      setDisplayNumber(randomP.ids);
      setDisplayName(randomP.name);
      
      iterations++;
      
      if (iterations >= maxIterations) {
        if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
        
        // Final selection
        const finalWinner = config.remainingParticipants[Math.floor(Math.random() * config.remainingParticipants.length)];
        setWinner(finalWinner);
        setDisplayNumber(finalWinner.ids);
        setDisplayName(finalWinner.name);
        setIsDrawing(false);
        
        // Fire confetti
        triggerConfetti();

        // Show decision modal after a short delay
        setTimeout(() => setShowModal(true), 1500);
      }
    }, 100);
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
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
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-8 text-white w-full">
      
      {/* Header */}
      <div className="w-full max-w-[1120px] flex justify-between items-center z-50 relative pointer-events-auto">
        <button
          onClick={onBack}
          disabled={isDrawing || !!winner}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[14px] bg-white/10 hover:bg-white/20 transition-all ${isDrawing || !!winner ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ArrowLeft className="w-4 h-4" /> {t('game.back')}
        </button>
        
        <h1 className="text-3xl font-bold">{config.eventName}</h1>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:block px-3 py-1.5 rounded-lg border border-white/10 bg-black/30 text-white/80 font-medium text-sm">
            {t('game.remaining', { count: config.remainingParticipants.length })}
          </div>
          <button
            onClick={() => setShowRewardLogModal(true)}
            disabled={isDrawing || !!winner}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[14px] bg-white/10 hover:bg-white/20 transition-all ${isDrawing || !!winner ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FileText className="w-4 h-4" /> {t('game.rewardLog')}
          </button>
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10">
            <Trophy className="w-5 h-5 text-[#FFD700]" />
            <select 
              value={selectedPrizeId}
              onChange={(e) => setSelectedPrizeId(e.target.value)}
              disabled={isDrawing || !!winner}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {config.prizes.map(p => (
                <option key={p.id} value={p.id} className="text-black">{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10 relative mt-[-50px]">
        
        <div className="mb-8">
           <h2 className="text-2xl text-[#FFD700] font-bold drop-shadow-lg">{t('game.drawing')} {currentPrize?.name || t('game.prizeDefault')}</h2>
        </div>

        {/* Slot Machine Container */}
        <div className="liquid-glass-dark rounded-[32px] p-8 md:p-12 w-full max-w-3xl flex flex-col items-center justify-center gap-6">
          
          <div className="bg-black/60 w-full rounded-2xl border-2 border-black/80 shadow-inner p-6 overflow-hidden flex flex-col items-center justify-center min-h-[200px] relative">
            <motion.div 
              className="text-5xl md:text-7xl font-mono font-bold tracking-widest text-white mb-4 z-10"
              animate={winner ? { scale: [1, 1.2, 1], color: ['#fff', '#FFD700', '#fff'] } : {}}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {displayNumber}
            </motion.div>
            
            <motion.div 
              className="text-2xl md:text-4xl font-bold text-[#1E90FF] z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={displayName}
            >
              {displayName}
            </motion.div>

            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-2xl" />
          </div>

        </div>

        {/* Action Button */}
        <button
          onClick={startDraw}
          disabled={isDrawing || !!winner || config.remainingParticipants.length === 0}
          className={`mt-12 px-12 py-5 rounded-2xl font-bold text-2xl flex items-center gap-4 transition-all duration-300 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.2)] ${
            isDrawing || !!winner || config.remainingParticipants.length === 0
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : 'bg-[#1E90FF] hover:bg-[#1c84ea] hover:scale-105 hover:shadow-[0_25px_50px_-12px_rgba(30,144,255,0.4)]'
          }`}
        >
          {isDrawing ? (
            t('game.drawing')
          ) : (
            <>
              <Play className="w-8 h-8 fill-current" />
              {t('game.draw')}
            </>
          )}
        </button>

      </div>

      {showModal && winner && currentPrize && (
        <RewardDecisionModal
          winner={winner}
          prize={currentPrize}
          onAccept={() => handleDecision('ACCEPT')}
          onRejectKeep={() => handleDecision('REJECT_KEEP')}
          onRejectRemove={() => handleDecision('REJECT_REMOVE')}
        />
      )}

      {showRewardLogModal && (
        <RewardLogModal
          rewardLog={config.rewardLog}
          onClose={() => setShowRewardLogModal(false)}
        />
      )}
    </div>
  );
}
