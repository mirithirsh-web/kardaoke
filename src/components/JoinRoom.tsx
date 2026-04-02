import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useRoom } from '../context/RoomContext';

export default function JoinRoom() {
  const { t } = useTranslation();
  const { dispatch } = useGame();
  const { joinRoom, loading, error } = useRoom();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const handleJoin = async () => {
    if (!code.trim() || !name.trim()) return;
    try {
      await joinRoom(code.trim(), name.trim());
      dispatch({ type: 'SET_SCREEN', screen: 'multiplayer-lobby' });
    } catch {
      // error is set in context
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white">
      <button
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        className="self-start mb-6 text-white/60 hover:text-white transition-colors"
      >
        ← {t('rules.back')}
      </button>

      <h2 className="text-3xl font-bold mb-8">{t('mp.joinRoom')}</h2>

      <div className="w-full max-w-sm space-y-6">
        <div className="glass rounded-2xl p-5">
          <label className="text-sm text-white/60 block mb-2">{t('mp.enterCode')}</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
            placeholder="ABCD"
            maxLength={5}
            className="w-full bg-white/10 rounded-xl px-4 py-4 text-white text-center text-3xl font-bold tracking-[0.3em] placeholder-white/20 outline-none focus:ring-2 focus:ring-pink-500/50 uppercase"
            autoFocus
          />
        </div>

        <div className="glass rounded-2xl p-5">
          <label className="text-sm text-white/60 block mb-2">{t('mp.yourName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9\u0590-\u05FF\u00C0-\u024F\s\-_]/g, '').slice(0, 20))}
            maxLength={20}
            placeholder={t('setup.playerName')}
            className="w-full bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-pink-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        {error && (
          <div className="rounded-xl p-3 bg-red-500/20 border border-red-400/30 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={!code.trim() || !name.trim() || loading}
          className={`btn-primary w-full text-lg py-4 ${
            (!code.trim() || !name.trim() || loading) ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          {loading ? t('mp.joining') : t('mp.join')}
        </button>
      </div>
    </div>
  );
}
