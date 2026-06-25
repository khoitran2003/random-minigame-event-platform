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

// ─── Track geometry (single source of truth) ──────────────────────────────────
// Fractions of the track width. The start line lives at START_PCT, the finish
// line at FINISH_PCT. Runners are anchored so their LEADING edge touches each
// line without crossing it — width is subtracted at BOTH ends (see startX/endX).
const START_PCT = 0.14;
const FINISH_PCT = 0.88;

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

// Each waypoint carries a precomputed tangent m (dd/dt) for Hermite interpolation.
interface SplineWaypoint extends Waypoint {
  m: number;
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
      const waypoints = this.generateWaypoints(r.isWinner);
      return {
        id: r.ids,
        isWinner: r.isWinner,
        finishTime,
        waypoints: this.computeTangents(waypoints), // attach monotone tangents
        progress: 0,
        lastProgress: 0,
      };
    });
  }

  // ─── 3-Phase Waypoint Generation ──────────────────────────────────────────
  // Builds a strictly-increasing distance profile d(t) ∈ [0,1] sampled at a set
  // of t knots. Three physical phases:
  //   1. BLOCK START (t: 0 → 0.2): exponential ramp — small d, the heavy push-off.
  //   2. CRUISE / SPRINT (t: 0.2 → 0.8): near-linear cruise, with a random burst
  //      (slope spike) OR exhaustion (slope dip) injected for variety.
  //   3. FINISH (t: 0.8 → 1.0): winner gets a steep "late kick"; losers flatten out.
  generateWaypoints(isWinner: boolean): Waypoint[] {
    const pts: Waypoint[] = [{ t: 0, d: 0 }];

    // ── Phase 1: Block start ──────────────────────────────────────────────
    // d grows like t^2.2 → derivative ≈ 0 at t=0 (ease-in), so runners crawl off
    // the blocks instead of teleporting to top speed. By t=0.2 they've covered
    // only ~3% of the track.
    const startEndT = 0.18 + Math.random() * 0.04;            // ~0.18–0.22
    const startEndD = 0.04 + Math.random() * 0.03;            // ~4–7% distance
    // One intermediate knot inside the ramp keeps the spline tight to t^2.2.
    const midT = startEndT * 0.6;
    pts.push({ t: midT, d: startEndD * Math.pow(midT / startEndT, 2.2) });
    pts.push({ t: startEndT, d: startEndD });

    // ── Phase 2: Cruise with random sprint / exhaustion ───────────────────
    // Lay down cruise knots; the average slope here is high (top speed). For some
    // runners we perturb one segment: a SPRINT front-loads distance into a short
    // t-window (steep slope), EXHAUSTION starves it (shallow slope). The opposite
    // segment compensates so totals stay consistent and monotone.
    const cruiseEndT = 0.80;
    const cruiseEndD = isWinner
      ? 0.70 + Math.random() * 0.05   // winner sits a touch back, saving the kick
      : 0.74 + Math.random() * 0.10;  // losers may lead early, then fade

    const cruiseKnotsT = [0.38, 0.56, 0.68];
    // Base: linear distance across the cruise band from (startEndT,startEndD)→(cruiseEndT,cruiseEndD)
    const spanT = cruiseEndT - startEndT;
    const spanD = cruiseEndD - startEndD;
    const baseD = cruiseKnotsT.map(t => startEndD + spanD * ((t - startEndT) / spanT));

    // Random event: ~55% of non-winners get a burst or exhaustion mid-race.
    const eventRoll = Math.random();
    let dDelta = [0, 0, 0];
    if (!isWinner && eventRoll < 0.30) {
      // SPRINT: push the first cruise knot forward (steep early slope), then the
      // runner naturally has less ground to cover after → relative slowdown.
      dDelta = [+0.06 + Math.random() * 0.04, +0.02, -0.01];
    } else if (!isWinner && eventRoll < 0.55) {
      // EXHAUSTION: hold the first knot back (shallow slope = tiring), recover late.
      dDelta = [-0.06 - Math.random() * 0.03, -0.02, +0.01];
    }

    let prevD = startEndD;
    cruiseKnotsT.forEach((t, i) => {
      // Clamp each knot so d stays strictly increasing and below the cruise cap.
      let d = baseD[i] + dDelta[i];
      d = Math.max(prevD + 0.01, Math.min(cruiseEndD - 0.005, d));
      pts.push({ t, d });
      prevD = d;
    });
    pts.push({ t: cruiseEndT, d: cruiseEndD });

    // ── Phase 3: Finish ───────────────────────────────────────────────────
    // Winner: steep late kick — covers the remaining (1 - cruiseEndD) with a
    // rising slope, hitting exactly d=1.0 at t=1.0 (its finishTime).
    // Losers: flatten — they keep moving but the slope decays, and update() caps
    // them at 0.96 so they can never reach the line before the winner.
    if (isWinner) {
      // Intermediate knot biased late → slope increases toward the tape.
      pts.push({ t: 0.92, d: cruiseEndD + (1 - cruiseEndD) * 0.55 });
      pts.push({ t: 1.0, d: 1.0 });
    } else {
      const finalD = 0.90 + Math.random() * 0.04;  // < 0.96 cap, fading finish
      pts.push({ t: 0.92, d: cruiseEndD + (finalD - cruiseEndD) * 0.7 });
      pts.push({ t: 1.0, d: finalD });
    }

    return pts;
  }

  // ─── Monotone Tangents (Fritsch–Carlson) ──────────────────────────────────
  // Computes a tangent m_i (= dd/dt) at every knot for cubic Hermite interpolation.
  // Plain Catmull-Rom can overshoot and produce a locally-decreasing curve between
  // knots (runner sliding backward) when neighbouring slopes differ sharply — which
  // is exactly what sprint/exhaustion waypoints create. Fritsch–Carlson limits the
  // tangents so the resulting cubic is guaranteed monotone: velocity is smooth AND
  // distance never decreases.
  computeTangents(pts: Waypoint[]): SplineWaypoint[] {
    const n = pts.length;
    const secant: number[] = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      secant[i] = (pts[i + 1].d - pts[i].d) / (pts[i + 1].t - pts[i].t);
    }

    const m: number[] = new Array(n);
    m[0] = secant[0];
    m[n - 1] = secant[n - 2];
    for (let i = 1; i < n - 1; i++) {
      // Flat tangent at any local extremum keeps the curve from overshooting.
      if (secant[i - 1] * secant[i] <= 0) m[i] = 0;
      else m[i] = (secant[i - 1] + secant[i]) / 2;
    }

    // Fritsch–Carlson correction: clamp tangents into the monotone region (a circle
    // of radius 3 in the (alpha,beta) slope ratios) so no Hermite segment dips.
    for (let i = 0; i < n - 1; i++) {
      if (secant[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const alpha = m[i] / secant[i];
      const beta = m[i + 1] / secant[i];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        m[i] = tau * alpha * secant[i];
        m[i + 1] = tau * beta * secant[i];
      }
    }

    return pts.map((p, i) => ({ ...p, m: m[i] }));
  }

  // ─── Cubic Hermite Interpolation ──────────────────────────────────────────
  // Evaluates the monotone spline at parameter u. Within each [t_i, t_{i+1}]
  // segment we blend the two endpoint distances and their tangents with the
  // standard Hermite basis (h00,h10,h01,h11). Because the tangents are continuous
  // across knots, the *velocity* (first derivative) is continuous too — no robotic
  // corners at waypoints, unlike the old per-segment cosine ease.
  interpolate(u: number, waypoints: Waypoint[]): number {
    const wp = waypoints as SplineWaypoint[];
    let i = 0;
    while (i < wp.length - 1 && u > wp[i + 1].t) i++;
    const pA = wp[i];
    const pB = wp[i + 1];

    const h = pB.t - pA.t;
    const s = (u - pA.t) / h;            // normalized position in segment [0,1]
    const s2 = s * s;
    const s3 = s2 * s;

    // Hermite basis functions
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;

    // Tangents are dd/dt; multiply by segment width h to get dd/ds for this basis.
    return h00 * pA.d + h10 * h * pA.m + h01 * pB.d + h11 * h * pB.m;
  }

  update(elapsed: number): boolean {
    let winnerFinished = false;
    this.runners.forEach(runner => {
      runner.lastProgress = runner.progress;
      const u = Math.min(elapsed / runner.finishTime, 1.0);
      let d = this.interpolate(u, runner.waypoints);
      if (runner.isWinner && u >= 1.0) { d = 1.0; winnerFinished = true; }
      if (!runner.isWinner) d = Math.min(d, 0.96);
      // Monotone guard: even with the spline's guarantee, clamp against the last
      // emitted progress so floating-point noise can never nudge a runner backward.
      d = Math.max(runner.lastProgress, d);
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
  const runnerWidthRef = useRef<number>(40); // cached SVG visual width in px (incl. overflow limbs)

  const currentPrize = config.prizes.find(p => p.id === selectedPrizeId);

  // ─── Measure the runner's true visual width ───────────────────────────────
  // The name tag is now position:absolute (out of flow), so the wrapper box
  // already equals the SVG box. We still measure the <svg> directly: it's the
  // canonical foot-edge reference and stays correct even if someone later adds
  // padding/border to the wrapper. overflow:visible limbs (foot at x≈40/48) are
  // captured by getBoundingClientRect, so the anchor is the real leading edge.
  const measureRunnerWidth = (el: HTMLElement): number => {
    const svgEl = el.querySelector('svg');
    const rect = (svgEl ?? el).getBoundingClientRect();
    return rect.width || 40;
  };

  // Anchor x (the element's translate3d X) so the runner's RIGHT edge sits flush
  // against the start line, fully behind it.
  const computeStartX = (trackWidth: number, runnerW: number) =>
    trackWidth * START_PCT - runnerW;

  // Anchor x at the finish: the runner's right edge stops AT the finish line.
  const computeEndX = (trackWidth: number, runnerW: number) =>
    trackWidth * FINISH_PCT - runnerW;

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

  // ─── Pin every runner to the start line once the DOM has laid out ─────────
  // Runs after runners render (and on resize via raceId/runners change). This is
  // what guarantees all 5 share the same vertical axis at t=0, regardless of name
  // length, because computeStartX subtracts the measured SVG foot width.
  useEffect(() => {
    if (isRacing) return;            // never fight the rAF loop mid-race
    if (!trackRef.current || runners.length === 0) return;

    const place = () => {
      const trackWidth = trackRef.current!.getBoundingClientRect().width;
      if (raceStateRef.current) raceStateRef.current.trackWidth = trackWidth;
      runners.forEach((runner, i) => {
        const el = document.querySelector<HTMLDivElement>(`[data-runner-id="${runner.participant.ids}"]`);
        if (!el) return;
        if (i === 0) runnerWidthRef.current = measureRunnerWidth(el);
        el.style.left = '0px';
        el.style.transform = `translate3d(${computeStartX(trackWidth, runnerWidthRef.current)}px, -50%, 0)`;
      });
    };

    // Defer one frame so SVG layout (and fonts for the name tag) are final.
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
    };
  }, [runners, raceId, isRacing]);

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

    // Re-anchor every runner to the strict zero-point so the rAF loop's
    // translate3d takes over cleanly from the exact start position.
    raceStateRef.current.runners.forEach((runner, i) => {
      const el = document.querySelector<HTMLDivElement>(`[data-runner-id="${runner.id}"]`);
      if (el) {
        // Measure once from the first element; captures overflow:visible limbs.
        if (i === 0) runnerWidthRef.current = measureRunnerWidth(el);
        el.style.left = '0px';
        el.style.transform = `translate3d(${computeStartX(trackWidth, runnerWidthRef.current)}px, -50%, 0)`;
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
    const runnerW = runnerWidthRef.current;

    // ─── Bounding-box math (width accounted for at BOTH ends) ───────────────
    // START: right edge flush against start line → anchor = START%·W − runnerW.
    const startX = computeStartX(trackWidth, runnerW);          // = W*0.14 − runnerW
    // FINISH: right edge stops AT finish line  → anchor = FINISH%·W − runnerW.
    const endX = computeEndX(trackWidth, runnerW);              // = W*0.88 − runnerW
    // The anchor travels endX − startX. The runnerW terms cancel, so the span is
    // exactly W*(0.88 − 0.14) = W*0.74 — cadence math unaffected, but both
    // absolute endpoints now respect the runner's width (no crossing either line).
    const totalDistance = endX - startX;                        // = W*0.74

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

  const finishPct = FINISH_PCT * 100; // percentage position of finish line from left
  const startPct = START_PCT * 100;   // percentage position of start line from left

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
          style={{
            background: 'linear-gradient(180deg, #1a0a05 0%, #1a0a05 100%)',
            // Single source of truth shared by the start line and runner anchoring.
            ['--start-x' as any]: `${startPct}%`,
            ['--finish-x' as any]: `${finishPct}%`,
          }}
        >
          {/* Track surface gradient */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(180,60,20,0.15) 0%, rgba(120,40,10,0.1) 100%)' }}
          />

          {/* Start line — solid 4px white, spans all 5 lanes top→bottom */}
          <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: 'var(--start-x)' }}>
            <div className="h-full bg-white" style={{ width: '4px', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-white/60 tracking-widest uppercase whitespace-nowrap">START</div>
          </div>

          {/* Finish line — checkerboard */}
          <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: 'var(--finish-x)' }}>
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
                left: 'var(--finish-x)',
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
                left: 'var(--finish-x)', width: '4px',
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
            <div key={pct} className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `${startPct + pct * 0.74}%` }}>
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
                    // Wrapper wraps TIGHTLY around the SVG only. No flex/items-center,
                    // so a long name tag can never inflate the wrapper width and push
                    // the SVG off-center. inline-block + line-height:0 collapses any
                    // whitespace gap so the box === the SVG's box.
                    className={`absolute inline-block z-20 ${runner.participant.ids === winnerId && tapeBroken ? 'winner-runner' : ''}`}
                    style={{
                      left: '0px',
                      top: `${runner.yOffset}%`,
                      lineHeight: 0,
                      // Off-screen until the placement effect measures & pins to the
                      // start line. Prevents a one-frame flash at the wrong x.
                      transform: 'translate3d(-9999px, -50%, 0)',
                      color: runner.color,
                      willChange: 'transform',
                    }}
                  >
                    {/* Name tag — absolutely positioned, OUT of the flow, so it does
                        not contribute to the wrapper's bounding box. Centered over
                        the SVG via left:50% + translateX(-50%); floats above via
                        bottom:100%. */}
                    <span
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[9px] font-black px-1.5 py-px rounded leading-none whitespace-nowrap select-none pointer-events-none border"
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

                    {/* Winner crown — also absolute so it stays out of the box too */}
                    {runner.participant.ids === winnerId && tapeBroken && (
                      <div className="absolute left-1/2 -translate-x-1/2 -top-5 text-base select-none pointer-events-none">👑</div>
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