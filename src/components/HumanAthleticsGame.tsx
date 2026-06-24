import React, { useState, useEffect, useRef } from 'react';
import { EventConfig, Participant, Prize, RewardLogEntry } from '../types';
import { ArrowLeft, Play, Trophy, FileText, RotateCcw, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import RewardDecisionModal from './RewardDecisionModal';
import RewardLogModal from './RewardLogModal';
import { useLanguage } from '../LanguageContext';

interface Props {
  config: EventConfig;
  onBack: () => void;
  updateConfig: (newConfig: Partial<EventConfig>) => void;
}

interface Runner {
  participant: Participant;
  progress: number;
  color: string;
  lane: number;
  isWinner: boolean;
  yOffset: number;
  xOffset: number;
  phase: number; // 0 or 0.5 for alternating gait
}

const RUNNER_COLORS = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#007AFF',
  '#AF52DE',
  '#FF2D55',
  '#5AC8FA',
];

interface Waypoint {
  t: number;
  d: number;
}

interface RunnerState {
  id: string;
  isWinner: boolean;
  finishTime: number;
  waypoints: Waypoint[];
  progress: number;
  lastProgress: number;
}

class RaceState {
  runners: RunnerState[];
  trackWidth = 800;

  constructor(runnersData: { ids: string; isWinner: boolean }[]) {
    const winnerFinishTime = 4200 + Math.random() * 800;
    this.runners = runnersData.map(r => {
      const finishTime = r.isWinner
        ? winnerFinishTime
        : winnerFinishTime + 800 + Math.random() * 1200;
      return {
        id: r.ids,
        isWinner: r.isWinner,
        finishTime,
        waypoints: this.generateWaypoints(),
        progress: 0,
        lastProgress: 0,
      };
    });
  }

  generateWaypoints(): Waypoint[] {
    const points: Waypoint[] = [{ t: 0, d: 0 }];
    const tVals = [0.20, 0.40, 0.60, 0.80];
    let lastD = 0;
    tVals.forEach(t => {
      let minD = lastD + 0.02;
      let maxD = t + 0.15;
      if (minD > maxD) { minD = lastD + 0.01; maxD = lastD + 0.04; }
      const d = Math.min(0.92, minD + Math.random() * (maxD - minD));
      points.push({ t, d });
      lastD = d;
    });
    points.push({ t: 1.0, d: 1.0 });
    return points;
  }

  interpolate(u: number, waypoints: Waypoint[]): number {
    let i = 0;
    while (i < waypoints.length - 1 && u > waypoints[i + 1].t) i++;
    const pA = waypoints[i];
    const pB = waypoints[i + 1];
    const v = (u - pA.t) / (pB.t - pA.t);
    const eased = (1 - Math.cos(v * Math.PI)) / 2;
    return pA.d + (pB.d - pA.d) * eased;
  }

  update(elapsed: number): boolean {
    let winnerFinished = false;
    this.runners.forEach(runner => {
      runner.lastProgress = runner.progress;
      const u = Math.min(elapsed / runner.finishTime, 1.0);
      let d = this.interpolate(u, runner.waypoints);
      if (runner.isWinner && u >= 1.0) { d = 1.0; winnerFinished = true; }
      if (!runner.isWinner) d = Math.min(d, 0.96);
      runner.progress = d;
    });
    return winnerFinished;
  }
}

// ─── Realistic SVG Runner ─────────────────────────────────────────────────────
// Uses proper body segments: head, neck, torso, upper/lower arms, upper/lower legs
// Each limb has a data-limb attribute for direct DOM manipulation of animation-delay
function RunnerSVG({ color, size, phase }: { color: string; size: number; phase: number }) {
  // phase 0 = left leg forward first, phase 0.5 = right leg forward first
  const phaseS = `${phase}s`;
  const antiPhaseS = `${phase === 0 ? 0.25 : 0.75}s`;

  return (
    <svg
      viewBox="0 0 48 80"
      width={size}
      height={size * 1.67}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Shadow ellipse */}
      <ellipse cx="24" cy="78" rx="10" ry="3" fill="rgba(0,0,0,0.25)" />

      {/* === LEGS === */}
      {/* Left upper leg */}
      <g
        className="limb-left-upper-leg"
        style={{
          transformOrigin: '22px 44px',
          animationName: 'runLegFwd',
          animationDuration: '0.5s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: phaseS,
          animationPlayState: 'paused',
        }}
      >
        <line x1="22" y1="44" x2="18" y2="60" stroke={color} strokeWidth="5" strokeLinecap="round" />
        {/* Left lower leg */}
        <g
          className="limb-left-lower-leg"
          style={{
            transformOrigin: '18px 60px',
            animationName: 'runKneeBend',
            animationDuration: '0.5s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: phaseS,
            animationPlayState: 'paused',
          }}
        >
          <line x1="18" y1="60" x2="14" y2="74" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          {/* Left foot */}
          <line x1="14" y1="74" x2="8" y2="76" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>

      {/* Right upper leg */}
      <g
        className="limb-right-upper-leg"
        style={{
          transformOrigin: '26px 44px',
          animationName: 'runLegBack',
          animationDuration: '0.5s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: phaseS,
          animationPlayState: 'paused',
        }}
      >
        <line x1="26" y1="44" x2="30" y2="60" stroke={color} strokeWidth="5" strokeLinecap="round" />
        {/* Right lower leg */}
        <g
          className="limb-right-lower-leg"
          style={{
            transformOrigin: '30px 60px',
            animationName: 'runKneeBendBack',
            animationDuration: '0.5s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: phaseS,
            animationPlayState: 'paused',
          }}
        >
          <line x1="30" y1="60" x2="34" y2="74" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          {/* Right foot */}
          <line x1="34" y1="74" x2="40" y2="76" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>

      {/* Torso with forward lean */}
      <g
        className="limb-torso"
        style={{
          transformOrigin: '24px 44px',
          animationName: 'runBob',
          animationDuration: '0.25s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: phaseS,
          animationPlayState: 'paused',
        }}
      >
        {/* Torso body */}
        <line x1="24" y1="22" x2="24" y2="44" stroke={color} strokeWidth="6" strokeLinecap="round" />

        {/* LEFT ARM (back swing) */}
        <g
          className="limb-left-arm"
          style={{
            transformOrigin: '24px 26px',
            animationName: 'runArmBack',
            animationDuration: '0.5s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: phaseS,
            animationPlayState: 'paused',
          }}
        >
          <line x1="24" y1="26" x2="16" y2="38" stroke={color} strokeWidth="4" strokeLinecap="round" />
          {/* left forearm */}
          <g
            style={{
              transformOrigin: '16px 38px',
              animationName: 'runElbowBend',
              animationDuration: '0.5s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: phaseS,
              animationPlayState: 'paused',
            }}
          >
            <line x1="16" y1="38" x2="10" y2="46" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </g>

        {/* RIGHT ARM (forward swing) */}
        <g
          className="limb-right-arm"
          style={{
            transformOrigin: '24px 26px',
            animationName: 'runArmFwd',
            animationDuration: '0.5s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: phaseS,
            animationPlayState: 'paused',
          }}
        >
          <line x1="24" y1="26" x2="32" y2="38" stroke={color} strokeWidth="4" strokeLinecap="round" />
          {/* right forearm */}
          <g
            style={{
              transformOrigin: '32px 38px',
              animationName: 'runElbowBendFwd',
              animationDuration: '0.5s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: phaseS,
              animationPlayState: 'paused',
            }}
          >
            <line x1="32" y1="38" x2="38" y2="30" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </g>

        {/* Head */}
        <circle cx="24" cy="13" r="9" fill={color} />
        {/* Neck */}
        <line x1="24" y1="20" x2="24" y2="24" stroke={color} strokeWidth="5" strokeLinecap="round" />
        {/* Hair / cap top accent */}
        <ellipse cx="24" cy="5" rx="6" ry="4" fill={color} opacity="0.7" />
      </g>
    </svg>
  );
}

export default function HumanAthleticsGame({ config, onBack, updateConfig }: Props) {
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(() => {
    const sessionLog = config.rewardLog.filter(l => l.sessionId === config.currentSessionId && l.isAccepted);
    const firstUnfilled = config.prizes.find(p => {
      const count = sessionLog.filter(l => l.prize === p.name).length;
      return count < p.count;
    });
    return firstUnfilled?.id || config.prizes[0]?.id || '';
  });
  const [isRacing, setIsRacing] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [raceId, setRaceId] = useState(0);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showRewardLogModal, setShowRewardLogModal] = useState(false);
  const [tapeBroken, setTapeBroken] = useState(false);

  const { t } = useLanguage();

  const trackRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const runnersRef = useRef<Runner[]>([]);
  const isRacingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number | null>(null);
  const raceStateRef = useRef<RaceState | null>(null);

  const currentPrize = config.prizes.find(p => p.id === selectedPrizeId);

  // Auto-switch to next available prize when current one is full
  useEffect(() => {
    const currentPrize = config.prizes.find(p => p.id === selectedPrizeId);
    if (!currentPrize) return;
    const sessionLog = config.rewardLog.filter(l => l.sessionId === config.currentSessionId);
    const acceptedCount = sessionLog.filter(l => l.prize === currentPrize.name && l.isAccepted).length;
    if (acceptedCount >= currentPrize.count) {
      for (const p of config.prizes) {
        const count = sessionLog.filter(l => l.prize === p.name && l.isAccepted).length;
        if (count < p.count) { setSelectedPrizeId(p.id); break; }
      }
    }
  }, [config.rewardLog, config.prizes, config.currentSessionId, selectedPrizeId]);

  useEffect(() => {
    if (config.remainingParticipants.length > 0 && !isRacing && !hasFinished) {
      setupRace();
    }
  }, [config.remainingParticipants]);

  const setupRace = (customPool?: Participant[]) => {
    setRaceId(prev => prev + 1);
    setTapeBroken(false);
    const pool = customPool || config.remainingParticipants;
    if (pool.length === 0) { setWinner(null); setWinnerId(null); setRunners([]); return; }

    const winnerIndex = Math.floor(Math.random() * pool.length);
    const chosenWinner = pool[winnerIndex];

    const raceParticipants = [...pool];
    while (raceParticipants.length < 5) {
      raceParticipants.push({
        ids: `DUMMY-${raceParticipants.length + 1}`,
        name: `Runner ${String.fromCharCode(65 + raceParticipants.length)}`
      });
    }

    const shuffledRace = raceParticipants.sort(() => 0.5 - Math.random());
    const laneCounts = [0, 0, 0, 0, 0];
    shuffledRace.forEach((_, i) => { laneCounts[i % 5]++; });
    const laneCurrentIndices = [0, 0, 0, 0, 0];

    const raceState = new RaceState(shuffledRace.map(p => ({ ids: p.ids, isWinner: p.ids === chosenWinner.ids })));
    raceStateRef.current = raceState;

    const initialRunners = shuffledRace.map((participant, index) => {
      const lane = index % 5;
      const countInLane = laneCounts[lane];
      const indexInLane = laneCurrentIndices[lane];
      laneCurrentIndices[lane]++;
      let yOffset = 50;
      if (countInLane > 1) yOffset = 15 + (70 * (indexInLane / (countInLane - 1)));
      return {
        participant,
        progress: 0,
        color: RUNNER_COLORS[index % RUNNER_COLORS.length],
        lane,
        isWinner: participant.ids === chosenWinner.ids,
        yOffset,
        xOffset: 0,
        phase: (index % 2) * 0.5,
      };
    });

    setRunners(initialRunners);
    runnersRef.current = initialRunners;
    setWinner(chosenWinner);
    setWinnerId(chosenWinner.ids);
    setHasFinished(false);
  };

  const startRace = () => {
    if (isRacing || config.remainingParticipants.length === 0 || !raceStateRef.current) return;
    if (hasFinished) setupRace();

    setIsRacing(true);
    isRacingRef.current = true;
    startTimeRef.current = null;

    const trackWidth = trackRef.current ? trackRef.current.getBoundingClientRect().width : 900;
    raceStateRef.current.trackWidth = trackWidth;

    // Switch runner elements from CSS percentage positioning to absolute pixel positioning
    // so the translate3d in animateRace controls their X position cleanly
    raceStateRef.current.runners.forEach(runner => {
      const el = document.querySelector<HTMLDivElement>(`[data-runner-id="${runner.id}"]`);
      if (el) {
        el.style.left = '0px';
        // Place runner at startX immediately so there's no jump on frame 1
        const startX = trackWidth * 0.14;
        el.style.transform = `translate3d(${startX}px, -50%, 0)`;
      }
    });

    // Play all limb animations
    document.querySelectorAll<HTMLElement>('[data-runner-el] *').forEach(el => {
      (el as HTMLElement).style.animationPlayState = 'running';
    });

    requestRef.current = requestAnimationFrame(animateRace);
  };

  const animateRace = (timestamp: number) => {
    if (!isRacingRef.current || !raceStateRef.current) return;
    if (startTimeRef.current === null) startTimeRef.current = timestamp;

    const elapsed = timestamp - startTimeRef.current;
    const raceState = raceStateRef.current;
    const winnerFinished = raceState.update(elapsed);

    const trackWidth = raceState.trackWidth;
    const startX = trackWidth * 0.14;
    const totalDistance = trackWidth * 0.74;

    raceState.runners.forEach(runner => {
      const el = document.querySelector<HTMLDivElement>(`[data-runner-id="${runner.id}"]`);
      if (!el) return;

      const currentX = startX + runner.progress * totalDistance;
      el.style.transform = `translate3d(${currentX}px, -50%, 0)`;

      // Velocity → limb cadence (faster runner = faster limb cycle)
      const velocity = (runner.progress - runner.lastProgress) * 60;
      const dur = Math.max(0.15, Math.min(0.85, 0.07 / Math.max(0.005, velocity)));
      const halfDur = dur / 2;

      // Update all animated SVG elements inside this runner
      el.querySelectorAll<HTMLElement>('[style*="animationName"]').forEach(limb => {
        limb.style.animationDuration = `${limb.style.animationName?.includes('Bob') ? halfDur : dur}s`;
      });
    });

    if (winnerFinished) {
      handleRaceFinish();
    } else {
      requestRef.current = requestAnimationFrame(animateRace);
    }
  };

  const handleRaceFinish = () => {
    setIsRacing(false);
    isRacingRef.current = false;
    setHasFinished(true);
    setTapeBroken(true);

    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    // Pause all limb animations
    document.querySelectorAll<HTMLElement>('[data-runner-el] *').forEach(el => {
      el.style.animationPlayState = 'paused';
    });

    // Sync final positions to React state
    if (raceStateRef.current) {
      const finalRunners = runnersRef.current.map(runner => {
        const rs = raceStateRef.current!.runners.find(r => r.id === runner.participant.ids)!;
        return { ...runner, progress: rs.progress * 100 };
      });
      setRunners(finalRunners);
      runnersRef.current = finalRunners;
    }

    confetti({ particleCount: 200, spread: 90, origin: { y: 0.55 }, colors: ['#FFD700', '#FF6B35', '#00C853', '#007AFF', '#fff'] });

    setTimeout(() => setShowDecisionModal(true), 1200);
  };

  const handleDecision = (decision: 'ACCEPT' | 'REJECT_KEEP' | 'REJECT_REMOVE') => {
    if (!winner || !currentPrize) return;
    const logEntry: RewardLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      eventName: config.eventName,
      gameType: 'Human Athletics',
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

    updateConfig({ rewardLog: [...config.rewardLog, logEntry], remainingParticipants: newRemaining });
    setShowDecisionModal(false);

    if (newRemaining.length > 0) setupRace(newRemaining);
    else { setWinner(null); setWinnerId(null); setRunners([]); }
  };

  useEffect(() => {
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  // ─── Compute runner display size based on crowd density ────────────────────
  const maxInLane = runners.length > 0
    ? Math.max(...Array.from({ length: 5 }, (_, i) => runners.filter(r => r.lane === i).length))
    : 1;
  const runnerSize = maxInLane > 15 ? 18 : maxInLane > 8 ? 24 : maxInLane > 4 ? 30 : 38;

  const finishPct = 88; // percentage position of finish line from left

  return (
    <div className="flex flex-col min-h-screen text-white w-full relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0f0622 0%, #1a0f2e 40%, #0f1a0f 100%)' }}>
      {/* ── Keyframe Styles ─────────────────────────────────────────────── */}
      <style>{`
        /* Leg: forward swing */
        @keyframes runLegFwd {
          0%   { transform: rotate(-30deg); }
          50%  { transform: rotate(35deg);  }
          100% { transform: rotate(-30deg); }
        }
        /* Leg: back swing (opposite phase) */
        @keyframes runLegBack {
          0%   { transform: rotate(35deg);  }
          50%  { transform: rotate(-30deg); }
          100% { transform: rotate(35deg);  }
        }
        /* Knee bend for forward leg */
        @keyframes runKneeBend {
          0%   { transform: rotate(-40deg); }
          25%  { transform: rotate(-55deg); }
          50%  { transform: rotate(10deg);  }
          100% { transform: rotate(-40deg); }
        }
        /* Knee bend for back leg — stays relatively straight */
        @keyframes runKneeBendBack {
          0%   { transform: rotate(10deg);  }
          50%  { transform: rotate(-15deg); }
          100% { transform: rotate(10deg);  }
        }
        /* Arm: forward swing (opposite leg) */
        @keyframes runArmFwd {
          0%   { transform: rotate(-30deg); }
          50%  { transform: rotate(25deg);  }
          100% { transform: rotate(-30deg); }
        }
        /* Arm: back swing */
        @keyframes runArmBack {
          0%   { transform: rotate(25deg);  }
          50%  { transform: rotate(-30deg); }
          100% { transform: rotate(25deg);  }
        }
        /* Elbow: bent when arm forward */
        @keyframes runElbowBend {
          0%   { transform: rotate(-15deg); }
          50%  { transform: rotate(-35deg); }
          100% { transform: rotate(-15deg); }
        }
        @keyframes runElbowBendFwd {
          0%   { transform: rotate(10deg);  }
          50%  { transform: rotate(-20deg); }
          100% { transform: rotate(10deg);  }
        }
        /* Torso bob */
        @keyframes runBob {
          0%, 100% { transform: translateY(0px) rotate(-6deg); }
          50%       { transform: translateY(-2px) rotate(-6deg); }
        }
        /* Finish tape shake */
        @keyframes tapeShake {
          0%, 100% { transform: scaleX(1);   opacity: 1; }
          50%       { transform: scaleX(1.04); opacity: 0.8; }
        }
        @keyframes tapeBurst {
          0%   { transform: scaleX(1); opacity: 1; }
          60%  { transform: scaleX(1.3) rotate(2deg); opacity: 0.6; }
          100% { transform: scaleX(2) rotate(5deg); opacity: 0; }
        }
        /* Winner glow pulse */
        @keyframes winnerPulse {
          0%, 100% { filter: drop-shadow(0 0 6px currentColor);  }
          50%       { filter: drop-shadow(0 0 18px currentColor) drop-shadow(0 0 30px gold); }
        }
        /* Crowd wave */
        @keyframes crowdWave {
          0%, 100% { transform: scaleY(1); }
          50%       { transform: scaleY(0.85); }
        }
        /* Lane flash on winner cross */
        @keyframes laneWinFlash {
          0%   { background-color: rgba(255,215,0,0.0); }
          30%  { background-color: rgba(255,215,0,0.18); }
          100% { background-color: rgba(255,215,0,0.0); }
        }
        .winner-lane-flash { animation: laneWinFlash 1.5s ease-out forwards; }
        .winner-runner     { animation: winnerPulse 1s ease-in-out infinite; }
      `}</style>

      {/* ── Atmospheric Background ────────────────────────────────────── */}
      {/* Stadium crowd silhouette */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Sky gradient */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,180,50,0.07) 0%, transparent 60%)' }} />
        {/* Crowd rows top */}
        <svg className="absolute top-0 left-0 w-full" style={{ height: '80px' }} viewBox="0 0 1200 80" preserveAspectRatio="none">
          {Array.from({ length: 120 }).map((_, i) => (
            <ellipse
              key={i}
              cx={10 + i * 10}
              cy={70 - (i % 3) * 8}
              rx={4 + (i % 2)}
              ry={7 + (i % 3) * 2}
              fill={`hsl(${200 + (i * 37) % 160}, 60%, ${30 + (i % 4) * 8}%)`}
              opacity={0.5 + (i % 3) * 0.15}
            />
          ))}
        </svg>
        {/* Crowd rows bottom */}
        <svg className="absolute bottom-0 left-0 w-full" style={{ height: '60px' }} viewBox="0 0 1200 60" preserveAspectRatio="none">
          {Array.from({ length: 120 }).map((_, i) => (
            <ellipse
              key={i}
              cx={10 + i * 10}
              cy={10 + (i % 3) * 6}
              rx={4}
              ry={6 + (i % 3)}
              fill={`hsl(${160 + (i * 53) % 160}, 55%, ${28 + (i % 4) * 7}%)`}
              opacity={0.45 + (i % 3) * 0.15}
            />
          ))}
        </svg>
        {/* Stadium floodlights */}
        {[10, 30, 70, 90].map(x => (
          <div
            key={x}
            className="absolute top-0 pointer-events-none"
            style={{
              left: `${x}%`,
              width: '2px',
              height: '60px',
              background: 'linear-gradient(to bottom, rgba(255,255,220,0.6), transparent)',
              filter: 'blur(3px)',
            }}
          />
        ))}
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="relative z-50 w-full px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm bg-black/20">
        <button
          onClick={onBack}
          disabled={isRacing || showDecisionModal}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/20 transition-all border border-white/10 ${isRacing || showDecisionModal ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <ArrowLeft className="w-4 h-4" /> {t('game.back')}
        </button>

        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black tracking-widest uppercase bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
            {config.eventName || 'Human Athletics'}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-white/50 font-medium tracking-wider uppercase">Sprint Race</span>
            <Zap className="w-3 h-3 text-yellow-400" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 bg-black/30 text-white/70">
            {t('game.remaining', { count: config.remainingParticipants.length })}
          </div>
          <button
            onClick={() => setShowRewardLogModal(true)}
            disabled={isRacing || showDecisionModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/20 transition-all border border-white/10 ${isRacing || showDecisionModal ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <FileText className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <select
              value={selectedPrizeId}
              onChange={e => setSelectedPrizeId(e.target.value)}
              disabled={isRacing || showDecisionModal}
              className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer"
            >
              {config.prizes.map(p => (
                <option key={p.id} value={p.id} className="text-black">{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Prize Banner ──────────────────────────────────────────────── */}
      <div className="relative z-10 text-center pt-4 pb-2">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 backdrop-blur-sm">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="font-black text-lg tracking-wide text-yellow-300">{currentPrize?.name || t('game.prizeDefault')}</span>
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
      </div>

      {/* ── Stadium Track ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 relative z-10">
        <div
          ref={trackRef}
          className="w-full max-w-[1200px] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative"
          style={{ background: 'linear-gradient(180deg, #1a0a05 0%, #1a0a05 100%)' }}
        >
          {/* Track surface gradient */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(180,60,20,0.15) 0%, rgba(120,40,10,0.1) 100%)' }}
          />

          {/* Start line */}
          <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: '14%' }}>
            <div className="w-[3px] h-full bg-white/80" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-white/60 tracking-widest uppercase whitespace-nowrap">START</div>
          </div>

          {/* Finish line — checkerboard */}
          <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${finishPct}%` }}>
            <div className="w-[6px] h-full flex flex-col">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className={`flex-1 w-full ${i % 2 === 0 ? 'bg-white' : 'bg-black'}`} />
              ))}
            </div>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-white/60 tracking-widest uppercase whitespace-nowrap">FINISH</div>
          </div>

          {/* Finish tape */}
          {!tapeBroken && (
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{
                left: `${finishPct}%`,
                width: '4px',
                background: 'linear-gradient(to bottom, #FFD700, #FF6B35, #FFD700)',
                boxShadow: '0 0 8px rgba(255,215,0,0.8)',
                animation: isRacing ? 'tapeShake 0.6s ease-in-out infinite' : 'none',
              }}
            />
          )}
          {tapeBroken && (
            <>
              <div className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{
                left: `${finishPct}%`, width: '4px',
                background: 'linear-gradient(to bottom, #FFD700, #FF6B35)',
                animation: 'tapeBurst 0.8s ease-out forwards',
              }} />
              {/* Confetti ribbon pieces */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute z-30 pointer-events-none" style={{
                  left: `${finishPct + i * 1.5}%`,
                  top: `${10 + i * 10}%`,
                  width: '3px',
                  height: '20px',
                  background: i % 2 === 0 ? '#FFD700' : '#FF6B35',
                  borderRadius: '2px',
                  transform: `rotate(${-20 + i * 8}deg)`,
                  animation: `tapeBurst ${0.5 + i * 0.1}s ease-out forwards`,
                  opacity: 0.9,
                }} />
              ))}
            </>
          )}

          {/* Distance markers */}
          {[25, 50, 75].map(pct => (
            <div key={pct} className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `${14 + pct * 0.74}%` }}>
              <div className="w-px h-full bg-white/10" />
            </div>
          ))}

          {/* ── Running Lanes ────────────────────────────────────────── */}
          {Array.from({ length: 5 }).map((_, laneIndex) => {
            const laneRunners = runners.filter(r => r.lane === laneIndex);
            const isWinnerLane = laneRunners.some(r => r.participant.ids === winnerId && tapeBroken);

            return (
              <div
                key={laneIndex}
                className={`relative flex items-center border-b border-white/10 last:border-0 ${isWinnerLane ? 'winner-lane-flash' : ''}`}
                style={{
                  height: '96px',
                  background: laneIndex % 2 === 0 ? 'rgba(160,50,15,0.35)' : 'rgba(140,40,10,0.25)',
                }}
              >
                {/* Lane number */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15 font-black text-4xl font-mono select-none z-10">
                  {laneIndex + 1}
                </div>

                {/* Track lane lines (inner white lines) */}
                <div className="absolute left-0 right-0 bottom-0 h-px bg-white/20 pointer-events-none" />

                {/* Runners */}
                {laneRunners.map(runner => (
                  <div
                    key={`${raceId}-${runner.participant.ids}`}
                    data-runner-id={runner.participant.ids}
                    data-runner-el="1"
                    className={`absolute flex flex-col items-center z-20 ${runner.participant.ids === winnerId && tapeBroken ? 'winner-runner' : ''}`}
                    style={{
                      left: '14%',
                      top: `${runner.yOffset}%`,
                      transform: 'translateY(-50%)',
                      color: runner.color,
                      willChange: 'transform',
                    }}
                  >
                    {/* Name tag */}
                    <span
                      className="text-[9px] font-black px-1.5 py-px rounded leading-none whitespace-nowrap mb-1 select-none pointer-events-none border"
                      style={{
                        background: 'rgba(0,0,0,0.75)',
                        borderColor: runner.color + '60',
                        color: runner.color,
                        textShadow: `0 0 6px ${runner.color}`,
                        boxShadow: runner.participant.ids === winnerId && tapeBroken ? `0 0 8px ${runner.color}` : 'none',
                      }}
                    >
                      {runner.participant.name}
                    </span>

                    {/* Winner crown */}
                    {runner.participant.ids === winnerId && tapeBroken && (
                      <div className="absolute -top-5 text-base select-none">👑</div>
                    )}

                    <RunnerSVG color={runner.color} size={runnerSize} phase={runner.phase} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* ── Controls ───────────────────────────────────────────────── */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={startRace}
            disabled={isRacing || config.remainingParticipants.length === 0 || showDecisionModal}
            className={`px-10 py-4 rounded-2xl font-black text-xl flex items-center gap-3 transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] ${
              isRacing || config.remainingParticipants.length === 0 || showDecisionModal
                ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white hover:scale-105 active:scale-95 cursor-pointer border border-emerald-400/30 shadow-emerald-500/30'
            }`}
          >
            {isRacing ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Racing…
              </>
            ) : (
              <>
                <Play className="w-6 h-6 fill-current" />
                {t('game.draw')}
              </>
            )}
          </button>

          {hasFinished && !isRacing && (
            <button
              onClick={() => setupRace()}
              disabled={config.remainingParticipants.length === 0 || showDecisionModal}
              className={`p-4 rounded-2xl font-bold transition-all duration-300 bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center ${
                config.remainingParticipants.length === 0 || showDecisionModal ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'
              }`}
              title="Reset Race"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {showDecisionModal && winner && currentPrize && (
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
