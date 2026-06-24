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

const COLORS = ['#1E90FF', '#00C853', '#FF6B35', '#9C27B0', '#E91E63', '#3F51B5', '#FF9800'];

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
  const [rotation, setRotation] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showRewardLogModal, setShowRewardLogModal] = useState(false);
  const { t } = useLanguage();
  const controls = useAnimation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [displayParticipants, setDisplayParticipants] = useState<Participant[]>([]);
  const numSlices = displayParticipants.length;

  const currentPrize = config.prizes.find(p => p.id === selectedPrizeId);

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
    setDisplayParticipants(config.remainingParticipants.slice(0, Math.min(config.remainingParticipants.length, 50)));
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
  }, [displayParticipants]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || numSlices === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    ctx.clearRect(0, 0, width, height);

    const arcSize = (2 * Math.PI) / numSlices;

    for (let i = 0; i < numSlices; i++) {
      const angle = i * arcSize;
      
      // Draw slice
      ctx.beginPath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
      ctx.lineTo(centerX, centerY);
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
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
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${numSlices > 20 ? '10px' : '14px'} Inter, sans-serif`;
      
      const p = displayParticipants[i];
      let text = p.name;
      if (text.length > 10) text = text.substring(0, 8) + '...';
      
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    
    // Draw center dot
    ctx.beginPath();
    ctx.fillStyle = '#2A1F40';
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
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
    
    // We want the winning slice to end up at the top (270 degrees in canvas math, or pointing to our indicator)
    // Let's say indicator is on the right (0 degrees).
    const targetAngle = 360 - (winningIndex * arcSize + offset);
    
    const extraSpins = 5;
    const finalRotation = rotation + (360 - (rotation % 360)) + (extraSpins * 360) + targetAngle;

    setRotation(finalRotation);

    await controls.start({
      rotate: finalRotation,
      transition: { duration: 5, ease: [0.2, 0.8, 0.2, 1] } // Custom easing for spin effect
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
    <div className="flex flex-col items-center justify-between min-h-screen p-8 text-white w-full">
      
      {/* Header */}
      <div className="w-full max-w-[1120px] flex justify-between items-center z-50 relative pointer-events-auto">
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
            <Trophy className="w-5 h-5 text-[#FFD700]" />
            <select 
              value={selectedPrizeId}
              onChange={(e) => setSelectedPrizeId(e.target.value)}
              disabled={isSpinning || !!winner}
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
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center w-full z-10 relative mt-4 gap-12 max-w-[1120px]">
        
        {/* Left Side: Wheel */}
        <div className="relative flex items-center justify-center">
          {/* Wheel Container */}
          <div className="relative bg-[#2A1F40] p-4 rounded-full border-8 border-[#FF6B35]/50 shadow-[0_0_50px_rgba(255,107,53,0.3)]">
            <motion.canvas 
              ref={canvasRef}
              width={400}
              height={400}
              className="rounded-full"
              animate={controls}
            />
          </div>
          
          {/* Indicator Pointer (Right side, 0 degrees) */}
          <div className="absolute right-[-20px] top-1/2 transform -translate-y-1/2 text-[#FFD700] z-20 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12L20 4V20L4 12Z" />
            </svg>
          </div>
        </div>

        {/* Right Side: Winner Reveal & Controls */}
        <div className="flex flex-col items-center md:items-start justify-center gap-8 w-full max-w-sm">
          <div className="mb-4">
             <h2 className="text-2xl text-[#FFD700] font-bold drop-shadow-lg text-center md:text-left">{t('game.drawing')} {currentPrize?.name || t('game.prizeDefault')}</h2>
          </div>

          {/* Winner Display */}
          <div className="liquid-glass-dark rounded-[24px] p-8 w-full min-h-[160px] flex flex-col items-center justify-center text-center">
            {winner ? (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="text-sm font-mono text-[#FF6B35] tracking-widest uppercase">{t('modal.winner')}</div>
                <div className="text-3xl font-bold text-white mt-2">{winner.name}</div>
                <div className="text-white/50 font-mono text-sm">{winner.ids}</div>
              </motion.div>
            ) : (
              <div className="text-white/40 font-medium text-lg">
                {isSpinning ? t('game.drawing') : t('game.spin')}
              </div>
            )}
          </div>

          <button
            onClick={startSpin}
            disabled={isSpinning || !!winner || config.remainingParticipants.length === 0}
            className={`w-full py-5 rounded-2xl font-bold text-xl flex justify-center items-center gap-3 transition-all duration-300 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.2)] ${
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
