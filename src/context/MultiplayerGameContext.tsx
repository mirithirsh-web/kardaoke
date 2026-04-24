import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { roomRef, set, get, onValue, update } from '../firebase';
import { useRoom } from './RoomContext';
import { createDecks, drawCompatibleTriple } from '../data/cards';
import { getMaestroWordBonus } from '../utils/scoring';

function sanitize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
import type {
  InspirationCard, CardColor, TurnPhase, TurnScore,
  MultiplayerGameState, MultiplayerScores, JudgingState,
  RoomPlayer, StolenCardSelection, HeldCard,
} from '../types';

type CardDecks = { yellow: InspirationCard[]; blue: InspirationCard[]; red: InspirationCard[] };

/** Push active / advanced-draw cards back onto piles (not stolen refs). Skips activeCard when it is the maestro's held card (same id). */
async function appendInPlayCardsBackToDecks(
  roomCode: string,
  g: MultiplayerGameState,
  decks: CardDecks,
  maestroHeld: HeldCard | null | undefined,
  keepColoredCardAsHeld = false,
): Promise<{ hadAdvancedDraw: boolean; heldCardFromSkip: InspirationCard | null }> {
  const newDecks: CardDecks = {
    yellow: [...(decks.yellow || [])],
    blue: [...(decks.blue || [])],
    red: [...(decks.red || [])],
  };
  let hadAdvancedDraw = false;
  let heldCardFromSkip: InspirationCard | null = null;
  if (g.advancedDrawCards?.length) {
    hadAdvancedDraw = true;
    for (const card of g.advancedDrawCards) {
      newDecks[card.color] = [...newDecks[card.color], card];
    }
  }
  if (g.activeCard) {
    const fromHeld = maestroHeld?.card && g.activeCard.id === maestroHeld.card.id;
    if (!fromHeld) {
      if (keepColoredCardAsHeld && (g.activeCard.color === 'blue' || g.activeCard.color === 'red')) {
        heldCardFromSkip = g.activeCard;
      } else {
        const c = g.activeCard.color;
        newDecks[c] = [...newDecks[c], g.activeCard];
      }
    }
  }
  await set(roomRef(roomCode, 'cardDecks'), sanitize(newDecks));
  return { hadAdvancedDraw, heldCardFromSkip };
}

interface ConfirmScoreArgs {
  cardFulfilled: boolean;
  fulfilledAdvancedCardIds: string[];
  fulfilledStolenCardIds: string[];
  songName?: string;
}

interface MPGameContextType {
  gameState: MultiplayerGameState | null;
  scores: MultiplayerScores;
  judging: JudgingState | null;
  privateCard: InspirationCard | null;
  players: RoomPlayer[];
  myUid: string | null;
  isMaestro: boolean;
  maestroUid: string | null;
  maestroName: string;

  initGame: () => Promise<void>;
  setTurnPhase: (phase: TurnPhase) => Promise<void>;
  drawCard: (color: CardColor) => Promise<void>;
  doAdvancedDraw: () => Promise<void>;
  startSinging: (songName?: string) => Promise<void>;
  startJudging: (wordCount: number) => Promise<void>;
  reportGotItRight: (didGetIt: boolean) => Promise<void>;
  revealCard: (card: InspirationCard | null) => Promise<void>;
  confirmScore: (args: ConfirmScoreArgs) => Promise<void>;
  selectStealCards: (selections: StolenCardSelection[]) => Promise<void>;
  abandonCurrentPlay: () => Promise<void>;
  nextTurn: () => Promise<void>;
  skipTurn: () => Promise<void>;
}

const MPGameContext = createContext<MPGameContextType>({} as MPGameContextType);

export function MultiplayerGameProvider({ children }: { children: ReactNode }) {
  const { roomCode, myUid, players, settings } = useRoom();
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [scores, setScores] = useState<MultiplayerScores>({});
  const [judging, setJudging] = useState<JudgingState | null>(null);
  const [privateCard, setPrivateCard] = useState<InspirationCard | null>(null);
  const [localDecks, setLocalDecks] = useState<{ yellow: InspirationCard[]; blue: InspirationCard[]; red: InspirationCard[] } | null>(null);

  const sortedPlayers = [...players].sort((a, b) => a.order - b.order);
  const maestroUid = gameState && sortedPlayers.length > 0
    ? sortedPlayers[gameState.currentMaestroIndex % sortedPlayers.length]?.uid
    : null;
  const isMaestro = !!myUid && myUid === maestroUid;
  const maestroName = sortedPlayers.find(p => p.uid === maestroUid)?.name || '';

  // Subscribe to game state
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(roomRef(roomCode, 'game'), (snap) => {
      if (snap.exists()) setGameState(snap.val());
    });
    return unsub;
  }, [roomCode]);

  // Subscribe to scores
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(roomRef(roomCode, 'scores'), (snap) => {
      if (snap.exists()) setScores(snap.val());
      else setScores({});
    });
    return unsub;
  }, [roomCode]);

  // Subscribe to judging
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(roomRef(roomCode, 'judging'), (snap) => {
      if (snap.exists()) setJudging(snap.val());
      else setJudging(null);
    });
    return unsub;
  }, [roomCode]);

  // Subscribe to private card (only maestro reads their own)
  useEffect(() => {
    if (!roomCode || !myUid) return;
    const unsub = onValue(roomRef(roomCode, 'privateCard', myUid), (snap) => {
      if (snap.exists()) setPrivateCard(snap.val());
      else setPrivateCard(null);
    });
    return unsub;
  }, [roomCode, myUid]);

  // Load decks when becoming maestro
  useEffect(() => {
    if (!isMaestro || !roomCode) return;
    const unsub = onValue(roomRef(roomCode, 'cardDecks'), (snap) => {
      if (snap.exists()) setLocalDecks(snap.val());
    });
    return unsub;
  }, [isMaestro, roomCode]);

  const initGame = useCallback(async () => {
    if (!roomCode || !settings) return;
    const decks = createDecks(settings.selectedPacks || []);

    const initialScores: MultiplayerScores = {};
    for (const p of sortedPlayers) {
      initialScores[p.uid] = {
        score: 0, basePoints: 0, bonusPoints: 0, cardPoints: 0,
        fulfilledCards: [], heldCard: null, hasUsedAdvancedDraw: false,
      };
    }

    const timeLimit = settings.turnTimeLimit || 0;
    const game: MultiplayerGameState = {
      currentMaestroIndex: 0,
      currentRound: 1,
      totalRounds: settings.rounds,
      turnPhase: 'choose-action',
      turnsPlayedThisRound: 0,
      usedSongs: [],
      scoreHistory: [],
      includeCards: settings.includeCards,
      allowStealing: settings.allowStealing,
      publicCard: null,
      activeCard: null,
      revealedCard: null,
      advancedDrawCards: null,
      pendingStolenCards: null,
      turnDeadline: timeLimit > 0 ? Date.now() + timeLimit * 1000 : null,
    };

    await update(roomRef(roomCode), {
      game,
      scores: initialScores,
      cardDecks: decks,
      judging: null,
      privateCard: null,
    });
  }, [roomCode, settings, sortedPlayers]);

  const setTurnPhase = useCallback(async (phase: TurnPhase) => {
    if (!roomCode || !isMaestro || !gameState) return;

    // When maestro picks "singing" with a held card, set it as active
    if (phase === 'singing' && gameState.turnPhase === 'choose-action') {
      const myScores = scores[myUid!];
      if (myScores?.heldCard && !gameState.activeCard) {
        const card = myScores.heldCard.card;
        await update(roomRef(roomCode, 'game'), {
          turnPhase: 'singing',
          activeCard: card,
          publicCard: { color: card.color, bonusPoints: card.bonusPoints },
        });
        await set(roomRef(roomCode, 'privateCard', myUid!), card);
        return;
      }
    }

    await set(roomRef(roomCode, 'game', 'turnPhase'), phase);
  }, [roomCode, isMaestro, gameState, scores, myUid]);

  const drawCard = useCallback(async (color: CardColor) => {
    if (!roomCode || !isMaestro || !localDecks) return;
    const deck = [...localDecks[color]];
    if (deck.length === 0) return;
    const card = deck.shift()!;

    const newDecks = { ...localDecks, [color]: deck };
    await set(roomRef(roomCode, 'cardDecks'), newDecks);
    await set(roomRef(roomCode, 'privateCard', myUid!), card);
    await update(roomRef(roomCode, 'game'), {
      activeCard: card,
      publicCard: { color: card.color, bonusPoints: card.bonusPoints },
      turnPhase: 'singing',
      hasDrawnCardThisTurn: true,
    });
    setLocalDecks(newDecks);
  }, [roomCode, isMaestro, localDecks, myUid]);

  const doAdvancedDraw = useCallback(async () => {
    if (!roomCode || !isMaestro || !localDecks) return;
    const { cards, updatedDecks } = drawCompatibleTriple(localDecks);

    await set(roomRef(roomCode, 'cardDecks'), updatedDecks);
    await update(roomRef(roomCode, 'game'), {
      advancedDrawCards: cards,
      turnPhase: 'advanced-draw',
    });

    // Mark as used
    await set(roomRef(roomCode, 'scores', myUid!, 'hasUsedAdvancedDraw'), true);
    setLocalDecks(updatedDecks);
  }, [roomCode, isMaestro, localDecks, myUid]);

  const startSinging = useCallback(async (songName?: string) => {
    if (!roomCode || !isMaestro) return;
    if (songName) {
      const current = gameState?.usedSongs || [];
      await set(roomRef(roomCode, 'game', 'usedSongs'), [...current, songName.toLowerCase().trim()]);
    }
    await set(roomRef(roomCode, 'game', 'turnPhase'), 'singing');
  }, [roomCode, isMaestro, gameState]);

  const startJudging = useCallback(async (wordCount: number) => {
    if (!roomCode || !isMaestro) return;
    await set(roomRef(roomCode, 'judging'), { wordCount, singerResponses: {} });
    await update(roomRef(roomCode, 'game'), { turnPhase: 'judging', turnDeadline: null });
  }, [roomCode, isMaestro]);

  const reportGotItRight = useCallback(async (didGetIt: boolean) => {
    if (!roomCode || !myUid) return;
    await set(roomRef(roomCode, 'judging', 'singerResponses', myUid), didGetIt);
  }, [roomCode, myUid]);

  const revealCard = useCallback(async (card: InspirationCard | null) => {
    if (!roomCode || !isMaestro) return;
    await set(roomRef(roomCode, 'game', 'revealedCard'), card ? sanitize(card) : null);
  }, [roomCode, isMaestro]);

  const abandonCurrentPlay = useCallback(async () => {
    if (!roomCode || !isMaestro || !myUid) return;
    const [gameSnap, scoresSnap, decksSnap] = await Promise.all([
      get(roomRef(roomCode, 'game')),
      get(roomRef(roomCode, 'scores')),
      get(roomRef(roomCode, 'cardDecks')),
    ]);
    const g: MultiplayerGameState | null = gameSnap.val();
    const sc: MultiplayerScores = scoresSnap.val() || {};
    const decks = decksSnap.val() as CardDecks | null;
    if (!g) return;

    const phase = g.turnPhase;
    const hasInPlay = !!(g.activeCard || g.advancedDrawCards?.length || g.pendingStolenCards?.length);
    if (!hasInPlay) return;
    if (phase !== 'singing' && phase !== 'advanced-draw') return;

    const myHeld = sc[myUid]?.heldCard;
    if (g.advancedDrawCards?.length || g.activeCard) {
      const safeDecks: CardDecks = decks || { yellow: [], blue: [], red: [] };
      await appendInPlayCardsBackToDecks(roomCode, g, safeDecks, myHeld);
    }

    await update(roomRef(roomCode, 'game'), sanitize({
      turnPhase: 'choose-action',
      activeCard: null,
      publicCard: null,
      revealedCard: null,
      advancedDrawCards: null,
      pendingStolenCards: null,
    }));
    await set(roomRef(roomCode, 'privateCard', myUid), null);
    await set(roomRef(roomCode, 'judging'), null);
  }, [roomCode, isMaestro, myUid]);

  const confirmScore = useCallback(async ({ cardFulfilled, fulfilledAdvancedCardIds, fulfilledStolenCardIds, songName }: ConfirmScoreArgs) => {
    console.log('[confirmScore] called', { roomCode, myUid });
    if (!roomCode || !myUid) {
      throw new Error(`Missing: roomCode=${!!roomCode}, myUid=${!!myUid}`);
    }

    const [gameSnap, judgingSnap, scoresSnap, decksSnap] = await Promise.all([
      get(roomRef(roomCode, 'game')),
      get(roomRef(roomCode, 'judging')),
      get(roomRef(roomCode, 'scores')),
      get(roomRef(roomCode, 'cardDecks')),
    ]);
    const g: MultiplayerGameState | null = gameSnap.val();
    const j: JudgingState | null = judgingSnap.val();
    const sc: MultiplayerScores = scoresSnap.val() || {};
    const decks = decksSnap.val();

    console.log('[confirmScore] Firebase read', { hasGame: !!g, hasJudging: !!j, phase: g?.turnPhase, hasAdvanced: !!g?.advancedDrawCards, hasStolen: !!g?.pendingStolenCards });
    if (!g || !j) {
      throw new Error(`Firebase data missing: game=${!!g}, judging=${!!j}`);
    }

    const responses = j.singerResponses || {};
    const correctUids = Object.entries(responses).filter(([, v]) => v).map(([k]) => k);
    const correctCount = correctUids.length;
    const maestroBase = correctCount * 10;
    const wordBonus = correctCount > 0 ? getMaestroWordBonus(j.wordCount) : 0;

    const isAdvanced = !!(g.advancedDrawCards && g.advancedDrawCards.length > 0);
    const isSteal = !!(g.pendingStolenCards && g.pendingStolenCards.length > 0);
    let cardBonus = 0;
    let effectiveStolenSels: { fromPlayerId: string; card: InspirationCard }[] = [];
    const gameUpdates: Record<string, unknown> = {
      turnPhase: 'summary',
      activeCard: null,
      publicCard: null,
      revealedCard: null,
    };
    const rawScore = sc[myUid] || {};
    const myScore = {
      score: rawScore.score ?? 0,
      basePoints: rawScore.basePoints ?? 0,
      bonusPoints: rawScore.bonusPoints ?? 0,
      cardPoints: rawScore.cardPoints ?? 0,
      fulfilledCards: rawScore.fulfilledCards ?? [],
      heldCard: rawScore.heldCard ?? null,
      hasUsedAdvancedDraw: rawScore.hasUsedAdvancedDraw ?? false,
    };
    let newFulfilledCards = [...myScore.fulfilledCards];
    let newHeld: typeof myScore.heldCard = myScore.heldCard;

    if (isSteal) {
      // --- Steal path ---
      const pending = g.pendingStolenCards || [];
      const fulfilledSels = correctCount > 0 ? pending.filter(s => fulfilledStolenCardIds.includes(s.card.id)) : [];
      const fulfilledOwners = new Set(fulfilledSels.map(s => s.fromPlayerId)).size;
      const stealSucceeded = fulfilledOwners >= 2;
      effectiveStolenSels = stealSucceeded ? fulfilledSels : [];

      cardBonus = effectiveStolenSels.reduce((sum, s) => sum + s.card.bonusPoints, 0);
      const stolenCards = effectiveStolenSels.map(s => s.card);
      newFulfilledCards = [...newFulfilledCards, ...stolenCards];

      for (const sel of effectiveStolenSels) {
        const victimScore = sc[sel.fromPlayerId];
        if (victimScore) {
          await update(roomRef(roomCode, 'scores', sel.fromPlayerId), sanitize({
            fulfilledCards: (victimScore.fulfilledCards || []).filter((c: InspirationCard) => c.id !== sel.card.id),
            cardPoints: (victimScore.cardPoints ?? 0) - sel.card.bonusPoints,
          }));
        }
      }
      gameUpdates.pendingStolenCards = null;
    } else if (isAdvanced) {
      // --- Advanced draw path ---
      const allCards = g.advancedDrawCards!;
      const keptCards = correctCount > 0 ? allCards.filter(c => fulfilledAdvancedCardIds.includes(c.id)) : [];
      const discarded = allCards.filter(c => !keptCards.some(k => k.id === c.id));
      cardBonus = keptCards.reduce((s, c) => s + c.bonusPoints, 0);
      newFulfilledCards = [...newFulfilledCards, ...keptCards];

      if (decks) {
        const newDecks = { ...decks };
        for (const card of discarded) {
          newDecks[card.color] = [...(newDecks[card.color] || []), card];
        }
        await set(roomRef(roomCode, 'cardDecks'), sanitize(newDecks));
      }
      gameUpdates.advancedDrawCards = null;
    } else {
      // --- Normal single-card path ---
      const card = g.activeCard;
      const cardActuallyFulfilled = cardFulfilled && correctCount > 0 && !!card;
      cardBonus = cardActuallyFulfilled && card ? card.bonusPoints : 0;

      if (cardActuallyFulfilled && card) {
        newFulfilledCards = [...newFulfilledCards, card];
      }

      if (card && !cardActuallyFulfilled) {
        if (card.color === 'yellow') {
          if (decks) {
            await set(roomRef(roomCode, 'cardDecks'), sanitize({ ...decks, yellow: [...(decks.yellow || []), card] }));
          }
        } else if (!myScore.heldCard) {
          newHeld = { card, roundsRemaining: 2, fulfilled: false };
        } else if (decks) {
          await set(roomRef(roomCode, 'cardDecks'), sanitize({ ...decks, [card.color]: [...(decks[card.color] || []), card] }));
        }
      }
      if (cardActuallyFulfilled && myScore.heldCard && card && myScore.heldCard.card.id === card.id) {
        newHeld = null;
      }
    }

    // Update maestro scores
    await update(roomRef(roomCode, 'scores', myUid), sanitize({
      score: myScore.score + maestroBase + wordBonus,
      basePoints: myScore.basePoints + maestroBase,
      bonusPoints: myScore.bonusPoints + wordBonus,
      cardPoints: myScore.cardPoints + cardBonus,
      fulfilledCards: newFulfilledCards,
      heldCard: newHeld,
    }));

    // Update singer scores
    for (const uid of correctUids) {
      if (uid === myUid) continue;
      const s = sc[uid];
      if (s) {
        await update(roomRef(roomCode, 'scores', uid), { score: (s.score ?? 0) + 15, basePoints: (s.basePoints ?? 0) + 15 });
      }
    }

    // Build turn summary
    const turnScore: TurnScore = {
      round: g.currentRound, maestroId: myUid,
      maestroBasePoints: maestroBase, maestroWordBonus: wordBonus, maestroCardBonus: cardBonus,
      singerScores: correctUids.filter(id => id !== myUid).map(id => ({ playerId: id, points: 15 })),
      ...(songName ? { songName } : {}),
      ...(isSteal && effectiveStolenSels.length > 0 ? {
        stolenCards: effectiveStolenSels
          .map(s => ({ fromPlayerId: s.fromPlayerId, cardColor: s.card.color, cardPoints: s.card.bonusPoints })),
      } : {}),
    };
    gameUpdates.scoreHistory = [...(g.scoreHistory || []), turnScore];
    if (songName) {
      gameUpdates.usedSongs = [...(g.usedSongs || []), songName.toLowerCase().trim()];
    }

    console.log('[confirmScore] writing game updates', Object.keys(gameUpdates));
    await update(roomRef(roomCode, 'game'), sanitize(gameUpdates));
    await set(roomRef(roomCode, 'privateCard', myUid), null);
    console.log('[confirmScore] done');
  }, [roomCode, myUid]);

  const selectStealCards = useCallback(async (selections: StolenCardSelection[]) => {
    if (!roomCode) return;
    await update(roomRef(roomCode, 'game'), {
      pendingStolenCards: selections,
      turnPhase: 'singing',
    });
  }, [roomCode]);

  const nextTurn = useCallback(async () => {
    if (!roomCode) return;

    const [gameSnap, scoresSnap, playersSnap] = await Promise.all([
      get(roomRef(roomCode, 'game')),
      get(roomRef(roomCode, 'scores')),
      get(roomRef(roomCode, 'players')),
    ]);
    const freshGame: MultiplayerGameState | null = gameSnap.val();
    const freshScores: MultiplayerScores = scoresSnap.val() || {};
    const freshPlayersRaw = playersSnap.val() || {};
    const freshPlayers: RoomPlayer[] = Object.entries(freshPlayersRaw)
      .map(([uid, data]) => ({ uid, ...(data as Omit<RoomPlayer, 'uid'>) }))
      .sort((a, b) => a.order - b.order);

    if (!freshGame) return;

    const numPlayers = freshPlayers.length;
    const turnsPlayed = freshGame.turnsPlayedThisRound + 1;
    const roundComplete = turnsPlayed >= numPlayers;
    const newRound = roundComplete ? freshGame.currentRound + 1 : freshGame.currentRound;
    const gameOver = newRound > freshGame.totalRounds;

    if (roundComplete) {
      for (const p of freshPlayers) {
        const s = freshScores[p.uid];
        if (s?.heldCard) {
          const remaining = s.heldCard.roundsRemaining - 1;
          if (remaining <= 0) {
            await set(roomRef(roomCode, 'scores', p.uid, 'heldCard'), null);
          } else {
            await update(roomRef(roomCode, 'scores', p.uid, 'heldCard'), { roundsRemaining: remaining });
          }
        }
      }
    }

    if (gameOver) {
      for (const p of freshPlayers) {
        const s = freshScores[p.uid];
        if (s && s.cardPoints > 0) {
          await set(roomRef(roomCode, 'scores', p.uid, 'score'), s.score + s.cardPoints);
        }
      }
      await set(roomRef(roomCode, 'game', 'turnPhase'), 'summary');
      await set(roomRef(roomCode, 'status'), 'finished');
      return;
    }

    const nextMaestro = (freshGame.currentMaestroIndex + 1) % numPlayers;
    const ntTimeLimit = settings?.turnTimeLimit || 0;
    await update(roomRef(roomCode, 'game'), {
      currentMaestroIndex: nextMaestro,
      currentRound: newRound,
      turnPhase: 'choose-action',
      activeCard: null,
      advancedDrawCards: null,
      pendingStolenCards: null,
      publicCard: null,
      revealedCard: null,
      turnsPlayedThisRound: roundComplete ? 0 : turnsPlayed,
      hasDrawnCardThisTurn: false,
      turnDeadline: ntTimeLimit > 0 ? Date.now() + ntTimeLimit * 1000 : null,
    });
    await set(roomRef(roomCode, 'judging'), null);
    for (const p of freshPlayers) {
      await set(roomRef(roomCode, 'privateCard', p.uid), null);
    }
  }, [roomCode, settings]);

  const skipTurn = useCallback(async () => {
    if (!roomCode) return;

    const [gameSnap, scoresSnap, playersSnap, decksSnap] = await Promise.all([
      get(roomRef(roomCode, 'game')),
      get(roomRef(roomCode, 'scores')),
      get(roomRef(roomCode, 'players')),
      get(roomRef(roomCode, 'cardDecks')),
    ]);
    const freshGame: MultiplayerGameState | null = gameSnap.val();
    const freshScores: MultiplayerScores = scoresSnap.val() || {};
    const freshPlayersRaw = playersSnap.val() || {};
    const freshPlayers: RoomPlayer[] = Object.entries(freshPlayersRaw)
      .map(([uid, data]) => ({ uid, ...(data as Omit<RoomPlayer, 'uid'>) }))
      .sort((a, b) => a.order - b.order);
    const decks = decksSnap.val() as CardDecks | null;

    if (!freshGame) return;

    const numPlayers = freshPlayers.length;
    const skipMaestroUid = numPlayers > 0
      ? freshPlayers[freshGame.currentMaestroIndex % numPlayers]?.uid
      : null;
    const hasDrawnToReturn = !!(freshGame.activeCard || freshGame.advancedDrawCards?.length);
    if (hasDrawnToReturn && skipMaestroUid) {
      const mHeld = freshScores[skipMaestroUid]?.heldCard;
      const safeDecks: CardDecks = decks || { yellow: [], blue: [], red: [] };
      const { heldCardFromSkip } = await appendInPlayCardsBackToDecks(roomCode, freshGame, safeDecks, mHeld, true);
      if (heldCardFromSkip) {
        await set(roomRef(roomCode, 'scores', skipMaestroUid, 'heldCard'), sanitize({ card: heldCardFromSkip, roundsRemaining: 2, fulfilled: false }));
      }
    }

    const turnsPlayed = freshGame.turnsPlayedThisRound + 1;
    const roundComplete = turnsPlayed >= numPlayers;
    const newRound = roundComplete ? freshGame.currentRound + 1 : freshGame.currentRound;
    const gameOver = newRound > freshGame.totalRounds;

    if (roundComplete) {
      for (const p of freshPlayers) {
        const s = freshScores[p.uid];
        if (s?.heldCard) {
          const remaining = s.heldCard.roundsRemaining - 1;
          if (remaining <= 0) {
            await set(roomRef(roomCode, 'scores', p.uid, 'heldCard'), null);
          } else {
            await update(roomRef(roomCode, 'scores', p.uid, 'heldCard'), { roundsRemaining: remaining });
          }
        }
      }
    }

    if (gameOver) {
      for (const p of freshPlayers) {
        const s = freshScores[p.uid];
        if (s && s.cardPoints > 0) {
          await set(roomRef(roomCode, 'scores', p.uid, 'score'), s.score + s.cardPoints);
        }
      }
      await set(roomRef(roomCode, 'game', 'turnPhase'), 'summary');
      await set(roomRef(roomCode, 'status'), 'finished');
      return;
    }

    const nextMaestro = (freshGame.currentMaestroIndex + 1) % numPlayers;
    const stTimeLimit = settings?.turnTimeLimit || 0;
    await update(roomRef(roomCode, 'game'), {
      currentMaestroIndex: nextMaestro,
      currentRound: newRound,
      turnPhase: 'choose-action',
      activeCard: null,
      advancedDrawCards: null,
      pendingStolenCards: null,
      publicCard: null,
      revealedCard: null,
      turnsPlayedThisRound: roundComplete ? 0 : turnsPlayed,
      hasDrawnCardThisTurn: false,
      turnDeadline: stTimeLimit > 0 ? Date.now() + stTimeLimit * 1000 : null,
    });
    await set(roomRef(roomCode, 'judging'), null);
  }, [roomCode, settings]);

  return (
    <MPGameContext.Provider value={{
      gameState, scores, judging, privateCard, players: sortedPlayers,
      myUid, isMaestro, maestroUid, maestroName,
      initGame, setTurnPhase, drawCard, doAdvancedDraw, startSinging, startJudging,
      reportGotItRight, revealCard, confirmScore, selectStealCards, abandonCurrentPlay,
      nextTurn, skipTurn,
    }}>
      {children}
    </MPGameContext.Provider>
  );
}

export function useMultiplayerGame() {
  return useContext(MPGameContext);
}
