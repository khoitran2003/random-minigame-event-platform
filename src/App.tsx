import React, { useState } from 'react';
import { EventConfig, GameMode } from './types';
import ConfigPanel from './components/ConfigPanel';
import GameMenu from './components/GameMenu';
import LuckyNumbersGame from './components/LuckyNumbersGame';
import LuckyWheelGame from './components/LuckyWheelGame';
import HumanAthleticsGame from './components/HumanAthleticsGame';
import GrandFinale from './components/GrandFinale';
import { useLanguage } from './LanguageContext';

const INITIAL_CONFIG_BASE = {
  backgroundUrl: '',
  backgroundColor: '#2D1B4E',
  backgroundBlur: 5,
  backgroundOverlayOpacity: 0,
  participants: [],
  remainingParticipants: [],
  rewardLog: [],
  currentSessionId: '',
};

export default function App() {
  const { t, lang } = useLanguage();
  
  const [config, setConfig] = useState<EventConfig>(() => ({
    ...INITIAL_CONFIG_BASE,
    eventName: '',
    prizes: [{ id: '1', name: t('config.firstPrize'), count: 1 }],
    currentSessionId: crypto.randomUUID(),
  }));
  const [gameMode, setGameMode] = useState<GameMode>('CONFIG');

  const gameModeRef = React.useRef(gameMode);
  React.useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  // Update default names if they haven't been changed when language switches
  React.useEffect(() => {
    setConfig(prev => {
      const newPrizes = prev.prizes.map(p => {
        if (p.name === 'First Prize' || p.name === 'Giải nhất') {
          return { ...p, name: t('config.firstPrize') };
        }
        return p;
      });

      return {
        ...prev,
        prizes: newPrizes
      };
    });
  }, [lang, t]);

  const updateConfig = (newConfig: Partial<EventConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      
      if (newConfig.rewardLog) {
        const sessionId = updated.currentSessionId;
        const totalPrizes = updated.prizes.reduce((sum, p) => sum + p.count, 0);
        // Only count prizes accepted in the CURRENT session
        const acceptedPrizes = updated.rewardLog.filter(
          l => l.isAccepted && l.sessionId === sessionId
        ).length;
        
        if (
          totalPrizes > 0 &&
          acceptedPrizes >= totalPrizes &&
          ['LUCKY_NUMBERS', 'LUCKY_WHEEL', 'HUMAN_ATHLETICS'].includes(gameModeRef.current)
        ) {
          setTimeout(() => {
            setGameMode('GRAND_FINALE');
          }, 800);
        }
      }
      
      return updated;
    });
  };

  const appStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-sans)',
  };

  if (config.backgroundUrl) {
    appStyle.backgroundImage = `url(${config.backgroundUrl})`;
    appStyle.backgroundSize = 'cover';
    appStyle.backgroundPosition = 'center';
  } else if (config.backgroundColor !== '#2D1B4E') {
    appStyle.backgroundColor = config.backgroundColor;
    appStyle.backgroundImage = 'none';
  }

  return (
    <div style={appStyle} className="relative overflow-hidden w-full h-full">
      {/* Background Overlay */}
      {config.backgroundUrl && <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundColor: `rgba(0, 0, 0, ${config.backgroundOverlayOpacity / 100})`, backdropFilter: `blur(${config.backgroundBlur}px)`, WebkitBackdropFilter: `blur(${config.backgroundBlur}px)` }} />}

      <div className="relative z-10 w-full min-h-screen">
        {gameMode === 'CONFIG' && (
          <ConfigPanel 
            config={config} 
            onUpdate={updateConfig} 
            onLaunch={() => {
              // Generate a fresh session ID every time the user launches into the game menu
              updateConfig({ currentSessionId: crypto.randomUUID() });
              setGameMode('MENU');
            }} 
          />
        )}
        
        {gameMode === 'MENU' && (
          <GameMenu 
            onSelectGame={setGameMode} 
            onBack={() => setGameMode('CONFIG')} 
          />
        )}

        {gameMode === 'LUCKY_NUMBERS' && (
          <LuckyNumbersGame
            config={config}
            onBack={() => setGameMode('MENU')}
            updateConfig={updateConfig}
          />
        )}

        {gameMode === 'LUCKY_WHEEL' && (
          <LuckyWheelGame
            config={config}
            onBack={() => setGameMode('MENU')}
            updateConfig={updateConfig}
          />
        )}

        {gameMode === 'HUMAN_ATHLETICS' && (
          <HumanAthleticsGame
            config={config}
            onBack={() => setGameMode('MENU')}
            updateConfig={updateConfig}
          />
        )}

        {gameMode === 'GRAND_FINALE' && (
          <GrandFinale
            config={config}
            onBack={() => setGameMode('CONFIG')}
            sessionId={config.currentSessionId}
          />
        )}

        {/* Placeholders for other games */}
        {['MYSTERY_CHESTS', 'GACHA_MACHINE', 'BALLOON_POP', 'CARD_FLIP'].includes(gameMode) && (
          <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">{t('game.comingSoon')}</h2>
            <p className="text-white/80 mb-8 max-w-md">{t('game.underConstruction', { gameMode: gameMode.replace('_', ' ') })}</p>
            <button
              onClick={() => setGameMode('MENU')}
              className="bg-transparent text-white font-bold py-4 px-8 rounded-2xl border border-white/10 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] hover:border-white/20 hover:bg-black/5 transition-all relative z-50 pointer-events-auto"
            >
              {t('game.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}