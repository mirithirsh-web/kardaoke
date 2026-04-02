import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useRoom } from '../context/RoomContext';
import { useMultiplayerGame } from '../context/MultiplayerGameContext';
import Confetti from './Confetti';

export default function MultiplayerEndGame() {
  const { t } = useTranslation();
  const { dispatch } = useGame();
  const { leaveRoom } = useRoom();
  const { scores, players, myUid } = useMultiplayerGame();

  const sortedPlayers = [...players]
    .map((p) => ({ ...p, totalScore: (scores[p.uid]?.score || 0) }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const topScore = sortedPlayers[0]?.totalScore || 0;
  const winners = sortedPlayers.filter(p => p.totalScore === topScore);
  const isTied = winners.length > 1;
  const isWinner = winners.some(w => w.uid === myUid);

  const handleLeave = () => {
    leaveRoom();
    dispatch({ type: 'SET_SCREEN', screen: 'home' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      <Confetti />

      <div className="animate-crown-bounce text-7xl mb-4">👑</div>

      <h1 className="text-3xl font-bold mb-2">{t('endgame.gameOver')}</h1>

      {isTied ? (
        <p className="text-lg text-yellow-300 mb-6">{t('endgame.tied')}</p>
      ) : (
        <div className="mb-6 text-center">
          <p className="text-white/60">{t('endgame.theWinnerIs')}</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent animate-slide-up">
            {winners[0]?.name}
            {isWinner && ` (${t('mp.you')}!)`}
          </p>
          <p className="text-2xl text-yellow-400 mt-2">{topScore} {t('game.points')}</p>
        </div>
      )}

      <div className="glass rounded-2xl p-5 w-full max-w-md mb-8">
        <h3 className="text-lg font-semibold mb-4 text-center">{t('endgame.finalScores')}</h3>
        <div className="space-y-3">
          {sortedPlayers.map((p, i) => {
            const s = scores[p.uid];
            const isMe = p.uid === myUid;
            return (
              <div key={p.uid}
                className={`flex items-center gap-3 p-3 rounded-xl animate-slide-up ${
                  p.totalScore === topScore ? 'bg-yellow-500/15 ring-1 ring-yellow-400/30' :
                  isMe ? 'bg-pink-500/15 ring-1 ring-pink-400/30' : 'bg-white/5'
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? 'bg-yellow-500 text-black' :
                  i === 1 ? 'bg-gray-300 text-black' :
                  i === 2 ? 'bg-amber-700 text-white' :
                  'bg-white/10'
                }`}>
                  {i === 0 ? '👑' : i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{p.name} {isMe ? `(${t('mp.you')})` : ''}</div>
                  <div className="text-xs text-white/50">
                    {t('scoreboard.base')}: {s?.basePoints || 0} · {t('scoreboard.bonus')}: {s?.bonusPoints || 0} · {t('scoreboard.cards')}: {s?.cardPoints || 0}
                  </div>
                </div>
                <div className="text-xl font-bold">{p.totalScore}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={handleLeave} className="btn-primary text-lg py-3">
          {t('endgame.backToHome')}
        </button>
      </div>
    </div>
  );
}
