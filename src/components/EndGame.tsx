import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import Confetti from './Confetti';

export default function EndGame() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const game = state.game!;
  const [showWinner, setShowWinner] = useState(false);

  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isTied = sorted.length > 1 && sorted[0].score === sorted[1].score;

  useEffect(() => {
    const timer = setTimeout(() => setShowWinner(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white relative">
      <Confetti />

      <h1 className="text-4xl font-bold mb-6 animate-slide-up">{t('endgame.gameOver')}</h1>

      {showWinner && (
        <div className="animate-slide-up text-center mb-8">
          <div className="text-6xl animate-crown mb-4">👑</div>
          <p className="text-lg text-white/60 mb-2">{t('endgame.theWinnerIs')}</p>
          {isTied ? (
            <div>
              <p className="text-3xl font-bold text-yellow-400 mb-2">{t('endgame.tied')}</p>
              {sorted.filter((p) => p.score === winner.score).map((p) => (
                <span key={p.id} className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent mx-2">
                  {p.name}
                </span>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                {winner.name}
              </p>
              <p className="text-xl text-yellow-400 mt-2">{winner.score} {t('game.points')}</p>
            </div>
          )}
        </div>
      )}

      {/* Final scores */}
      <div className="w-full max-w-md space-y-2 mb-8">
        <h3 className="text-lg font-semibold text-center mb-3">{t('endgame.finalScores')}</h3>
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up"
            style={{ animationDelay: `${1 + i * 0.15}s` }}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              i === 0 ? 'bg-yellow-400 text-gray-900' :
              i === 1 ? 'bg-gray-300 text-gray-900' :
              i === 2 ? 'bg-amber-600 text-white' :
              'bg-white/10'
            }`}>
              {i + 1}
            </div>
            <span className="flex-1 font-medium">{player.name}</span>
            <div className="text-right">
              <div className="font-bold text-lg">{player.score}</div>
              <div className="text-xs text-white/50">
                {player.basePoints} + {player.bonusPoints} + {player.cardPoints}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        <button
          onClick={() => {
            dispatch({ type: 'RESET_GAME' });
            dispatch({ type: 'SET_SCREEN', screen: 'setup' });
          }}
          className="btn-primary flex-1"
        >
          {t('endgame.playAgain')}
        </button>
        <button
          onClick={() => dispatch({ type: 'RESET_GAME' })}
          className="btn-secondary flex-1"
        >
          {t('endgame.backToHome')}
        </button>
      </div>
    </div>
  );
}
