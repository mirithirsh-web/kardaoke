import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useRoom } from '../context/RoomContext';
import { useMultiplayerGame } from '../context/MultiplayerGameContext';
import { themedPacks } from '../data/themedPacks';
import type { RoomSettings } from '../types';

export default function MultiplayerLobby() {
  const { t, i18n } = useTranslation();
  const { dispatch } = useGame();
  const { roomCode, isCreator, players, status, settings, leaveRoom, updateSettings, startGame } = useRoom();
  const { initGame } = useMultiplayerGame();
  const [starting, setStarting] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showPacks, setShowPacks] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // If game already started (e.g. rejoining), go to play screen
  if (status === 'playing') {
    dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-play' });
    return null;
  }
  if (status === 'finished') {
    dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-endgame' });
    return null;
  }

  const handleLeave = () => {
    leaveRoom();
    dispatch({ type: 'SET_SCREEN', screen: 'home' });
  };

  const handleStart = async () => {
    if (players.length < 2) return;
    setStarting(true);
    try {
      await initGame();
      await startGame();
    } catch {
      setStarting(false);
    }
  };

  const toggleSetting = async (key: keyof RoomSettings, value: boolean | number) => {
    await updateSettings({ [key]: value });
  };

  const s = settings || { rounds: 5, includeCards: true, allowStealing: false, selectedPacks: [] as string[] };
  const currentPacks: string[] = s.selectedPacks || [];

  const togglePack = async (packId: string) => {
    const updated = currentPacks.includes(packId)
      ? currentPacks.filter(id => id !== packId)
      : [...currentPacks, packId];
    await updateSettings({ selectedPacks: updated });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 text-white">
      <button onClick={handleLeave} className="self-start mb-4 text-white/60 hover:text-white transition-colors">
        ← {t('mp.leave')}
      </button>

      {/* Room code display */}
      <div className="glass rounded-2xl p-6 mb-6 text-center w-full max-w-sm">
        <p className="text-sm text-white/50 mb-2">{t('mp.roomCode')}</p>
        <div dir="ltr" className="text-5xl font-bold tracking-[0.4em] bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
          {roomCode}
        </div>
        <p className="text-xs text-white/40 mt-2">{t('mp.shareCode')}</p>
      </div>

      {/* Players list */}
      <div className="glass rounded-2xl p-5 mb-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-3">
          {t('mp.players')} ({players.length})
        </h3>
        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={p.uid} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 animate-slide-up">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-sm font-bold shrink-0">
                {i + 1}
              </div>
              <span className="font-medium flex-1">{p.name}</span>
              <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-gray-500'}`} />
            </div>
          ))}
        </div>
        {players.length < 2 && (
          <p className="text-white/40 text-sm mt-3 text-center">{t('mp.waitingForPlayers')}</p>
        )}
      </div>

      {/* Settings (creator only) */}
      {isCreator && (
        <div className="w-full max-w-sm space-y-4 mb-6">
          {/* Rounds */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-2">{t('setup.rounds')}</h3>
            <div className="flex items-center gap-4 justify-center">
              <button
                onClick={() => toggleSetting('rounds', Math.max(1, s.rounds - 1))}
                className="w-10 h-10 rounded-full bg-white/10 text-xl"
              >−</button>
              <span className="text-3xl font-bold w-12 text-center">{s.rounds}</span>
              <button
                onClick={() => toggleSetting('rounds', Math.min(20, s.rounds + 1))}
                className="w-10 h-10 rounded-full bg-white/10 text-xl"
              >+</button>
            </div>
          </div>

          {/* Cards toggle */}
          <div className="glass rounded-2xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold">{t('setup.includeCards')}</span>
              <div
                className={`w-14 h-8 rounded-full relative transition-colors ${s.includeCards ? 'bg-pink-500' : 'bg-white/20'}`}
                onClick={() => toggleSetting('includeCards', !s.includeCards)}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${s.includeCards ? 'left-7' : 'left-1'}`} />
              </div>
            </label>
          </div>

          {/* Stealing toggle */}
          {s.includeCards && (
            <div className="glass rounded-2xl p-4 animate-slide-up">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold">{t('setup.allowStealing')}</span>
                  <p className="text-white/50 text-xs mt-1">{t('setup.allowStealingHint')}</p>
                </div>
                <div
                  className={`w-14 h-8 rounded-full relative transition-colors shrink-0 ms-4 ${s.allowStealing ? 'bg-pink-500' : 'bg-white/20'}`}
                  onClick={() => toggleSetting('allowStealing', !s.allowStealing)}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${s.allowStealing ? 'left-7' : 'left-1'}`} />
                </div>
              </label>
            </div>
          )}

          {/* Expansion packs */}
          {s.includeCards && (
            <div className="glass rounded-2xl p-4 animate-slide-up">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold">{t('setup.themedPacks')}</span>
                  <p className="text-white/50 text-xs mt-1">{t('setup.themedPacksHint')}</p>
                </div>
                <div
                  className={`w-14 h-8 rounded-full relative transition-colors shrink-0 ms-4 ${showPacks ? 'bg-yellow-500' : 'bg-white/20'}`}
                  onClick={async () => {
                    if (showPacks) { setShowPacks(false); await updateSettings({ selectedPacks: [] }); }
                    else setShowPacks(true);
                  }}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${showPacks ? 'left-7' : 'left-1'}`} />
                </div>
              </label>
              {showPacks && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {themedPacks.filter(pack => !pack.localeOnly || pack.localeOnly === i18n.language).map(pack => {
                    const active = currentPacks.includes(pack.id);
                    const label = i18n.language === 'he' ? pack.name.he : pack.name.en;
                    return (
                      <button
                        key={pack.id}
                        onClick={() => togglePack(pack.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                          active
                            ? 'bg-yellow-500/30 border border-yellow-400/60 text-yellow-200 shadow-lg shadow-yellow-500/10'
                            : 'bg-white/10 border border-white/10 text-white/70 hover:bg-white/15'
                        }`}
                      >
                        <span>{pack.icon}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Start */}
          <button
            onClick={() => setShowStartConfirm(true)}
            disabled={players.length < 2 || starting}
            className={`btn-primary w-full text-xl py-4 ${
              players.length < 2 || starting ? 'opacity-40 cursor-not-allowed' : 'animate-pulse-glow'
            }`}
          >
            {starting ? t('mp.starting') : players.length < 2 ? t('setup.minPlayers') : t('mp.startGame')}
          </button>
        </div>
      )}

      {/* Non-creator waiting view */}
      {!isCreator && (
        <div className="text-center text-white/50 animate-pulse-glow">
          <p className="text-lg">{t('mp.waitingForHost')}</p>
        </div>
      )}

      {/* Start confirmation modal */}
      {showStartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full text-center text-white space-y-4">
            <div className="text-4xl">🎤</div>
            <h3 className="text-xl font-bold">{t('mp.everyoneJoinedTitle')}</h3>
            <div className="space-y-1.5">
              {players.map((p, i) => (
                <div key={p.uid} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="flex-1 text-start text-sm">{p.name}</span>
                  <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-gray-500'}`} />
                </div>
              ))}
            </div>
            <p className="text-white/50 text-sm">{t('mp.everyoneJoinedDesc', { count: players.length })}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStartConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 font-semibold hover:bg-white/20 transition-colors"
              >{t('mp.waitMore')}</button>
              <button
                onClick={() => { setShowStartConfirm(false); handleStart(); }}
                disabled={starting}
                className="flex-1 py-3 rounded-xl bg-green-500/30 border border-green-400/50 font-semibold text-green-200 hover:bg-green-500/40 transition-colors"
              >{starting ? t('mp.starting') : t('mp.yesStart')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
