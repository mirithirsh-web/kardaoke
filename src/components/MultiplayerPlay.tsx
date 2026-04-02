import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useRoom } from '../context/RoomContext';
import { useMultiplayerGame } from '../context/MultiplayerGameContext';
import MaestroGameView from './MaestroGameView';
import SpectatorGameView from './SpectatorGameView';

function RoomCodeBadge() {
  const { t } = useTranslation();
  const { roomCode } = useRoom();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!roomCode) return null;

  const handleClick = async () => {
    if (expanded) {
      try {
        await navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch { /* ignore */ }
    }
    setExpanded(!expanded);
  };

  return (
    <button
      onClick={handleClick}
      className="glass rounded-full px-3 py-1.5 text-white/70 hover:text-white transition-all text-xs flex items-center gap-1.5"
    >
      <span>🔗</span>
      {expanded ? (
        <>
          <span dir="ltr" className="font-bold tracking-widest text-sm text-yellow-300">{roomCode}</span>
          <span className="text-white/40">{copied ? '✓' : t('mp.roomCode')}</span>
        </>
      ) : (
        <span>{t('mp.roomCode')}</span>
      )}
    </button>
  );
}

function LeaveGameButton() {
  const { t } = useTranslation();
  const { dispatch } = useGame();
  const { leaveRoom } = useRoom();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLeave = () => {
    leaveRoom();
    dispatch({ type: 'SET_SCREEN', screen: 'home' });
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="glass rounded-full px-3 py-1.5 text-white/50 hover:text-red-300 transition-all text-xs"
      >
        ✕ {t('mp.leave')}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full text-center text-white space-y-4">
            <div className="text-4xl">🚪</div>
            <h3 className="text-xl font-bold">{t('mp.leaveConfirmTitle')}</h3>
            <p className="text-white/60 text-sm">{t('mp.leaveConfirmDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 font-semibold hover:bg-white/20 transition-colors"
              >{t('mp.stay')}</button>
              <button
                onClick={handleLeave}
                className="flex-1 py-3 rounded-xl bg-red-500/30 border border-red-400/50 font-semibold text-red-200 hover:bg-red-500/40 transition-colors"
              >{t('mp.leaveGame')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TopBar() {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <RoomCodeBadge />
      <LeaveGameButton />
    </div>
  );
}

export default function MultiplayerPlay() {
  const { dispatch } = useGame();
  const { status } = useRoom();
  const { gameState, isMaestro } = useMultiplayerGame();

  // Warn before leaving via browser navigation
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Navigate when game finishes
  useEffect(() => {
    if (status === 'finished') {
      dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-endgame' });
    }
  }, [status, dispatch]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-pulse-glow text-lg">Loading game...</div>
      </div>
    );
  }

  return (
    <>
      <TopBar />
      {isMaestro ? <MaestroGameView /> : <SpectatorGameView />}
    </>
  );
}
