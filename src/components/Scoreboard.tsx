import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';

export default function Scoreboard() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const game = state.game!;

  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  const maxScore = sorted[0]?.score || 1;

  return (
    <div className="min-h-screen flex flex-col items-center p-6 text-white">
      <button
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'play' })}
        className="self-start mb-6 text-white/60 hover:text-white transition-colors"
      >
        ← {t('rules.back')}
      </button>

      <h2 className="text-3xl font-bold mb-6">{t('scoreboard.title')}</h2>

      <div className="w-full max-w-md space-y-3">
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className="glass rounded-2xl p-4 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900' :
                i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900' :
                i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                'bg-white/10'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {player.name}
                  {i === 0 && <span className="text-yellow-400 text-sm">👑 {t('scoreboard.leader')}</span>}
                </div>
                <div className="text-xs text-white/50">
                  {t('scoreboard.base')}: {player.basePoints} | {t('scoreboard.bonus')}: {player.bonusPoints}
                  {player.cardPoints > 0 && ` | 💡 +${player.cardPoints} ${t('scoreboard.atEnd')}`}
                </div>
              </div>
              <div className="text-2xl font-bold">{player.score}</div>
            </div>

            {/* Score bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-700"
                style={{ width: `${(player.score / maxScore) * 100}%` }}
              />
            </div>

            {/* Fulfilled cards */}
            {player.fulfilledCards.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {player.fulfilledCards.map((card, j) => (
                  <div
                    key={j}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      card.color === 'yellow' ? 'bg-yellow-400/30 text-yellow-300' :
                      card.color === 'blue' ? 'bg-blue-400/30 text-blue-300' :
                      'bg-red-400/30 text-red-300'
                    }`}
                  >
                    +{card.bonusPoints}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
