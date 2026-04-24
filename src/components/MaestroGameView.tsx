import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMultiplayerGame } from '../context/MultiplayerGameContext';
import { useSound } from '../hooks/useSound';
import { useTurnTimer } from '../hooks/useTurnTimer';
import type { CardColor, StolenCardSelection } from '../types';
import { getMaestroWordBonus } from '../utils/scoring';
import MaestroAnnouncement from './MaestroAnnouncement';
import TurnTimer from './TurnTimer';
import cardBackBlue from '../assets/card-back-blue.png';
import cardBackYellow from '../assets/card-back-yellow.png';
import cardBackRed from '../assets/card-back-red.png';

const CARD_BACKS: Record<CardColor, string> = { blue: cardBackBlue, yellow: cardBackYellow, red: cardBackRed };

export default function MaestroGameView() {
  const { t, i18n } = useTranslation();
  const {
    gameState, scores, judging, privateCard, players, myUid,
    maestroName, setTurnPhase, drawCard, doAdvancedDraw,
    startJudging, revealCard, confirmScore, selectStealCards, abandonCurrentPlay,
    nextTurn, skipTurn,
  } = useMultiplayerGame();
  const { play } = useSound();

  const lang = (['he', 'es', 'fr'].includes(i18n.language) ? i18n.language : 'en') as 'en' | 'he' | 'es' | 'fr';
  const game = gameState!;
  const myScores = myUid ? scores[myUid] : null;
  const secondsLeft = useTurnTimer(game.turnDeadline, true, skipTurn);
  const timerActive = game.turnDeadline && !['judging', 'summary'].includes(game.turnPhase);

  const [wordCount, setWordCount] = useState(3);
  const [songName, setSongName] = useState('');
  const [cardFulfilled, setCardFulfilled] = useState(false);
  const [fulfilledAdvancedCards, setFulfilledAdvancedCards] = useState<string[]>([]);
  const [stealSelections, setStealSelections] = useState<StolenCardSelection[]>([]);
  const [fulfilledStolenCards, setFulfilledStolenCards] = useState<string[]>([]);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const scoringRef = useRef(false);

  const dismissAnnouncement = useCallback(() => setShowAnnouncement(false), []);

  const isSongUsed = songName.trim() && (game.usedSongs || []).includes(songName.toLowerCase().trim());
  const hasHeldCard = !!myScores?.heldCard;

  const backupSingers = players.filter(p => p.uid !== myUid);
  const singerResponses = judging?.singerResponses || {};
  const correctCount = Object.values(singerResponses).filter(Boolean).length;

  const playersWithCards = players.filter(p => {
    if (p.uid === myUid) return false;
    const s = scores[p.uid];
    return s && (s.fulfilledCards || []).length > 0;
  });
  const canSteal = game.allowStealing && playersWithCards.length >= 2;

  const canAbandonCurrentPlay =
    (game.turnPhase === 'singing' || game.turnPhase === 'advanced-draw') &&
    !!(privateCard || game.activeCard || (game.advancedDrawCards && game.advancedDrawCards.length > 0) || (game.pendingStolenCards && game.pendingStolenCards.length > 0));

  const handleAbandon = async () => {
    setCardFulfilled(false);
    setFulfilledAdvancedCards([]);
    setFulfilledStolenCards([]);
    setStealSelections([]);
    await abandonCurrentPlay();
  };

  const handleDrawCard = async (color: CardColor) => {
    play('cardDraw');
    await drawCard(color);
  };

  const handleAdvancedDraw = async () => {
    play('cardDraw');
    await doAdvancedDraw();
  };

  const handleProceedToJudging = async () => {
    await startJudging(wordCount);
    setCardFulfilled(false);
    setFulfilledAdvancedCards([]);
    setFulfilledStolenCards([]);
  };

  const handleScoreTurn = async () => {
    if (scoringRef.current) return;
    scoringRef.current = true;
    setScoring(true);
    setScoreError('');
    try {
      await confirmScore({
        cardFulfilled,
        fulfilledAdvancedCardIds: fulfilledAdvancedCards,
        fulfilledStolenCardIds: fulfilledStolenCards,
        songName: songName.trim() || undefined,
      });
    } catch (err) {
      console.error('Score turn failed:', err);
      setScoreError(err instanceof Error ? err.message : 'Scoring failed');
    } finally {
      scoringRef.current = false;
      setScoring(false);
    }
  };

  const resetAndNext = async () => {
    setWordCount(3);
    setSongName('');
    setCardFulfilled(false);
    setFulfilledAdvancedCards([]);
    setStealSelections([]);
    setFulfilledStolenCards([]);
    setShowAnnouncement(true);
    await nextTurn();
  };

  const handleSkip = async () => {
    setWordCount(3);
    setSongName('');
    setShowAnnouncement(true);
    await skipTurn();
  };

  const toggleStealCard = (fromPlayerId: string, card: typeof players[0] extends never ? never : any) => {
    setStealSelections((prev) => {
      const existing = prev.find((s) => s.card.id === card.id);
      if (existing) return prev.filter((s) => s.card.id !== card.id);
      const fromSamePlayer = prev.find((s) => s.fromPlayerId === fromPlayerId);
      if (fromSamePlayer) return prev.map((s) => s.fromPlayerId === fromPlayerId ? { fromPlayerId, card } : s);
      return [...prev, { fromPlayerId, card }];
    });
  };

  const lastTurnScore = (game.scoreHistory || [])[(game.scoreHistory || []).length - 1];

  return (
    <div className="min-h-screen flex flex-col p-4 text-white pb-24">
      {showAnnouncement && game.turnPhase === 'choose-action' && (
        <MaestroAnnouncement
          maestroName={maestroName}
          currentRound={game.currentRound}
          totalRounds={game.totalRounds}
          isFirstTurnOfRound={game.turnsPlayedThisRound === 0}
          onComplete={dismissAnnouncement}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-white/60">
          {t('game.round')} {game.currentRound} {t('game.of')} {game.totalRounds}
        </div>
        {timerActive && <TurnTimer secondsLeft={secondsLeft} />}
        <div className="text-sm text-purple-300 font-semibold">{t('mp.youAreMaestro')}</div>
      </div>

      {/* Maestro display */}
      <div className="glass rounded-2xl p-4 mb-4 text-center animate-slide-up">
        <div className="text-sm text-white/50 mb-1">{t('game.maestro')}</div>
        <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
          {maestroName}
        </div>
      </div>

      {/* Held card */}
      {hasHeldCard && game.turnPhase === 'choose-action' && myScores?.heldCard && (
        <div className={`rounded-2xl p-4 mb-4 ${
          myScores.heldCard.card.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
          myScores.heldCard.card.color === 'blue' ? 'card-gradient-blue text-white' :
          'card-gradient-red text-white'
        }`}>
          <div className="text-xs font-semibold mb-1">{t('game.heldCard')}</div>
          <div className="font-medium" dir="auto">{myScores.heldCard.card.instruction[lang]}</div>
          <div className="text-xs mt-1 opacity-75">
            {myScores.heldCard.roundsRemaining <= 1 ? t('game.mustUseNow') : `${myScores.heldCard.roundsRemaining} ${t('game.roundsLeft')}`}
          </div>
          {myScores.heldCard.roundsRemaining <= 1 && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-black/20 text-xs font-semibold">
              ⚠️ {t('game.heldCardWarning')}
            </div>
          )}
        </div>
      )}

      {hasHeldCard && game.turnPhase === 'choose-action' && game.includeCards && (
        <div className="rounded-xl p-3 mb-4 bg-yellow-500/15 border border-yellow-400/30 text-yellow-200 text-sm text-center">
          💡 {t('game.cannotDrawWhileHolding')}
        </div>
      )}

      {/* Choose Action */}
      {game.turnPhase === 'choose-action' && (
        <div className="space-y-3 animate-slide-up">
          <p className="text-center text-white/60 mb-2">{t('game.chooseAction')}</p>
          <button onClick={() => setTurnPhase('singing')} className="btn-primary w-full text-lg py-4">
            🎤 {t('game.iHaveASong')}
          </button>
          {game.includeCards && !hasHeldCard && !game.hasDrawnCardThisTurn && (
            <>
              <button onClick={() => setTurnPhase('draw-card')} className="btn-secondary w-full">
                💡 {t('game.drawCard')}
              </button>
              {!myScores?.hasUsedAdvancedDraw && (
                <button onClick={handleAdvancedDraw} className="btn-secondary w-full text-sm">
                  ⚡ {t('game.advancedDraw')}
                  <span className="block text-xs text-white/50">{t('game.advancedDrawDesc')}</span>
                </button>
              )}
            </>
          )}
          {game.includeCards && canSteal && (
            <button onClick={() => setTurnPhase('steal-cards')} className="btn-secondary w-full text-sm">
              🕵️ {t('game.stealCards')}
              <span className="block text-xs text-white/50">{t('game.stealCardsDesc')}</span>
            </button>
          )}
          <button onClick={handleSkip} className="btn-secondary w-full opacity-60">
            ⏭ {t('game.skipTurn')}
          </button>
        </div>
      )}

      {/* Draw Card */}
      {game.turnPhase === 'draw-card' && (
        <div className="space-y-3 animate-slide-up">
          <p className="text-center text-white/60 mb-2">{t('game.selectDifficulty')}</p>
          <div className="flex justify-center gap-3">
            {(['yellow', 'blue', 'red'] as CardColor[]).map((color) => (
              <button
                key={color}
                onClick={() => handleDrawCard(color)}
                className="relative w-24 rounded-2xl overflow-hidden transition-transform hover:scale-105 active:scale-95"
              >
                <img src={CARD_BACKS[color]} alt={color} className="w-full rounded-2xl" />
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 bg-gradient-to-t from-black/50 to-transparent rounded-2xl">
                  <div className="text-white font-bold text-sm">
                    {color === 'yellow' ? t('game.easy') : color === 'blue' ? t('game.medium') : t('game.hard')}
                  </div>
                  <div className="text-white/70 text-xs">{color === 'yellow' ? '5' : color === 'blue' ? '20' : '50-100'} {t('game.points')}</div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setTurnPhase('choose-action')} className="btn-secondary w-full mt-2">
            ← {t('rules.back')}
          </button>
          <button onClick={handleSkip} className="btn-secondary w-full opacity-60">
            ⏭ {t('game.skipTurn')}
          </button>
        </div>
      )}

      {/* Singing */}
      {game.turnPhase === 'singing' && (
        <div className="space-y-4 animate-slide-up">
          {privateCard && (
            <div className={`rounded-2xl p-5 text-center animate-flip-card ${
              privateCard.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
              privateCard.color === 'blue' ? 'card-gradient-blue text-white' :
              'card-gradient-red text-white'
            }`}>
              <div className="text-xs font-semibold mb-2 uppercase opacity-75">{t('game.cardInstruction')}</div>
              <div className="text-lg font-bold" dir="auto">{privateCard.instruction[lang]}</div>
              <div className="text-sm mt-2 opacity-75">+{privateCard.bonusPoints} {t('game.points')}</div>
            </div>
          )}

          {game.advancedDrawCards && (
            <div className="space-y-3">
              <p className="text-center text-white/60 mb-2">{t('game.advancedDrawExplain')}</p>
              {game.advancedDrawCards.map((card) => (
                <div key={card.id} className={`rounded-2xl p-4 text-center animate-flip-card ${
                  card.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
                  card.color === 'blue' ? 'card-gradient-blue text-white' :
                  'card-gradient-red text-white'
                }`}>
                  <div className="font-bold" dir="auto">{card.instruction[lang]}</div>
                  <div className="text-sm mt-1 opacity-75">+{card.bonusPoints} {t('game.points')}</div>
                </div>
              ))}
            </div>
          )}

          <div className="glass rounded-2xl p-5">
            <div className="text-sm text-white/60 mb-2">{t('game.enterSongName')}</div>
            <input
              type="text" value={songName} onChange={(e) => setSongName(e.target.value)}
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            {isSongUsed && <p className="text-red-400 text-sm mt-1">⚠️ {t('game.songUsed')}</p>}
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">{t('game.wordCount')}</h3>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setWordCount(Math.max(1, wordCount - 1))} className="w-12 h-12 rounded-full bg-white/10 text-2xl">−</button>
              <div className="text-center">
                <span className="text-4xl font-bold">{wordCount > 10 ? '10+' : wordCount}</span>
                <div className="text-sm text-yellow-400 mt-1">+{getMaestroWordBonus(wordCount)} {t('game.points')}</div>
              </div>
              <button onClick={() => setWordCount(Math.min(11, wordCount + 1))} className="w-12 h-12 rounded-full bg-white/10 text-2xl">+</button>
            </div>
          </div>

          <button onClick={handleProceedToJudging} className="btn-primary w-full">
            🎵 {t('mp.doneSinging')}
          </button>
          {canAbandonCurrentPlay && (
            <button type="button" onClick={handleAbandon} className="btn-secondary w-full">
              {t('game.abandonPlay')}
            </button>
          )}
          <button type="button" onClick={handleSkip} className="btn-secondary w-full opacity-60">
            ⏭ {t('game.skipTurn')}
          </button>
        </div>
      )}

      {/* Advanced Draw display */}
      {game.turnPhase === 'advanced-draw' && game.advancedDrawCards && (
        <div className="space-y-4 animate-slide-up">
          <p className="text-center text-white/60 mb-2">{t('game.advancedDrawExplain')}</p>
          {game.advancedDrawCards.map((card) => (
            <div key={card.id} className={`rounded-2xl p-4 text-center animate-flip-card ${
              card.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
              card.color === 'blue' ? 'card-gradient-blue text-white' :
              'card-gradient-red text-white'
            }`}>
              <div className="font-bold" dir="auto">{card.instruction[lang]}</div>
              <div className="text-sm mt-1 opacity-75">+{card.bonusPoints} {t('game.points')}</div>
            </div>
          ))}
          <button onClick={() => setTurnPhase('singing')} className="btn-primary w-full">
            🎵 {t('game.iHaveASong')}
          </button>
          <button type="button" onClick={handleAbandon} className="btn-secondary w-full">
            {t('game.abandonPlay')}
          </button>
          <button type="button" onClick={handleSkip} className="btn-secondary w-full opacity-60">
            ⏭ {t('game.skipTurn')}
          </button>
        </div>
      )}

      {/* Steal Cards */}
      {game.turnPhase === 'steal-cards' && (
        <div className="space-y-4 animate-slide-up">
          <p className="text-center text-white/60 mb-2">{t('game.stealExplain')}</p>
          {playersWithCards.map((player) => {
            const pScores = scores[player.uid];
            return (
              <div key={player.uid} className="glass rounded-2xl p-4">
                <h4 className="font-semibold mb-3 text-white/80">{player.name}</h4>
                <div className="space-y-2">
                  {(pScores?.fulfilledCards || []).map((card) => {
                    const isSelected = stealSelections.some(s => s.card.id === card.id);
                    return (
                      <button key={card.id} onClick={() => toggleStealCard(player.uid, card)}
                        className={`w-full rounded-xl p-3 text-left transition-all flex items-center gap-3 ${
                          isSelected ? 'bg-purple-500/30 ring-2 ring-purple-400' : 'bg-white/5 hover:bg-white/10'
                        }`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm shrink-0 ${
                          isSelected ? 'border-purple-400 bg-purple-400 text-white' : 'border-white/30'
                        }`}>{isSelected && '✓'}</div>
                        <div className="flex-1">
                          <div dir="auto" className={`text-sm font-medium ${
                            card.color === 'yellow' ? 'text-yellow-300' : card.color === 'blue' ? 'text-blue-300' : 'text-red-300'
                          }`}>{card.instruction[lang]}</div>
                          <div className="text-xs text-white/50">+{card.bonusPoints} {t('game.points')}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button
            onClick={async () => { await selectStealCards(stealSelections); }}
            disabled={new Set(stealSelections.map(s => s.fromPlayerId)).size < 2}
            className={`btn-primary w-full text-lg py-4 ${new Set(stealSelections.map(s => s.fromPlayerId)).size < 2 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >{t('game.confirmSteal')}</button>
          <button onClick={() => { setStealSelections([]); setTurnPhase('choose-action'); }} className="btn-secondary w-full">
            ← {t('game.skipSteal')}
          </button>
        </div>
      )}

      {/* Judging */}
      {game.turnPhase === 'judging' && (
        <div className="space-y-5 animate-slide-up">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">{t('mp.singerResponses')}</h3>
            <div className="space-y-2">
              {backupSingers.map((singer) => {
                const responded = singerResponses[singer.uid];
                const hasResponded = responded !== undefined;
                const showDisconnected = !singer.connected && !hasResponded;
                return (
                  <div key={singer.uid} className={`flex items-center gap-3 p-3 rounded-xl ${
                    responded === true ? 'bg-green-500/30 ring-1 ring-green-400' :
                    responded === false ? 'bg-red-500/20 ring-1 ring-red-400/50' :
                    showDisconnected ? 'bg-gray-500/20 ring-1 ring-gray-500/50 opacity-60' :
                    'bg-white/5'
                  }`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm ${
                      responded === true ? 'border-green-400 bg-green-400 text-white' :
                      responded === false ? 'border-red-400 bg-red-400/50 text-white' :
                      showDisconnected ? 'border-gray-500 bg-gray-500/50 text-white' :
                      'border-white/30'
                    }`}>
                      {responded === true && '✓'}
                      {responded === false && '✗'}
                      {!hasResponded && showDisconnected && '⚡'}
                      {!hasResponded && !showDisconnected && '?'}
                    </div>
                    <span className={`font-medium ${showDisconnected ? 'line-through text-white/40' : ''}`}>{singer.name}</span>
                    {showDisconnected && <span className="text-xs text-red-400 ml-auto">{t('mp.disconnected')}</span>}
                    {!hasResponded && !showDisconnected && <span className="text-xs text-white/40 ml-auto">{t('mp.waiting')}</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-center text-sm text-white/50">
              {correctCount} {t('mp.gotItRight')}
            </div>
          </div>

          {/* Card fulfillment (single card) */}
          {game.activeCard && !game.advancedDrawCards && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-2">{t('game.cardFulfilled')}</h3>
              {correctCount === 0 ? (
                <p className="text-white/40 text-sm">{t('game.cardNeedsSinger')}</p>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => { setCardFulfilled(true); revealCard(game.activeCard); }}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${cardFulfilled ? 'bg-green-500/30 ring-2 ring-green-400' : 'bg-white/5'}`}
                  >{t('game.yes')}</button>
                  <button onClick={() => { setCardFulfilled(false); revealCard(null); }}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${!cardFulfilled ? 'bg-red-500/30 ring-2 ring-red-400' : 'bg-white/5'}`}
                  >{t('game.no')}</button>
                </div>
              )}
            </div>
          )}

          {/* Advanced card fulfillment */}
          {game.advancedDrawCards && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-3">{t('game.advancedFulfilledTitle')}</h3>
              {correctCount === 0 ? (
                <div className="space-y-3">
                  <p className="text-white/70 text-sm">{t('game.advancedNoneCorrectExplain')}</p>
                  <div className="space-y-2">
                    {game.advancedDrawCards.map((card) => (
                      <div key={card.id} className={`rounded-xl p-3 text-left ${
                        card.color === 'yellow' ? 'bg-yellow-500/10 border border-yellow-400/20' :
                        card.color === 'blue' ? 'bg-blue-500/10 border border-blue-400/20' :
                        'bg-red-500/10 border border-red-400/20'
                      }`}>
                        <div dir="auto" className={`text-sm font-medium ${
                          card.color === 'yellow' ? 'text-yellow-200' : card.color === 'blue' ? 'text-blue-200' : 'text-red-200'
                        }`}>{card.instruction[lang]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {game.advancedDrawCards.map((card) => (
                    <button key={card.id}
                      onClick={() => setFulfilledAdvancedCards(prev => prev.includes(card.id) ? prev.filter(c => c !== card.id) : [...prev, card.id])}
                      className={`w-full rounded-xl p-3 text-left transition-all flex items-center gap-3 ${
                        fulfilledAdvancedCards.includes(card.id) ? 'bg-green-500/30 ring-2 ring-green-400' : 'bg-white/5 hover:bg-white/10'
                      }`}>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm shrink-0 ${
                        fulfilledAdvancedCards.includes(card.id) ? 'border-green-400 bg-green-400 text-white' : 'border-white/30'
                      }`}>{fulfilledAdvancedCards.includes(card.id) && '✓'}</div>
                      <div className="flex-1">
                        <div dir="auto" className={`text-sm font-medium ${
                          card.color === 'yellow' ? 'text-yellow-300' : card.color === 'blue' ? 'text-blue-300' : 'text-red-300'
                        }`}>{card.instruction[lang]}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stolen card fulfillment */}
          {game.pendingStolenCards && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-3">{t('game.stealFulfilled')}</h3>
              {correctCount === 0 ? (
                <div className="space-y-3">
                  <p className="text-white/70 text-sm">{t('game.stealNoneCorrectExplain')}</p>
                  <div className="space-y-2">
                    {game.pendingStolenCards.map((sel) => {
                      const owner = players.find(p => p.uid === sel.fromPlayerId);
                      return (
                        <div key={sel.card.id} className="rounded-xl p-3 text-left bg-white/5 border border-white/10">
                          <div className="text-xs text-white/50 mb-1">🕵️ {owner?.name}</div>
                          <div dir="auto" className="text-sm font-medium text-purple-200">{sel.card.instruction[lang]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {game.pendingStolenCards.map((sel) => {
                    const owner = players.find(p => p.uid === sel.fromPlayerId);
                    return (
                      <button key={sel.card.id}
                        onClick={() => setFulfilledStolenCards(prev => prev.includes(sel.card.id) ? prev.filter(c => c !== sel.card.id) : [...prev, sel.card.id])}
                        className={`w-full rounded-xl p-3 text-left transition-all flex items-center gap-3 ${
                          fulfilledStolenCards.includes(sel.card.id) ? 'bg-purple-500/30 ring-2 ring-purple-400' : 'bg-white/5 hover:bg-white/10'
                        }`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm shrink-0 ${
                          fulfilledStolenCards.includes(sel.card.id) ? 'border-purple-400 bg-purple-400 text-white' : 'border-white/30'
                        }`}>{fulfilledStolenCards.includes(sel.card.id) && '✓'}</div>
                        <div className="flex-1">
                          <div className="text-xs text-white/50 mb-1">🕵️ {owner?.name}</div>
                          <div dir="auto" className={`text-sm font-medium ${
                            sel.card.color === 'yellow' ? 'text-yellow-300' : sel.card.color === 'blue' ? 'text-blue-300' : 'text-red-300'
                          }`}>{sel.card.instruction[lang]}</div>
                        </div>
                      </button>
                    );
                  })}
                  {(() => {
                    const ownersCount = new Set(game.pendingStolenCards!.filter(s => fulfilledStolenCards.includes(s.card.id)).map(s => s.fromPlayerId)).size;
                    if (ownersCount < 2) {
                      return <p className="text-yellow-400/80 text-xs">⚠️ {t('game.stealWillFail')}</p>;
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          )}

          {(() => {
            const allResponded = backupSingers.every(
              (s) => singerResponses[s.uid] !== undefined || !s.connected
            );
            const isDisabled = scoring || !allResponded;
            return (
              <>
                {scoreError && (
                  <div className="rounded-xl p-3 bg-red-500/20 border border-red-400/30 text-red-200 text-sm text-center">
                    {scoreError}
                  </div>
                )}
                <button onClick={handleScoreTurn} disabled={!!isDisabled}
                  className={`btn-primary w-full text-lg py-4 ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  {scoring ? '⏳...' : t('game.confirmScoring')}
                </button>
                {!allResponded && (
                  <p className="text-center text-sm text-white/50 mt-1">{t('game.waitingForSingers')}</p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Summary */}
      {game.turnPhase === 'summary' && lastTurnScore && (
        <div className="space-y-4 animate-slide-up">
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
                {lastTurnScore.singerScores.length > 0 && (
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="text-sm text-white/50 mb-2">{t('game.singerPoints')}</div>
                    {lastTurnScore.singerScores.map((ss) => {
                      const player = players.find(p => p.uid === ss.playerId);
                      return (
                        <div key={ss.playerId} className="flex justify-between items-center px-4">
                          <span className="text-white/70">{player?.name}</span>
                          <span className="text-green-400 font-bold">+{ss.points}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white/50 text-lg">{t('game.noPoints')}</p>
            )}
          </div>
          <button onClick={resetAndNext} className="btn-primary w-full text-lg py-4">
            {t('game.nextTurn')} →
          </button>
        </div>
      )}

      {/* Bottom bar: backup singers */}
      {game.turnPhase !== 'summary' && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-t border-white/10 p-3">
          <div className="flex gap-2 overflow-x-auto px-2">
            {backupSingers.map((singer) => {
              const s = scores[singer.uid];
              return (
                <div key={singer.uid} className="shrink-0 text-center px-3 py-2 rounded-xl bg-white/5">
                  <div className="text-xs text-white/60">{singer.name}</div>
                  <div className="text-sm font-bold">{s?.score || 0}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
