import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMultiplayerGame } from '../context/MultiplayerGameContext';
import MaestroAnnouncement from './MaestroAnnouncement';
import cardBackBlue from '../assets/card-back-blue.png';
import cardBackYellow from '../assets/card-back-yellow.png';
import cardBackRed from '../assets/card-back-red.png';

const CARD_BACKS = { blue: cardBackBlue, yellow: cardBackYellow, red: cardBackRed } as const;

export default function SpectatorGameView() {
  const { t, i18n } = useTranslation();
  const {
    gameState, scores, judging, players, myUid,
    maestroName, maestroUid,
    reportGotItRight,
  } = useMultiplayerGame();

  const lang = (['he', 'es', 'fr'].includes(i18n.language) ? i18n.language : 'en') as 'en' | 'he' | 'es' | 'fr';

  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [responded, setResponded] = useState(false);

  const game = gameState!;
  const lastTurnScore = (game.scoreHistory || [])[(game.scoreHistory || []).length - 1];

  // Reset responded when turn changes
  useEffect(() => {
    if (game.turnPhase !== 'judging') {
      setResponded(false);
    }
  }, [game.turnPhase]);

  // Show announcement on new turn
  useEffect(() => {
    if (game.turnPhase === 'choose-action') {
      setShowAnnouncement(true);
    }
  }, [game.turnPhase, game.currentMaestroIndex]);

  const handleReportRight = async (didGetIt: boolean) => {
    await reportGotItRight(didGetIt);
    setResponded(true);
  };

  return (
    <div className="min-h-screen flex flex-col p-4 text-white pb-24">
      {showAnnouncement && game.turnPhase === 'choose-action' && (
        <MaestroAnnouncement
          maestroName={maestroName}
          currentRound={game.currentRound}
          totalRounds={game.totalRounds}
          isFirstTurnOfRound={game.turnsPlayedThisRound === 0}
          onComplete={() => setShowAnnouncement(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-white/60">
          {t('game.round')} {game.currentRound} {t('game.of')} {game.totalRounds}
        </div>
        <div className="text-sm text-white/60">
          {t('mp.you')}: {players.find(p => p.uid === myUid)?.name}
        </div>
      </div>

      {/* Maestro display */}
      <div className="glass rounded-2xl p-5 mb-4 text-center">
        <div className="text-sm text-white/50 mb-1">{t('game.maestro')}</div>
        <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
          {maestroName}
        </div>
        <div className="text-sm text-white/40 mt-2">🎙️ {t('mp.youAreBackup')}</div>
      </div>

      {/* Phase indicator */}
      {game.turnPhase === 'choose-action' && (
        <div className="glass rounded-2xl p-6 mb-4 text-center animate-pulse-glow">
          <div className="text-5xl mb-3">🎤</div>
          <p className="text-white/60">{t('mp.maestroChoosing')}</p>
        </div>
      )}

      {game.turnPhase === 'draw-card' && (
        <div className="glass rounded-2xl p-6 mb-4 text-center animate-pulse-glow">
          <div className="flex justify-center items-end mb-3">
            <img src={cardBackYellow} alt="yellow" className="w-8 rounded -rotate-12 -me-1 relative z-0" />
            <img src={cardBackBlue} alt="blue" className="w-10 rounded relative z-10" />
            <img src={cardBackRed} alt="red" className="w-8 rounded rotate-12 -ms-1 relative z-0" />
          </div>
          <p className="text-white/60">{t('mp.maestroDrawing')}</p>
        </div>
      )}

      {game.turnPhase === 'advanced-draw' && (
        <div className="glass rounded-2xl p-6 mb-4 text-center animate-pulse-glow">
          <div className="flex justify-center items-end mb-3">
            <img src={cardBackYellow} alt="yellow" className="w-8 rounded -rotate-12 -me-1 relative z-0 ring-1 ring-yellow-400/50" />
            <img src={cardBackBlue} alt="blue" className="w-10 rounded relative z-10 ring-1 ring-blue-400/50" />
            <img src={cardBackRed} alt="red" className="w-8 rounded rotate-12 -ms-1 relative z-0 ring-1 ring-red-400/50" />
          </div>
          <p className="text-white/60">{t('mp.maestroAdvanced')}</p>
        </div>
      )}

      {game.turnPhase === 'steal-cards' && (
        <div className="glass rounded-2xl p-6 mb-4 text-center animate-pulse-glow">
          <div className="text-5xl mb-3">🎤</div>
          <p className="text-white/60">{t('mp.maestroChoosing')}</p>
        </div>
      )}

      {game.turnPhase === 'singing' && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3 animate-pulse-glow">🎵</div>
            <p className="text-xl font-bold mb-2">{t('mp.maestroSinging')}</p>
            <p className="text-white/50">{t('mp.listenCarefully')}</p>
          </div>

          {game.publicCard && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm text-white/50">{t('mp.cardInPlay')}</div>
              <div className="relative w-20 animate-flip-card">
                <img
                  src={CARD_BACKS[game.publicCard.color]}
                  alt={game.publicCard.color}
                  className="w-full rounded-xl shadow-lg"
                />
              </div>
              <div className={`text-lg font-bold ${
                game.publicCard.color === 'yellow' ? 'text-yellow-300' :
                game.publicCard.color === 'blue' ? 'text-blue-300' :
                'text-red-300'
              }`}>
                {game.publicCard.color === 'yellow' ? t('game.easy') : game.publicCard.color === 'blue' ? t('game.medium') : t('game.hard')}
                <span className="text-xs text-white/40 font-normal ms-2">+{game.publicCard.bonusPoints} {t('game.points')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Judging — this is where backup singers respond */}
      {game.turnPhase === 'judging' && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass rounded-2xl p-6 text-center">
            <h3 className="text-xl font-bold mb-4">{t('mp.didYouKnowIt')}</h3>
            {!responded ? (
              <div className="flex gap-4">
                <button onClick={() => handleReportRight(true)}
                  className="flex-1 py-5 rounded-2xl bg-green-500/20 border-2 border-green-400/50 text-green-300 font-bold text-xl hover:bg-green-500/30 transition-all active:scale-95">
                  ✓ {t('mp.iKnewIt')}
                </button>
                <button onClick={() => handleReportRight(false)}
                  className="flex-1 py-5 rounded-2xl bg-red-500/20 border-2 border-red-400/50 text-red-300 font-bold text-xl hover:bg-red-500/30 transition-all active:scale-95">
                  ✗ {t('mp.didntKnow')}
                </button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <div className="text-4xl mb-2">{judging?.singerResponses?.[myUid!] ? '✅' : '❌'}</div>
                <p className="text-white/60">{t('mp.responseRecorded')}</p>
                <p className="text-white/40 text-sm mt-2">{t('mp.waitingForMaestro')}</p>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="text-sm text-white/50 mb-2">{t('mp.responses')}</div>
            <div className="flex flex-wrap gap-2">
              {players.filter(p => p.uid !== maestroUid).map((p) => {
                const resp = judging?.singerResponses?.[p.uid];
                const hasResp = resp !== undefined;
                const showDisconnected = !p.connected && !hasResp;
                return (
                  <div key={p.uid} className={`px-3 py-2 rounded-xl text-sm ${
                    resp === true ? 'bg-green-500/30 text-green-300' :
                    resp === false ? 'bg-red-500/20 text-red-300' :
                    showDisconnected ? 'bg-gray-500/20 text-white/30 line-through' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {p.name} {resp === true ? '✓' : resp === false ? '✗' : showDisconnected ? '⚡' : '...'}
                  </div>
                );
              })}
            </div>
          </div>

          {game.revealedCard && (
            <div className={`rounded-2xl p-5 text-center animate-flip-card ${
              game.revealedCard.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
              game.revealedCard.color === 'blue' ? 'card-gradient-blue text-white' :
              'card-gradient-red text-white'
            }`}>
              <div className="text-xs font-semibold mb-1 uppercase opacity-75">{t('game.maestroFulfilledCard')}</div>
              <div className="text-lg font-bold" dir="auto">{game.revealedCard.instruction[lang]}</div>
              <div className="text-sm mt-1 opacity-75">+{game.revealedCard.bonusPoints} {t('game.points')}</div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {game.turnPhase === 'summary' && lastTurnScore && (
        <div className="space-y-4 animate-slide-up">
          {/* Alert if cards were stolen from this player */}
          {lastTurnScore.stolenCards?.some(s => s.fromPlayerId === myUid) && (
            <div className="glass rounded-2xl p-4 border border-red-500/50 bg-red-500/10 text-center animate-shake">
              <div className="text-3xl mb-2">🕵️</div>
              {lastTurnScore.stolenCards.filter(s => s.fromPlayerId === myUid).map((s, i) => {
                const colorLabel = s.cardColor === 'yellow' ? t('game.easy') : s.cardColor === 'blue' ? t('game.medium') : t('game.hard');
                return (
                  <p key={i} className="text-red-300 font-bold">
                    {t('game.stolenFromYou', { thief: players.find(p => p.uid === lastTurnScore.maestroId)?.name, color: colorLabel, points: s.cardPoints })}
                  </p>
                );
              })}
            </div>
          )}

          <div className="glass rounded-2xl p-5 text-center">
            <h3 className="text-xl font-bold mb-4">{t('game.turnSummary')}</h3>
            {lastTurnScore.maestroBasePoints + lastTurnScore.maestroWordBonus + lastTurnScore.maestroCardBonus > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-4">
                  <span className="text-white/70">{t('game.maestroPoints')}</span>
                  <span className="text-lg font-bold text-green-400">+{lastTurnScore.maestroBasePoints}</span>
                </div>
                {lastTurnScore.maestroWordBonus > 0 && (
                  <div className="flex justify-between items-center px-4">
                    <span className="text-white/70">{t('game.maestroBonus')}</span>
                    <span className="text-lg font-bold text-yellow-400">+{lastTurnScore.maestroWordBonus}</span>
                  </div>
                )}
                {lastTurnScore.maestroCardBonus > 0 && (
                  <div className="flex justify-between items-center px-4">
                    <span className="text-white/70">{t('game.cardBonus')}</span>
                    <span className="text-lg font-bold text-purple-400">+{lastTurnScore.maestroCardBonus}</span>
                  </div>
                )}
                {lastTurnScore.stolenCards && lastTurnScore.stolenCards.length > 0 && (
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="text-sm text-white/50 mb-2">🕵️ {t('game.stealCards')}</div>
                    {lastTurnScore.stolenCards.map((s, i) => {
                      const victim = players.find(p => p.uid === s.fromPlayerId);
                      const colorLabel = s.cardColor === 'yellow' ? t('game.easy') : s.cardColor === 'blue' ? t('game.medium') : t('game.hard');
                      return (
                        <div key={i} className="flex justify-between items-center px-4">
                          <span className="text-white/70">{t('game.stolenSummary', { color: colorLabel, victim: victim?.name })}</span>
                          <span className="text-purple-400 font-bold">+{s.cardPoints}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="text-sm text-white/50 mb-2">{t('game.singerPoints')}</div>
                  {lastTurnScore.singerScores.map((ss) => {
                    const player = players.find(p => p.uid === ss.playerId);
                    return (
                      <div key={ss.playerId} className="flex justify-between items-center px-4">
                        <span className={`text-white/70 ${ss.playerId === myUid ? 'font-bold text-white' : ''}`}>
                          {player?.name} {ss.playerId === myUid ? `(${t('mp.you')})` : ''}
                        </span>
                        <span className="text-green-400 font-bold">+{ss.points}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-white/50 text-lg">{t('game.noPoints')}</p>
            )}
          </div>

          {game.revealedCard && (
            <div className={`rounded-2xl p-4 text-center ${
              game.revealedCard.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
              game.revealedCard.color === 'blue' ? 'card-gradient-blue text-white' :
              'card-gradient-red text-white'
            }`}>
              <div className="text-xs font-semibold mb-1 uppercase opacity-75">{t('game.maestroFulfilledCard')}</div>
              <div className="font-bold" dir="auto">{game.revealedCard.instruction[lang]}</div>
              <div className="text-sm mt-1 opacity-75">+{game.revealedCard.bonusPoints} {t('game.points')}</div>
            </div>
          )}

          <div className="glass rounded-2xl p-4 text-center animate-pulse-glow">
            <p className="text-white/60">{t('mp.waitingForNext')}</p>
          </div>
        </div>
      )}

      {/* Bottom bar: all scores */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-t border-white/10 p-3">
        <div className="flex gap-2 overflow-x-auto px-2">
          {players.map((p) => {
            const s = scores[p.uid];
            return (
              <div key={p.uid} className={`shrink-0 text-center px-3 py-2 rounded-xl ${
                p.uid === myUid ? 'bg-pink-500/20 ring-1 ring-pink-400/50' : 'bg-white/5'
              }`}>
                <div className="text-xs text-white/60">{p.name}</div>
                <div className="text-sm font-bold">{s?.score || 0}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
