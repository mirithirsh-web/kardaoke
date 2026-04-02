import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  maestroName: string;
  currentRound: number;
  totalRounds: number;
  isFirstTurnOfRound: boolean;
  onComplete: () => void;
}

export default function MaestroAnnouncement({
  maestroName,
  currentRound,
  totalRounds,
  isFirstTurnOfRound,
  onComplete,
}: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'visible' | 'fading'>('visible');

  const isFinalRound = currentRound === totalRounds;

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('fading'), 2400);
    const doneTimer = setTimeout(onComplete, 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, rgba(45, 27, 105, 0.97) 0%, rgba(26, 16, 51, 0.99) 70%)',
      }}
      onClick={onComplete}
    >
      {/* Spotlight rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none animate-spotlight">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[600px]"
          style={{
            background: 'conic-gradient(from 250deg, transparent, rgba(233, 30, 140, 0.08), transparent, rgba(168, 85, 247, 0.08), transparent)',
            filter: 'blur(30px)',
          }}
        />
      </div>

      {/* Round badge */}
      {isFirstTurnOfRound && (
        <div className="animate-round-badge mb-6">
          <div className={`px-6 py-2 rounded-full text-sm font-bold tracking-widest uppercase ${
            isFinalRound
              ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
              : 'bg-white/10 text-white/80 border border-white/20'
          }`}>
            {isFinalRound ? `🔥 ${t('announce.finalRound')} 🔥` : `${t('game.round')} ${currentRound} ${t('game.of')} ${totalRounds}`}
          </div>
        </div>
      )}

      {/* Mic emoji */}
      <div className="text-6xl animate-mic-drop mb-4">
        🎤
      </div>

      {/* "The Maestro is..." label */}
      <p className="text-white/50 text-lg tracking-wide animate-spotlight mb-2">
        {t('announce.theMaestroIs')}
      </p>

      {/* Maestro name */}
      <h1 className="text-5xl font-bold animate-maestro-name mb-3">
        <span className="bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          {maestroName}
        </span>
      </h1>

      {/* Shimmer line */}
      <div className="w-48 h-0.5 rounded-full animate-shimmer mt-2" />

      {/* Tap to skip hint */}
      <p className="absolute bottom-12 text-white/20 text-sm animate-slide-up">
        {t('announce.tapToContinue')}
      </p>
    </div>
  );
}
