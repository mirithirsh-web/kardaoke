import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { themedPacks } from '../data/themedPacks';

export default function GameSetup() {
  const { t, i18n } = useTranslation();
  const { dispatch } = useGame();
  const [players, setPlayers] = useState<string[]>(['', '']);
  const [rounds, setRounds] = useState(5);
  const [includeCards, setIncludeCards] = useState(true);
  const [allowStealing, setAllowStealing] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [showPacks, setShowPacks] = useState(false);
  const [newName, setNewName] = useState('');

  const playerCount = players.filter((p) => p.trim()).length;

  const getRoundsHint = () => {
    if (playerCount <= 3) return t('setup.roundsHint2_3');
    if (playerCount <= 7) return t('setup.roundsHint4_7');
    return t('setup.roundsHint8');
  };

  const addPlayer = () => {
    if (newName.trim()) {
      setPlayers([...players, newName.trim()]);
      setNewName('');
    }
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, name: string) => {
    const updated = [...players];
    updated[index] = name;
    setPlayers(updated);
  };

  const canStart = players.filter((p) => p.trim()).length >= 2;

  const togglePack = (packId: string) => {
    setSelectedPacks(prev =>
      prev.includes(packId) ? prev.filter(id => id !== packId) : [...prev, packId]
    );
  };

  const startGame = () => {
    const validPlayers = players.filter((p) => p.trim()).map((p) => p.trim());
    dispatch({
      type: 'START_GAME',
      players: validPlayers,
      rounds,
      includeCards,
      allowStealing: includeCards && allowStealing,
      locale: i18n.language,
      selectedPacks: includeCards ? selectedPacks : [],
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 text-white">
      <button
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        className="self-start mb-6 text-white/60 hover:text-white transition-colors"
      >
        ← {t('rules.back')}
      </button>

      <h2 className="text-3xl font-bold mb-8">{t('setup.title')}</h2>

      <div className="w-full max-w-md space-y-6">
        {/* Player list */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-4">
            {t('setup.players')}
          </h3>

          <div className="space-y-3">
            {players.map((name, i) => (
              <div key={i} className="flex gap-2 items-center animate-slide-up">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updatePlayer(i, e.target.value)}
                  placeholder={`${t('setup.playerName')} ${i + 1}`}
                  className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-pink-500/50"
                />
                {players.length > 2 && (
                  <button
                    onClick={() => removePlayer(i)}
                    className="text-white/40 hover:text-red-400 text-sm px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder={t('setup.playerName')}
              className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            <button onClick={addPlayer} className="btn-secondary px-4 py-2">
              +
            </button>
          </div>
        </div>

        {/* Rounds */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-2">{t('setup.rounds')}</h3>
          <p className="text-white/50 text-sm mb-4">{getRoundsHint()}</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setRounds(Math.max(1, rounds - 1))}
              className="w-12 h-12 rounded-full bg-white/10 text-2xl hover:bg-white/20 transition-colors"
            >
              −
            </button>
            <span className="text-4xl font-bold w-16 text-center">{rounds}</span>
            <button
              onClick={() => setRounds(Math.min(20, rounds + 1))}
              className="w-12 h-12 rounded-full bg-white/10 text-2xl hover:bg-white/20 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Cards toggle */}
        <div className="glass rounded-2xl p-5">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-lg font-semibold">{t('setup.includeCards')}</span>
            <div
              className={`w-14 h-8 rounded-full relative transition-colors ${
                includeCards ? 'bg-pink-500' : 'bg-white/20'
              }`}
              onClick={() => setIncludeCards(!includeCards)}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                  includeCards ? 'left-7' : 'left-1'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Card stealing toggle -- only visible when cards are enabled */}
        {includeCards && (
          <div className="glass rounded-2xl p-5 animate-slide-up">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-lg font-semibold">{t('setup.allowStealing')}</span>
                <p className="text-white/50 text-sm mt-1">{t('setup.allowStealingHint')}</p>
              </div>
              <div
                className={`w-14 h-8 rounded-full relative transition-colors shrink-0 ms-4 ${
                  allowStealing ? 'bg-pink-500' : 'bg-white/20'
                }`}
                onClick={() => setAllowStealing(!allowStealing)}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                    allowStealing ? 'left-7' : 'left-1'
                  }`}
                />
              </div>
            </label>
          </div>
        )}

        {/* Expansion packs -- only visible when cards are enabled */}
        {includeCards && (
          <div className="glass rounded-2xl p-5 animate-slide-up">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-lg font-semibold">{t('setup.themedPacks')}</span>
                <p className="text-white/50 text-sm mt-1">{t('setup.themedPacksHint')}</p>
              </div>
              <div
                className={`w-14 h-8 rounded-full relative transition-colors shrink-0 ms-4 ${
                  showPacks ? 'bg-yellow-500' : 'bg-white/20'
                }`}
                onClick={() => {
                  if (showPacks) { setShowPacks(false); setSelectedPacks([]); }
                  else setShowPacks(true);
                }}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                    showPacks ? 'left-7' : 'left-1'
                  }`}
                />
              </div>
            </label>
            {showPacks && (
              <div className="flex flex-wrap gap-2 mt-4">
                {themedPacks.filter(pack => !pack.localeOnly || pack.localeOnly === i18n.language).map(pack => {
                  const active = selectedPacks.includes(pack.id);
                  const label = i18n.language === 'he' ? pack.name.he : pack.name.en;
                  return (
                    <button
                      key={pack.id}
                      onClick={() => togglePack(pack.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
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

        {/* Start button */}
        <button
          onClick={startGame}
          disabled={!canStart}
          className={`btn-primary w-full text-xl py-4 ${
            !canStart ? 'opacity-40 cursor-not-allowed' : 'animate-pulse-glow'
          }`}
        >
          {canStart ? t('setup.startGame') : t('setup.minPlayers')}
        </button>
      </div>
    </div>
  );
}
