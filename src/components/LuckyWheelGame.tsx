import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EventConfig, Participant, Prize, RewardLogEntry } from '../types';
import { ArrowLeft, Play, Trophy, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import RewardDecisionModal from './RewardDecisionModal';
import RewardLogModal from './RewardLogModal';
import WinnersPanel from './WinnersPanel';
import { useLanguage } from '../LanguageContext';
import { useTheme } from '../ThemeContext';

interface Props {
  config: EventConfig;
  onBack: () => void;
  updateConfig: (newConfig: Partial<EventConfig>) => void;
}

const WHEEL_THEMES = {
  dark: {
    colors: ['#1E90FF', '#00C853', '#FF6B35', '#9C27B0', '#E91E63', '#3F51B5', '#FF9800'],
    border: 'rgba(255,255,255,0.2)',
    text: '#FFFFFF',
    textOutline: null as string | null,
    hubFill: '#2A1F40',
    hubStroke: '#FFD700',
  },
  // Deeper fills so white labels keep contrast on bright backgrounds
  light: {
    colors: ['#1565C0', '#2E7D32', '#D84315', '#7B1FA2', '#C2185B', '#303F9F', '#E65100'],
    border: 'rgba(255,255,255,0.6)',
    text: '#FFFFFF',
    textOutline: 'rgba(0,0,0,0.35)',
    hubFill: '#FFFFFF',
    hubStroke: '#B45309',
  },
};


export default function LuckyWheelGame({ config, onBack, updateConfig }: Props) {
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(() => {
    // Start at the first prize not yet fully awarded in the current session
    const sessionLog = config.rewardLog.filter(l => l.sessionId === config.currentSessionId && l.isAccepted);
    const firstUnfilled = config.prizes.find(p => {
      const count = sessionLog.filter(l => l.prize === p.name).length;
      return count < p.count;
    });
    return firstUnfilled?.id || config.prizes[0]?.id || '';
  });
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRewardLogModal, setShowRewardLogModal] = useState(false);
  const { t } = useLanguage();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const visualRotation = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const [displayParticipants, setDisplayParticipants] = useState<Participant[]>([]);
  const numSlices = displayParticipants.length;

  const tapeY = useTransform(visualRotation, (r) => {
    if (numSlices === 0) return 100;
    const deg = (360 - (r % 360)) % 360;
    const rawIndex = (deg < 0 ? deg + 360 : deg) / (360 / numSlices);
    return 100 - rawIndex * 40;
  });

  useEffect(() => {
    const unsubscribe = visualRotation.on("change", (r) => {
      if (numSlices === 0) return;
      const deg = (360 - (r % 360)) % 360;
      const idx = Math.floor((deg < 0 ? deg + 360 : deg) / (360 / numSlices)) % numSlices;
      setActiveIndex(idx);
    });
    return () => unsubscribe();
  }, [visualRotation, numSlices]);

  const currentPrize = config.prizes.find(p => p.id === selectedPrizeId);

  // Ranked by prize order (first prize first); draw order within the same prize
  const sessionWinners = useMemo(() => {
    const rank = (prize: string) => {
      const i = config.prizes.findIndex(p => p.name === prize);
      return i === -1 ? config.prizes.length : i;
    };
    return config.rewardLog
      .filter(l => l.sessionId === config.currentSessionId && l.isAccepted && l.gameType === 'Lucky Wheel')
      .map((entry, order) => ({ entry, order }))
      .sort((a, b) => rank(a.entry.prize) - rank(b.entry.prize) || a.order - b.order)
      .map(x => x.entry);
  }, [config.rewardLog, config.currentSessionId, config.prizes]);
  const latestWinnerId = sessionWinners.reduce<RewardLogEntry | null>(
    (latest, e) => (!latest || e.timestamp >= latest.timestamp ? e : latest),
    null
  )?.id;

  const handleDecision = (decision: 'ACCEPT' | 'REJECT_KEEP' | 'REJECT_REMOVE') => {
    if (!winner || !currentPrize) return;

    const logEntry: RewardLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      eventName: config.eventName,
      gameType: 'Lucky Wheel',
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

  useEffect(() => {
    setDisplayParticipants(config.remainingParticipants);
  }, [config.remainingParticipants]);

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

  useEffect(() => {
    drawWheel();
  }, [displayParticipants, theme]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || numSlices === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2;

    ctx.clearRect(0, 0, width, height);

    const wt = WHEEL_THEMES[theme];
    const arcSize = (2 * Math.PI) / numSlices;

    for (let i = 0; i < numSlices; i++) {
      const angle = i * arcSize;
      
      // Draw slice
      ctx.beginPath();
      ctx.fillStyle = wt.colors[i % wt.colors.length];
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
      ctx.lineTo(centerX, centerY);
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = wt.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(
        centerX + Math.cos(angle + arcSize / 2) * (radius * 0.7),
        centerY + Math.sin(angle + arcSize / 2) * (radius * 0.7)
      );
      ctx.rotate(angle + arcSize / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let fontSize = '14px';
      let shouldDrawText = true;
      if (numSlices > 100) {
        shouldDrawText = false;
      } else if (numSlices > 60) {
        fontSize = '6px';
      } else if (numSlices > 30) {
        fontSize = '8px';
      } else if (numSlices > 15) {
        fontSize = '11px';
      }

      if (shouldDrawText) {
        ctx.fillStyle = wt.text;
        ctx.font = `bold ${fontSize} Inter, sans-serif`;
        
        const p = displayParticipants[i];
        let text = p.name;
        const maxLen = numSlices > 60 ? 5 : 10;
        if (text.length > maxLen) {
          text = text.substring(0, maxLen - 2) + '..';
        }
        
        if (wt.textOutline) {
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = wt.textOutline;
          ctx.strokeText(text, 0, 0);
        }
        ctx.fillText(text, 0, 0);
      }
      ctx.restore();
    }
    
    // Draw center dot
    ctx.beginPath();
    ctx.fillStyle = wt.hubFill;
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = wt.hubStroke;
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  const startSpin = async () => {
    if (config.remainingParticipants.length === 0 || isSpinning) return;
    
    setIsSpinning(true);
    setWinner(null);

    // Pick winner from FULL participant list
    const finalWinner = config.remainingParticipants[Math.floor(Math.random() * config.remainingParticipants.length)];
    
    // Find if winner is in our visual slices
    let winningIndex = displayParticipants.findIndex(p => p.ids === finalWinner.ids);
    
    // If winner is not in the visual slices (e.g. >50), we replace a random slice with them
    if (winningIndex === -1) {
      winningIndex = Math.floor(Math.random() * displayParticipants.length);
      const newDisplay = [...displayParticipants];
      newDisplay[winningIndex] = finalWinner;
      setDisplayParticipants(newDisplay);
      // Wait for state to update and wheel to redraw
      await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    const arcSize = 360 / numSlices;
    const offset = arcSize / 2; // target middle of slice
    const targetAngle = 360 - (winningIndex * arcSize + offset);
    const extraSpins = 5;
    const currentRot = visualRotation.get();
    const finalRotation = currentRot + (360 - (currentRot % 360)) + (extraSpins * 360) + targetAngle;

    await animate(visualRotation, finalRotation, {
      duration: 5,
      ease: [0.2, 0.8, 0.2, 1] // Custom easing for spin effect
    });

    setWinner(finalWinner);
    setIsSpinning(false);
    triggerConfetti();

    setTimeout(() => setShowModal(true), 1500);
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
    <div className="relative flex flex-col items-center justify-between min-h-screen p-8 text-white w-full">
      
      {/* Header */}
      <div className="w-full max-w-[1400px] flex justify-between items-center z-50 relative pointer-events-auto">
        <button
          onClick={onBack}
          disabled={isSpinning || !!winner}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[14px] bg-white/10 hover:bg-white/20 transition-all ${isSpinning || !!winner ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            disabled={isSpinning || !!winner}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[14px] bg-white/10 hover:bg-white/20 transition-all ${isSpinning || !!winner ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <FileText className="w-4 h-4" /> {t('game.rewardLog')}
          </button>
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10">
            <Trophy className="w-5 h-5 text-brand-gold" />
            <select 
              value={selectedPrizeId}
              onChange={(e) => setSelectedPrizeId(e.target.value)}
              disabled={isSpinning || !!winner}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {config.prizes.map(p => (
                <option key={p.id} value={p.id} className="text-gray-900">{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_420px] lg:gap-x-8 gap-y-6 items-start w-full z-10 relative mt-4 gap-8 max-w-[1400px]">

        {/* Left: Reel */}
        <div className="order-2 lg:order-none flex justify-center lg:justify-start lg:col-start-1 lg:row-start-2 lg:self-center">
          {/* Sliding Name Reel  */}
          {displayParticipants.length > 0 && (
            <div className="relative z-30 w-full max-w-[320px] h-[240px] shrink-0 liquid-glass rounded-2xl overflow-hidden border border-white/10 flex flex-col shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              {/* Header */}
              <div className="bg-black/40 px-4 py-2 border-b border-white/5 text-center text-xs font-bold tracking-wider text-white/60">
                {t('game.remainingParticipants') || 'DANH SÁCH VÒNG XOAY'}
              </div>
          
              {/* Reel Area */}
              <div className="flex-1 relative overflow-hidden">
                {/* Center active highlight line */}
                <div className="absolute inset-x-2 top-[100px] h-[40px] rounded-lg bg-[#FF6B35]/20 border border-[#FF6B35]/40 pointer-events-none z-10 flex items-center justify-between px-3">
                  <span className="text-brand-gold text-xs font-bold">▶</span>
                  <span className="text-brand-gold text-xs font-bold">◀</span>
                </div>
            
                {/* Scrollable list */}
                <motion.div
                  style={{ y: tapeY }}
                  className="absolute left-0 right-0 flex flex-col"
                >
                  {displayParticipants.map((p, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        key={`reel-${p.ids}`}
                        className={`h-[40px] flex items-center justify-center px-4 transition-all duration-150 ${
                          isActive 
                            ? 'text-brand-gold font-bold text-base scale-105 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]' 
                            : 'text-white/40 text-sm'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                      </div>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Title + Wheel + Spin */}
        <div className="order-1 lg:order-2 flex flex-col items-center gap-6 min-w-0 lg:contents">
          <h2 className="text-2xl text-brand-gold font-bold drop-shadow-lg text-center lg:col-start-2 lg:row-start-1">{t('game.drawing')} {currentPrize?.name || t('game.prizeDefault')}</h2>
          {/* Wheel */}
          <div className="relative flex items-center justify-center lg:col-start-2 lg:row-start-2 lg:justify-self-center">
            {/* Wheel Container */}
            <div className="relative bg-(--surface-head) rounded-full border-8 border-[#FF6B35]/50 shadow-[0_0_50px_rgba(255,107,53,0.3)]">
              <motion.canvas 
                ref={canvasRef}
                width={400}
                height={400}
                className="rounded-full"
                style={{ rotate: visualRotation }}
              />
            </div>
          
            {/* Indicator Pointer (Right side, 0 degrees) */}
            <div className="absolute right-[-20px] top-1/2 transform -translate-y-1/2 text-brand-gold z-20 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 12L20 4V20L4 12Z" />
              </svg>
            </div>
          </div>

          <button
            onClick={startSpin}
            disabled={isSpinning || !!winner || config.remainingParticipants.length === 0}
            className={`w-full max-w-[400px] lg:col-start-2 lg:row-start-3 lg:justify-self-center py-5 rounded-2xl font-bold text-xl text-on-accent flex justify-center items-center gap-3 transition-all duration-300 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.2)] ${
              isSpinning || !!winner || config.remainingParticipants.length === 0
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-[#FF6B35] hover:bg-[#ff8052] hover:scale-105 hover:shadow-[0_25px_50px_-12px_rgba(255,107,53,0.4)]'
            }`}
          >
            {isSpinning ? (
              t('game.drawing')
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" />
                {t('game.spin')}
              </>
            )}
          </button>

          {/* Winner Display */}
          <div className="liquid-glass-dark rounded-[24px] p-5 w-full max-w-[400px] min-h-[96px] lg:col-start-2 lg:row-start-4 lg:justify-self-center flex flex-col items-center justify-center text-center">
            {winner ? (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-sm font-mono text-brand-orange tracking-widest uppercase">{t('modal.winner')}</div>
                <div className="text-3xl font-bold text-white mt-2">{winner.name}</div>
                <div className="text-white/50 font-mono text-sm">{winner.ids}</div>
              </motion.div>
            ) : (
              <div className="text-white/40 font-medium text-lg">
                {isSpinning ? t('game.drawing') : t('game.spin')}
              </div>
            )}
          </div>
        </div>

        {/* Right: Winners */}
        <div className="order-3 lg:order-none lg:col-start-3 lg:row-start-2 lg:self-center">
          <WinnersPanel entries={sessionWinners} latestId={latestWinnerId} />
        </div>

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
