import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useSound } from '../hooks/useSound';
import type { CardColor, StolenCardSelection } from '../types';
import { getMaestroWordBonus } from '../utils/scoring';
import MaestroAnnouncement from './MaestroAnnouncement';
import cardBackBlue from '../assets/card-back-blue.png';
import cardBackYellow from '../assets/card-back-yellow.png';
import cardBackRed from '../assets/card-back-red.png';

const CARD_BACKS: Record<CardColor, string> = { blue: cardBackBlue, yellow: cardBackYellow, red: cardBackRed };

export default function GamePlay() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useGame();
  const { play, isMuted, toggleMute } = useSound();
  const game = state.game!;

  const maestro = game.players[game.currentMaestroIndex];
  const backupSingers = game.players.filter((_, i) => i !== game.currentMaestroIndex);
  const lang = (['he', 'es', 'fr'].includes(i18n.language) ? i18n.language : 'en') as 'en' | 'he' | 'es' | 'fr';

  const [wordCount, setWordCount] = useState(3);
  const [correctSingerIds, setCorrectSingerIds] = useState<string[]>([]);
  const [songName, setSongName] = useState('');
  const [cardFulfilled, setCardFulfilled] = useState(false);
  const [fulfilledAdvancedCards, setFulfilledAdvancedCards] = useState<string[]>([]);
  const [stealSelections, setStealSelections] = useState<StolenCardSelection[]>([]);
  const [fulfilledStolenCards, setFulfilledStolenCards] = useState<string[]>([]);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  const dismissAnnouncement = useCallback(() => setShowAnnouncement(false), []);

  const isSongUsed = songName.trim() && game.usedSongs.includes(songName.toLowerCase().trim());

  const nobodyKnewActive = correctSingerIds.length === 0;

  const toggleSinger = (id: string) => {
    setCorrectSingerIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleNobodyKnew = () => {
    setCorrectSingerIds([]);
  };

  const toggleAdvancedCardFulfilled = (id: string) => {
    setFulfilledAdvancedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const playersWithCards = game.players.filter(
    (p) => p.id !== maestro.id && p.fulfilledCards.length > 0
  );
  const canSteal = game.allowStealing && playersWithCards.length >= 2;

  const hasHeldCard = !!maestro.heldCard;

  const toggleStealCard = (fromPlayerId: string, card: typeof game.players[0]['fulfilledCards'][0]) => {
    setStealSelections((prev) => {
      const existing = prev.find((s) => s.card.id === card.id);
      if (existing) {
        return prev.filter((s) => s.card.id !== card.id);
      }
      const fromSamePlayer = prev.find((s) => s.fromPlayerId === fromPlayerId);
      if (fromSamePlayer) {
        return prev.map((s) => s.fromPlayerId === fromPlayerId ? { fromPlayerId, card } : s);
      }
      return [...prev, { fromPlayerId, card }];
    });
  };

  const confirmStealSelection = () => {
    dispatch({ type: 'SELECT_STEAL_CARDS', selections: stealSelections });
  };

  const toggleFulfilledStolen = (cardId: string) => {
    setFulfilledStolenCards((prev) =>
      prev.includes(cardId) ? prev.filter((c) => c !== cardId) : [...prev, cardId]
    );
  };

  const drawCard = (color: CardColor) => {
    const deck = game.cardDecks[color];
    if (deck.length === 0) return;
    const card = deck[0];
    play('cardDraw');
    dispatch({ type: 'DRAW_CARD', card, deckColor: color });
  };

  const doAdvancedDraw = () => {
    const { yellow, blue, red } = game.cardDecks;
    if (yellow.length === 0 || blue.length === 0 || red.length === 0) return;
    play('cardDraw');
    dispatch({ type: 'ADVANCED_DRAW' });
  };

  const scoreTurn = () => {
    if (game.pendingStolenCards) {
      dispatch({
        type: 'STEAL_SCORE',
        fulfilledCardIds: fulfilledStolenCards,
        correctSingerIds,
        wordCount,
        songName: songName.trim() || undefined,
      });
    } else if (game.advancedDrawCards) {
      dispatch({
        type: 'ADVANCED_SCORE',
        keptCardIds: fulfilledAdvancedCards,
        correctSingerIds,
        wordCount,
        songName: songName.trim() || undefined,
      });
    } else {
      dispatch({
        type: 'SCORE_TURN',
        wordCount,
        correctSingerIds,
        cardFulfilled,
        songName: songName.trim() || undefined,
      });
    }
  };

  const resetTurnState = () => {
    setWordCount(3);
    setCorrectSingerIds([]);
    setSongName('');
    setCardFulfilled(false);
    setFulfilledAdvancedCards([]);
    setStealSelections([]);
    setFulfilledStolenCards([]);
  };

  const nextTurn = () => {
    resetTurnState();
    setShowAnnouncement(true);
    dispatch({ type: 'NEXT_TURN' });
  };

  const skipTurn = () => {
    resetTurnState();
    setShowAnnouncement(true);
    dispatch({ type: 'SKIP_TURN' });
  };

  const lastTurnScore = game.scoreHistory[game.scoreHistory.length - 1];

  return (
    <div className="min-h-screen flex flex-col p-4 text-white pb-24">
      {/* Maestro announcement overlay */}
      {showAnnouncement && game.turnPhase === 'choose-action' && (
        <MaestroAnnouncement
          maestroName={maestro.name}
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
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="text-sm text-white/60 hover:text-white"
            title={isMuted ? t('app.soundOff') : t('app.soundOn')}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'scoreboard' })}
            className="text-sm text-white/60 hover:text-white underline"
          >
            {t('scoreboard.title')}
          </button>
        </div>
      </div>

      {/* Maestro display */}
      <div className="glass rounded-2xl p-5 mb-4 text-center animate-slide-up">
        <div className="text-sm text-white/50 mb-1">{t('game.maestro')}</div>
        <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
          {maestro.name}
        </div>
        <div className="text-xs text-white/40 mt-1">{maestro.score} {t('game.points')}</div>
      </div>

      {/* Maestro's held card */}
      {maestro.heldCard && game.turnPhase === 'choose-action' && (
        <div className={`rounded-2xl p-4 mb-4 ${
          maestro.heldCard.card.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
          maestro.heldCard.card.color === 'blue' ? 'card-gradient-blue text-white' :
          'card-gradient-red text-white'
        }`}>
          <div className="text-xs font-semibold mb-1">{t('game.heldCard')}</div>
          <div className="font-medium"><span dir="auto">{maestro.heldCard.card.instruction[lang]}</span></div>
          <div className="text-xs mt-1 opacity-75">
            {maestro.heldCard.roundsRemaining <= 1
              ? t('game.mustUseNow')
              : `${maestro.heldCard.roundsRemaining} ${t('game.roundsLeft')}`}
          </div>
          {maestro.heldCard.roundsRemaining <= 1 && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-black/20 text-xs font-semibold">
              ⚠️ {t('game.heldCardWarning')}
            </div>
          )}
        </div>
      )}

      {/* Cannot draw while holding warning */}
      {hasHeldCard && game.turnPhase === 'choose-action' && game.includeCards && (
        <div className="rounded-xl p-3 mb-4 bg-yellow-500/15 border border-yellow-400/30 text-yellow-200 text-sm text-center">
          💡 {t('game.cannotDrawWhileHolding')}
        </div>
      )}

      {/* Choose Action */}
      {game.turnPhase === 'choose-action' && (
        <div className="space-y-3 animate-slide-up">
          <p className="text-center text-white/60 mb-2">{t('game.chooseAction')}</p>

          <button
            onClick={() => dispatch({ type: 'SET_TURN_PHASE', phase: 'singing' })}
            className="btn-primary w-full text-lg py-4"
          >
            🎤 {t('game.iHaveASong')}
          </button>

          {game.includeCards && !hasHeldCard && (
            <>
              <button
                onClick={() => dispatch({ type: 'SET_TURN_PHASE', phase: 'draw-card' })}
                className="btn-secondary w-full"
              >
                💡 {t('game.drawCard')}
              </button>

              {!maestro.hasUsedAdvancedDraw && (
                <button onClick={doAdvancedDraw} className="btn-secondary w-full text-sm">
                  ⚡ {t('game.advancedDraw')}
                  <span className="block text-xs text-white/50">{t('game.advancedDrawDesc')}</span>
                </button>
              )}
            </>
          )}

          {game.includeCards && canSteal && (
            <button
              onClick={() => dispatch({ type: 'SET_TURN_PHASE', phase: 'steal-cards' })}
              className="btn-secondary w-full text-sm"
            >
              🕵️ {t('game.stealCards')}
              <span className="block text-xs text-white/50">{t('game.stealCardsDesc')}</span>
            </button>
          )}

          <button onClick={skipTurn} className="btn-secondary w-full opacity-60">
            ⏭ {t('game.skipTurn')}
          </button>
        </div>
      )}

      {/* Draw Card - choose difficulty */}
      {game.turnPhase === 'draw-card' && (
        <div className="space-y-3 animate-slide-up">
          <p className="text-center text-white/60 mb-2">{t('game.selectDifficulty')}</p>
          <div className="flex justify-center gap-3">
            {(['yellow', 'blue', 'red'] as CardColor[]).map((color) => (
              <button
                key={color}
                onClick={() => drawCard(color)}
                disabled={game.cardDecks[color].length === 0}
                className="relative w-24 rounded-2xl overflow-hidden transition-transform hover:scale-105 active:scale-95 disabled:opacity-30"
              >
                <img src={CARD_BACKS[color]} alt={color} className="w-full rounded-2xl" />
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 bg-gradient-to-t from-black/50 to-transparent rounded-2xl">
                  <div className="text-white font-bold text-sm">
                    {color === 'yellow' ? t('game.easy') : color === 'blue' ? t('game.medium') : t('game.hard')}
                  </div>
                  <div className="text-white/70 text-xs">
                    {color === 'yellow' ? '5' : color === 'blue' ? '20' : '50-100'} {t('game.points')}
                  </div>
                  <div className="text-white/50 text-xs">
                    ({game.cardDecks[color].length})
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_TURN_PHASE', phase: 'choose-action' })}
            className="btn-secondary w-full mt-2"
          >
            ← {t('rules.back')}
          </button>
        </div>
      )}

      {/* Active card display + singing */}
      {game.turnPhase === 'singing' && (
        <div className="space-y-4 animate-slide-up">
          {game.activeCard && (
            <div className={`rounded-2xl p-5 text-center animate-flip-card ${
              game.activeCard.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
              game.activeCard.color === 'blue' ? 'card-gradient-blue text-white' :
              'card-gradient-red text-white'
            }`}>
              <div className="text-xs font-semibold mb-2 uppercase opacity-75">
                {t('game.cardInstruction')}
              </div>
              <div className="text-lg font-bold" dir="auto">{game.activeCard.instruction[lang]}</div>
              <div className="text-sm mt-2 opacity-75">+{game.activeCard.bonusPoints} {t('game.points')}</div>
            </div>
          )}

          {game.pendingStolenCards && (
            <div className="space-y-2">
              <p className="text-center text-white/60 text-sm">{t('game.stealExplain')}</p>
              {game.pendingStolenCards.map((sel) => {
                const owner = game.players.find((p) => p.id === sel.fromPlayerId);
                return (
                  <div
                    key={sel.card.id}
                    className={`rounded-xl p-3 border border-purple-400/30 ${
                      sel.card.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
                      sel.card.color === 'blue' ? 'card-gradient-blue text-white' :
                      'card-gradient-red text-white'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1">🕵️ {owner?.name}</div>
                    <div className="font-bold text-sm" dir="auto">{sel.card.instruction[lang]}</div>
                    <div className="text-xs mt-1 opacity-75">+{sel.card.bonusPoints} {t('game.points')}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="glass rounded-2xl p-5">
            <div className="text-sm text-white/60 mb-2">{t('game.enterSongName')}</div>
            <input
              type="text"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            {isSongUsed && (
              <p className="text-red-400 text-sm mt-1">⚠️ {t('game.songUsed')}</p>
            )}
          </div>

          <button
            onClick={() => dispatch({ type: 'SET_TURN_PHASE', phase: 'judging' })}
            className="btn-primary w-full"
          >
            🎵 {t('game.wordCount')}
          </button>
        </div>
      )}

      {/* Advanced Draw -- show the 3 cards, then proceed to singing/judging */}
      {game.turnPhase === 'advanced-draw' && game.advancedDrawCards && (
        <div className="space-y-4 animate-slide-up">
          <p className="text-center text-white/60 mb-2">{t('game.advancedDrawExplain')}</p>
          {game.advancedDrawCards.map((card) => (
            <div
              key={card.id}
              className={`rounded-2xl p-4 text-center animate-flip-card ${
                card.color === 'yellow' ? 'card-gradient-yellow text-gray-900' :
                card.color === 'blue' ? 'card-gradient-blue text-white' :
                'card-gradient-red text-white'
              }`}
            >
              <div className="font-bold" dir="auto">{card.instruction[lang]}</div>
              <div className="text-sm mt-1 opacity-75">+{card.bonusPoints} {t('game.points')}</div>
            </div>
          ))}

          <div className="glass rounded-2xl p-5">
            <div className="text-sm text-white/60 mb-2">{t('game.enterSongName')}</div>
            <input
              type="text"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>

          <button
            onClick={() => dispatch({ type: 'SET_TURN_PHASE', phase: 'judging' })}
            className="btn-primary w-full"
          >
            🎵 {t('game.wordCount')}
          </button>
        </div>
      )}

      {/* Steal Cards -- select which cards to attempt stealing */}
      {game.turnPhase === 'steal-cards' && (
        <div className="space-y-4 animate-slide-up">
          <p className="text-center text-white/60 mb-2">{t('game.stealExplain')}</p>

          {playersWithCards.map((player) => (
            <div key={player.id} className="glass rounded-2xl p-4">
              <h4 className="font-semibold mb-3 text-white/80">{player.name}</h4>
              <div className="space-y-2">
                {player.fulfilledCards.map((card) => {
                  const isSelected = stealSelections.some((s) => s.card.id === card.id);
                  const otherFromSamePlayer = stealSelections.find(
                    (s) => s.fromPlayerId === player.id && s.card.id !== card.id
                  );
                  return (
                    <button
                      key={card.id}
                      onClick={() => toggleStealCard(player.id, card)}
                      className={`w-full rounded-xl p-3 text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-purple-500/30 ring-2 ring-purple-400'
                          : otherFromSamePlayer
                            ? 'bg-white/5 opacity-40'
                            : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm shrink-0 ${
                        isSelected
                          ? 'border-purple-400 bg-purple-400 text-white'
                          : 'border-white/30'
                      }`}>
                        {isSelected && '✓'}
                      </div>
                      <div className="flex-1">
                        <div dir="auto" className={`text-sm font-medium ${
                          card.color === 'yellow' ? 'text-yellow-300' :
                          card.color === 'blue' ? 'text-blue-300' :
                          'text-red-300'
                        }`}>
                          {card.instruction[lang]}
                        </div>
                        <div className="text-xs text-white/50">+{card.bonusPoints} {t('game.points')}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {stealSelections.length > 0 && new Set(stealSelections.map((s) => s.fromPlayerId)).size < 2 && (
            <p className="text-yellow-400/80 text-xs text-center">{t('game.stealMustBeDifferentPlayers')}</p>
          )}

          <button
            onClick={confirmStealSelection}
            disabled={new Set(stealSelections.map((s) => s.fromPlayerId)).size < 2}
            className={`btn-primary w-full text-lg py-4 ${
              new Set(stealSelections.map((s) => s.fromPlayerId)).size < 2
                ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            {t('game.confirmSteal')}
          </button>

          <button
            onClick={() => {
              setStealSelections([]);
              dispatch({ type: 'SET_TURN_PHASE', phase: 'choose-action' });
            }}
            className="btn-secondary w-full"
          >
            ← {t('game.skipSteal')}
          </button>
        </div>
      )}

      {/* Judging - word count + who got it right */}
      {game.turnPhase === 'judging' && (
        <div className="space-y-5 animate-slide-up">
          {/* Word count */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">{t('game.wordCount')}</h3>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setWordCount(Math.max(1, wordCount - 1))}
                className="w-12 h-12 rounded-full bg-white/10 text-2xl"
              >
                −
              </button>
              <div className="text-center">
                <span className="text-4xl font-bold">{wordCount > 10 ? '10+' : wordCount}</span>
                <div className="text-sm text-yellow-400 mt-1">
                  +{getMaestroWordBonus(wordCount)} {t('game.points')}
                </div>
              </div>
              <button
                onClick={() => setWordCount(Math.min(11, wordCount + 1))}
                className="w-12 h-12 rounded-full bg-white/10 text-2xl"
              >
                +
              </button>
            </div>
          </div>

          {/* Who got it right */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold mb-3">{t('game.whoGotItRight')}</h3>
            <div className="space-y-2">
              {backupSingers.map((singer) => (
                <button
                  key={singer.id}
                  onClick={() => toggleSinger(singer.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    correctSingerIds.includes(singer.id)
                      ? 'bg-green-500/30 ring-2 ring-green-400'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm ${
                    correctSingerIds.includes(singer.id) ? 'border-green-400 bg-green-400 text-white' : 'border-white/30'
                  }`}>
                    {correctSingerIds.includes(singer.id) && '✓'}
                  </div>
                  <span className="font-medium">{singer.name}</span>
                </button>
              ))}

              {/* Nobody Knew — full-width prominent button */}
              <button
                onClick={handleNobodyKnew}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all mt-2 ${
                  nobodyKnewActive
                    ? 'bg-orange-500/30 ring-2 ring-orange-400'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm ${
                  nobodyKnewActive ? 'border-orange-400 bg-orange-400 text-white' : 'border-white/30'
                }`}>
                  {nobodyKnewActive && '✗'}
                </div>
                <div>
                  <span className="font-medium">{t('game.nobodyKnew')}</span>
                  <span className="block text-xs text-white/50">{t('game.nobodyKnewDesc')}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Card fulfilled (single card draw) -- only available if at least one singer was correct */}
          {game.activeCard && !game.advancedDrawCards && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-2">{t('game.cardFulfilled')}</h3>
              {correctSingerIds.length === 0 ? (
                <p className="text-white/40 text-sm">{t('game.cardNeedsSinger')}</p>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setCardFulfilled(true)}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                      cardFulfilled ? 'bg-green-500/30 ring-2 ring-green-400' : 'bg-white/5'
                    }`}
                  >
                    {t('game.yes')}
                  </button>
                  <button
                    onClick={() => setCardFulfilled(false)}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                      !cardFulfilled ? 'bg-red-500/30 ring-2 ring-red-400' : 'bg-white/5'
                    }`}
                  >
                    {t('game.no')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Card fulfilled (advanced draw) -- ask per card, need at least 2 fulfilled */}
          {game.advancedDrawCards && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-3">{t('game.advancedFulfilledTitle')}</h3>
              {correctSingerIds.length === 0 ? (
                <p className="text-white/40 text-sm">{t('game.cardNeedsSinger')}</p>
              ) : (
                <div className="space-y-3">
                  {game.advancedDrawCards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => toggleAdvancedCardFulfilled(card.id)}
                      className={`w-full rounded-xl p-3 text-left transition-all flex items-center gap-3 ${
                        fulfilledAdvancedCards.includes(card.id)
                          ? 'bg-green-500/30 ring-2 ring-green-400'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm shrink-0 ${
                        fulfilledAdvancedCards.includes(card.id)
                          ? 'border-green-400 bg-green-400 text-white'
                          : 'border-white/30'
                      }`}>
                        {fulfilledAdvancedCards.includes(card.id) && '✓'}
                      </div>
                      <div className="flex-1">
                        <div dir="auto" className={`text-sm font-medium ${
                          card.color === 'yellow' ? 'text-yellow-300' :
                          card.color === 'blue' ? 'text-blue-300' :
                          'text-red-300'
                        }`}>
                          {card.instruction[lang]}
                        </div>
                        <div className="text-xs text-white/50">+{card.bonusPoints} {t('game.points')}</div>
                      </div>
                    </button>
                  ))}
                  {fulfilledAdvancedCards.length < 2 && fulfilledAdvancedCards.length > 0 && (
                    <p className="text-yellow-400/80 text-xs">{t('game.advancedNeedTwo')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Card fulfilled (stolen cards) -- ask per card, need at least 2 fulfilled */}
          {game.pendingStolenCards && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold mb-3">{t('game.stealFulfilled')}</h3>
              {correctSingerIds.length === 0 ? (
                <p className="text-white/40 text-sm">{t('game.cardNeedsSinger')}</p>
              ) : (
                <div className="space-y-3">
                  {game.pendingStolenCards.map((sel) => {
                    const owner = game.players.find((p) => p.id === sel.fromPlayerId);
                    return (
                      <button
                        key={sel.card.id}
                        onClick={() => toggleFulfilledStolen(sel.card.id)}
                        className={`w-full rounded-xl p-3 text-left transition-all flex items-center gap-3 ${
                          fulfilledStolenCards.includes(sel.card.id)
                            ? 'bg-purple-500/30 ring-2 ring-purple-400'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm shrink-0 ${
                          fulfilledStolenCards.includes(sel.card.id)
                            ? 'border-purple-400 bg-purple-400 text-white'
                            : 'border-white/30'
                        }`}>
                          {fulfilledStolenCards.includes(sel.card.id) && '✓'}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-white/50 mb-1">🕵️ {owner?.name}</div>
                          <div dir="auto" className={`text-sm font-medium ${
                            sel.card.color === 'yellow' ? 'text-yellow-300' :
                            sel.card.color === 'blue' ? 'text-blue-300' :
                            'text-red-300'
                          }`}>
                            {sel.card.instruction[lang]}
                          </div>
                          <div className="text-xs text-white/50">+{sel.card.bonusPoints} {t('game.points')}</div>
                        </div>
                      </button>
                    );
                  })}
                  {fulfilledStolenCards.length < 2 && fulfilledStolenCards.length > 0 && (
                    <p className="text-yellow-400/80 text-xs">{t('game.stealNeedTwo')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {(() => {
            const advancedBlocked = game.advancedDrawCards && correctSingerIds.length > 0 && fulfilledAdvancedCards.length < 2;
            const stealBlocked = game.pendingStolenCards && correctSingerIds.length > 0 && fulfilledStolenCards.length < 2;
            const isDisabled = advancedBlocked || stealBlocked;
            return (
              <button
                onClick={scoreTurn}
                disabled={!!isDisabled}
                className={`btn-primary w-full text-lg py-4 ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {t('game.confirmScoring')}
              </button>
            );
          })()}
        </div>
      )}

      {/* Turn Summary */}
      {game.turnPhase === 'summary' && lastTurnScore && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass rounded-2xl p-5 text-center">
            <h3 className="text-xl font-bold mb-4">{t('game.turnSummary')}</h3>

            {lastTurnScore.maestroBasePoints + lastTurnScore.maestroWordBonus + lastTurnScore.maestroCardBonus > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-4">
                  <span className="text-white/70">{t('game.maestroPoints')}</span>
                  <span className="text-lg font-bold text-green-400 animate-count-up">
                    +{lastTurnScore.maestroBasePoints}
                  </span>
                </div>
                {lastTurnScore.maestroWordBonus > 0 && (
                  <div className="flex justify-between items-center px-4">
                    <span className="text-white/70">{t('game.maestroBonus')}</span>
                    <span className="text-lg font-bold text-yellow-400 animate-count-up">
                      +{lastTurnScore.maestroWordBonus}
                    </span>
                  </div>
                )}
                {lastTurnScore.maestroCardBonus > 0 && (
                  <div className="flex justify-between items-center px-4">
                    <span className="text-white/70">{t('game.cardBonus')}</span>
                    <span className="text-lg font-bold text-purple-400 animate-count-up">
                      +{lastTurnScore.maestroCardBonus}
                    </span>
                  </div>
                )}
                {lastTurnScore.singerScores.length > 0 && (
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <div className="text-sm text-white/50 mb-2">{t('game.singerPoints')}</div>
                    {lastTurnScore.singerScores.map((ss) => {
                      const player = game.players.find((p) => p.id === ss.playerId);
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

          <button onClick={nextTurn} className="btn-primary w-full text-lg py-4">
            {t('game.nextTurn')} →
          </button>
        </div>
      )}

      {/* Backup singers bar */}
      {game.turnPhase !== 'summary' && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-lg border-t border-white/10 p-3">
          <div className="flex gap-2 overflow-x-auto px-2">
            {backupSingers.map((singer) => (
              <div
                key={singer.id}
                className="shrink-0 text-center px-3 py-2 rounded-xl bg-white/5"
              >
                <div className="text-xs text-white/60">{singer.name}</div>
                <div className="text-sm font-bold">{singer.score}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
