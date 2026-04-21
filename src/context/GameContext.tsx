import { createContext, useContext, useReducer, useEffect, useMemo, type ReactNode } from 'react';
import type { GameState, Player, Screen, TurnPhase, InspirationCard, StolenCardSelection } from '../types';
import { createDecks, drawCompatibleTriple } from '../data/cards';

const STORAGE_KEY = 'kardaoke-game';

interface AppState {
  screen: Screen;
  game: GameState | null;
}

type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'START_GAME'; players: string[]; rounds: number; includeCards: boolean; allowStealing: boolean; locale: string; selectedPacks?: string[] }
  | { type: 'SET_TURN_PHASE'; phase: TurnPhase }
  | { type: 'DRAW_CARD'; card: InspirationCard; deckColor: 'yellow' | 'blue' | 'red' }
  | { type: 'SET_ACTIVE_CARD'; card: InspirationCard | null }
  | { type: 'ADVANCED_DRAW' }
  | { type: 'SCORE_TURN'; wordCount: number; correctSingerIds: string[]; cardFulfilled: boolean; songName?: string }
  | { type: 'ADVANCED_SCORE'; keptCardIds: string[]; correctSingerIds: string[]; wordCount: number; songName?: string }
  | { type: 'SELECT_STEAL_CARDS'; selections: StolenCardSelection[] }
  | { type: 'STEAL_SCORE'; fulfilledCardIds: string[]; correctSingerIds: string[]; wordCount: number; songName?: string }
  | { type: 'NEXT_TURN' }
  | { type: 'SKIP_TURN' }
  | { type: 'ABANDON_TURN' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESET_GAME' };

function createPlayer(name: string, index: number): Player {
  return {
    id: `p${index}`,
    name,
    score: 0,
    basePoints: 0,
    bonusPoints: 0,
    cardPoints: 0,
    heldCard: null,
    fulfilledCards: [],
    hasUsedAdvancedDraw: false,
  };
}

function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function saveGame(game: GameState | null) {
  if (game) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function getMaestroWordBonus(wordCount: number): number {
  if (wordCount <= 0 || wordCount > 10) return 0;
  return 110 - wordCount * 10;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'START_GAME': {
      const players = action.players.map((name, i) => createPlayer(name, i));
      const game: GameState = {
        players,
        currentMaestroIndex: 0,
        currentRound: 1,
        totalRounds: action.rounds,
        turnPhase: 'choose-action',
        usedSongs: [],
        cardDecks: createDecks(action.selectedPacks || []),
        includeCards: action.includeCards,
        allowStealing: action.allowStealing,
        scoreHistory: [],
        locale: action.locale,
        activeCard: null,
        advancedDrawCards: null,
        pendingStolenCards: null,
        turnsPlayedThisRound: 0,
        hasDrawnCardThisTurn: false,
      };
      return { screen: 'play', game };
    }

    case 'SET_TURN_PHASE': {
      if (!state.game) return state;
      const g2 = state.game;
      // When maestro picks "singing" with a held card, make it the active card
      if (action.phase === 'singing' && g2.turnPhase === 'choose-action') {
        const m = g2.players[g2.currentMaestroIndex];
        if (m.heldCard && !g2.activeCard) {
          return { ...state, game: { ...g2, turnPhase: 'singing', activeCard: m.heldCard.card } };
        }
      }
      return { ...state, game: { ...g2, turnPhase: action.phase } };
    }

    case 'DRAW_CARD': {
      if (!state.game) return state;
      const deck = [...state.game.cardDecks[action.deckColor]];
      deck.shift();
      return {
        ...state,
        game: {
          ...state.game,
          activeCard: action.card,
          cardDecks: { ...state.game.cardDecks, [action.deckColor]: deck },
          turnPhase: 'singing',
          hasDrawnCardThisTurn: true,
        },
      };
    }

    case 'SET_ACTIVE_CARD':
      if (!state.game) return state;
      return { ...state, game: { ...state.game, activeCard: action.card } };

    case 'ADVANCED_DRAW': {
      if (!state.game) return state;
      const { cards: drawnCards, updatedDecks } = drawCompatibleTriple(state.game.cardDecks);
      const players = state.game.players.map((p, i) =>
        i === state.game!.currentMaestroIndex ? { ...p, hasUsedAdvancedDraw: true } : p
      );
      return {
        ...state,
        game: {
          ...state.game,
          advancedDrawCards: drawnCards,
          cardDecks: updatedDecks,
          players,
          turnPhase: 'advanced-draw',
        },
      };
    }

    case 'SCORE_TURN': {
      if (!state.game) return state;
      const g = state.game;
      const maestro = g.players[g.currentMaestroIndex];
      const correctCount = action.correctSingerIds.length;
      const maestroBase = correctCount * 10;
      const wordBonus = correctCount > 0 ? getMaestroWordBonus(action.wordCount) : 0;

      const cardActuallyFulfilled = action.cardFulfilled && correctCount > 0 && !!g.activeCard;

      const cardBonus = cardActuallyFulfilled ? g.activeCard!.bonusPoints : 0;

      const newDecks = { ...g.cardDecks };

      // Determine what happens to an unfulfilled card
      let newHeldCard = maestro.heldCard;
      if (g.activeCard && !cardActuallyFulfilled) {
        if (g.activeCard.color === 'yellow') {
          // Yellow must be used immediately — return to deck
          newDecks.yellow = [...newDecks.yellow, g.activeCard];
        } else if (!maestro.heldCard) {
          // Blue/red not fulfilled → hold it for future use (2 rounds)
          newHeldCard = { card: g.activeCard, roundsRemaining: 2, fulfilled: false };
        } else {
          // Already holding a card — return this one to deck
          newDecks[g.activeCard.color] = [...newDecks[g.activeCard.color], g.activeCard];
        }
      }

      // If card was fulfilled and it was the held card, clear held
      if (cardActuallyFulfilled && maestro.heldCard && g.activeCard &&
          maestro.heldCard.card.id === g.activeCard.id) {
        newHeldCard = null;
      } else if (cardActuallyFulfilled) {
        newHeldCard = maestro.heldCard;
      }

      const players = g.players.map((p) => {
        if (p.id === maestro.id) {
          const newFulfilled = cardActuallyFulfilled
            ? [...p.fulfilledCards, g.activeCard!] : p.fulfilledCards;
          return {
            ...p,
            score: p.score + maestroBase + wordBonus,
            basePoints: p.basePoints + maestroBase,
            bonusPoints: p.bonusPoints + wordBonus,
            cardPoints: p.cardPoints + cardBonus,
            fulfilledCards: newFulfilled,
            heldCard: newHeldCard,
          };
        }
        if (action.correctSingerIds.includes(p.id)) {
          return {
            ...p,
            score: p.score + 15,
            basePoints: p.basePoints + 15,
          };
        }
        return p;
      });

      const turnScore = {
        round: g.currentRound,
        maestroId: maestro.id,
        maestroBasePoints: maestroBase,
        maestroWordBonus: wordBonus,
        maestroCardBonus: cardBonus,
        singerScores: action.correctSingerIds.map((id) => ({ playerId: id, points: 15 })),
        songName: action.songName,
      };

      const usedSongs = action.songName
        ? [...g.usedSongs, action.songName.toLowerCase().trim()]
        : g.usedSongs;

      return {
        ...state,
        game: {
          ...g,
          players,
          cardDecks: newDecks,
          scoreHistory: [...g.scoreHistory, turnScore],
          usedSongs,
          turnPhase: 'summary',
          activeCard: null,
        },
      };
    }

    case 'ADVANCED_SCORE': {
      if (!state.game) return state;
      const g = state.game;
      const maestro = g.players[g.currentMaestroIndex];
      const correctCount = action.correctSingerIds.length;
      const maestroBase = correctCount * 10;
      const wordBonus = correctCount > 0 ? getMaestroWordBonus(action.wordCount) : 0;

      // Cards only fulfilled if at least one singer was correct
      const keptCards = correctCount > 0
        ? (g.advancedDrawCards || []).filter((c) => action.keptCardIds.includes(c.id))
        : [];
      const discardedCards = (g.advancedDrawCards || []).filter((c) => !keptCards.some((k) => k.id === c.id));
      const cardBonus = keptCards.reduce((sum, c) => sum + c.bonusPoints, 0);

      // Return discarded cards to the bottom of their decks
      const newDecks = { ...g.cardDecks };
      for (const card of discardedCards) {
        newDecks[card.color] = [...newDecks[card.color], card];
      }

      const players = g.players.map((p) => {
        if (p.id === maestro.id) {
          return {
            ...p,
            score: p.score + maestroBase + wordBonus,
            basePoints: p.basePoints + maestroBase,
            bonusPoints: p.bonusPoints + wordBonus,
            cardPoints: p.cardPoints + cardBonus,
            fulfilledCards: [...p.fulfilledCards, ...keptCards],
          };
        }
        if (action.correctSingerIds.includes(p.id)) {
          return { ...p, score: p.score + 15, basePoints: p.basePoints + 15 };
        }
        return p;
      });

      const turnScore = {
        round: g.currentRound,
        maestroId: maestro.id,
        maestroBasePoints: maestroBase,
        maestroWordBonus: wordBonus,
        maestroCardBonus: cardBonus,
        singerScores: action.correctSingerIds.map((id) => ({ playerId: id, points: 15 })),
        songName: action.songName,
      };

      const usedSongs = action.songName
        ? [...g.usedSongs, action.songName.toLowerCase().trim()]
        : g.usedSongs;

      return {
        ...state,
        game: {
          ...g,
          players,
          cardDecks: newDecks,
          scoreHistory: [...g.scoreHistory, turnScore],
          usedSongs,
          turnPhase: 'summary',
          activeCard: null,
          advancedDrawCards: null,
        },
      };
    }

    case 'SELECT_STEAL_CARDS': {
      if (!state.game) return state;
      return {
        ...state,
        game: {
          ...state.game,
          pendingStolenCards: action.selections,
          turnPhase: 'singing',
        },
      };
    }

    case 'STEAL_SCORE': {
      if (!state.game) return state;
      const g = state.game;
      const maestro = g.players[g.currentMaestroIndex];
      const correctCount = action.correctSingerIds.length;
      const maestroBase = correctCount * 10;
      const wordBonus = correctCount > 0 ? getMaestroWordBonus(action.wordCount) : 0;

      const pending = g.pendingStolenCards || [];
      const fulfilledSelections = correctCount > 0
        ? pending.filter((s) => action.fulfilledCardIds.includes(s.card.id))
        : [];

      const cardBonus = fulfilledSelections.reduce((sum, s) => sum + s.card.bonusPoints, 0);

      const players = g.players.map((p) => {
        if (p.id === maestro.id) {
          const stolenCards = fulfilledSelections.map((s) => s.card);
          return {
            ...p,
            score: p.score + maestroBase + wordBonus,
            basePoints: p.basePoints + maestroBase,
            bonusPoints: p.bonusPoints + wordBonus,
            cardPoints: p.cardPoints + cardBonus,
            fulfilledCards: [...p.fulfilledCards, ...stolenCards],
          };
        }
        const stolen = fulfilledSelections.find((s) => s.fromPlayerId === p.id);
        if (stolen) {
          return {
            ...p,
            fulfilledCards: p.fulfilledCards.filter((c) => c.id !== stolen.card.id),
            cardPoints: p.cardPoints - stolen.card.bonusPoints,
          };
        }
        if (action.correctSingerIds.includes(p.id)) {
          return { ...p, score: p.score + 15, basePoints: p.basePoints + 15 };
        }
        return p;
      });

      const turnScore = {
        round: g.currentRound,
        maestroId: maestro.id,
        maestroBasePoints: maestroBase,
        maestroWordBonus: wordBonus,
        maestroCardBonus: cardBonus,
        singerScores: action.correctSingerIds.map((id) => ({ playerId: id, points: 15 })),
        songName: action.songName,
      };

      const usedSongs = action.songName
        ? [...g.usedSongs, action.songName.toLowerCase().trim()]
        : g.usedSongs;

      return {
        ...state,
        game: {
          ...g,
          players,
          scoreHistory: [...g.scoreHistory, turnScore],
          usedSongs,
          turnPhase: 'summary',
          activeCard: null,
          pendingStolenCards: null,
        },
      };
    }

    case 'NEXT_TURN': {
      if (!state.game) return state;
      const g = state.game;
      const turnsPlayed = g.turnsPlayedThisRound + 1;
      const roundComplete = turnsPlayed >= g.players.length;
      const newRound = roundComplete ? g.currentRound + 1 : g.currentRound;
      const gameOver = newRound > g.totalRounds;

      if (gameOver) {
        // Add card bonus points to final scores (per rules, card points are tallied at end of game)
        const finalPlayers = g.players.map((p) => ({
          ...p,
          score: p.score + p.cardPoints,
        }));
        return {
          ...state,
          screen: 'endgame',
          game: { ...g, players: finalPlayers, turnsPlayedThisRound: turnsPlayed },
        };
      }

      const nextMaestro = (g.currentMaestroIndex + 1) % g.players.length;

      const players = g.players.map((p) => {
        if (p.heldCard) {
          const remaining = p.heldCard.roundsRemaining - (roundComplete ? 1 : 0);
          if (remaining <= 0) {
            return { ...p, heldCard: null };
          }
          return { ...p, heldCard: { ...p.heldCard, roundsRemaining: remaining } };
        }
        return p;
      });

      return {
        ...state,
        screen: 'play',
        game: {
          ...g,
          players,
          currentMaestroIndex: nextMaestro,
          currentRound: newRound,
          turnPhase: 'choose-action',
          activeCard: null,
          advancedDrawCards: null,
          pendingStolenCards: null,
          turnsPlayedThisRound: roundComplete ? 0 : turnsPlayed,
          hasDrawnCardThisTurn: false,
        },
      };
    }

    case 'ABANDON_TURN': {
      if (!state.game) return state;
      const g = state.game;
      const maestro = g.players[g.currentMaestroIndex];
      const newDecks = { ...g.cardDecks };

      if (g.advancedDrawCards?.length) {
        for (const card of g.advancedDrawCards) {
          newDecks[card.color] = [...newDecks[card.color], card];
        }
      }
      if (g.activeCard) {
        const fromHeld = maestro.heldCard?.card && g.activeCard.id === maestro.heldCard.card.id;
        if (!fromHeld) {
          newDecks[g.activeCard.color] = [...newDecks[g.activeCard.color], g.activeCard];
        }
      }

      const abandonPlayers = g.players;

      return {
        ...state,
        game: {
          ...g,
          players: abandonPlayers,
          turnPhase: 'choose-action',
          activeCard: null,
          advancedDrawCards: null,
          pendingStolenCards: null,
          cardDecks: newDecks,
        },
      };
    }

    case 'SKIP_TURN': {
      if (!state.game) return state;
      const g = state.game;
      const skipMaestro = g.players[g.currentMaestroIndex];
      const skipDecks = { ...g.cardDecks };

      if (g.advancedDrawCards?.length) {
        for (const card of g.advancedDrawCards) {
          skipDecks[card.color] = [...skipDecks[card.color], card];
        }
      }

      // Blue/red drawn cards are held for next turn; yellow goes back to the deck
      let skipNewHeldCard: import('../types').HeldCard | null = null;
      if (g.activeCard) {
        const fromHeld = skipMaestro.heldCard?.card && g.activeCard.id === skipMaestro.heldCard.card.id;
        if (!fromHeld) {
          if (g.activeCard.color === 'blue' || g.activeCard.color === 'red') {
            skipNewHeldCard = { card: g.activeCard, roundsRemaining: 2, fulfilled: false };
          } else {
            skipDecks[g.activeCard.color] = [...skipDecks[g.activeCard.color], g.activeCard];
          }
        }
      }

      const turnsPlayed = g.turnsPlayedThisRound + 1;
      const roundComplete = turnsPlayed >= g.players.length;
      const newRound = roundComplete ? g.currentRound + 1 : g.currentRound;
      const gameOver = newRound > g.totalRounds;

      // Handle held card expiry on round change, and assign new held card for maestro
      const skipPlayers = g.players.map((p, i) => {
        const isMaestro = i === g.currentMaestroIndex;
        const baseHeld = isMaestro && skipNewHeldCard ? skipNewHeldCard : p.heldCard;
        if (!baseHeld) return isMaestro && skipNewHeldCard ? { ...p, heldCard: skipNewHeldCard } : p;
        if (roundComplete) {
          const remaining = baseHeld.roundsRemaining - 1;
          if (remaining <= 0) {
            return { ...p, heldCard: null };
          }
          return { ...p, heldCard: { ...baseHeld, roundsRemaining: remaining } };
        }
        return { ...p, heldCard: baseHeld };
      });

      if (gameOver) {
        const finalPlayers = skipPlayers.map((p) => ({
          ...p,
          score: p.score + p.cardPoints,
        }));
        return {
          ...state,
          screen: 'endgame',
          game: { ...g, players: finalPlayers, cardDecks: skipDecks, turnsPlayedThisRound: turnsPlayed },
        };
      }

      const nextMaestro = (g.currentMaestroIndex + 1) % g.players.length;
      return {
        ...state,
        game: {
          ...g,
          players: skipPlayers,
          currentMaestroIndex: nextMaestro,
          currentRound: newRound,
          turnPhase: 'choose-action',
          activeCard: null,
          advancedDrawCards: null,
          pendingStolenCards: null,
          cardDecks: skipDecks,
          turnsPlayedThisRound: roundComplete ? 0 : turnsPlayed,
          hasDrawnCardThisTurn: false,
        },
      };
    }

    case 'RESUME_GAME': {
      const game = loadGame();
      if (game) return { screen: 'play', game };
      return state;
    }

    case 'RESET_GAME':
      localStorage.removeItem(STORAGE_KEY);
      return { screen: 'home', game: null };

    default:
      return state;
  }
}

const initialState: AppState = {
  screen: 'home',
  game: null,
};

interface ContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  hasSavedGame: boolean;
}

const GameContext = createContext<ContextType>({
  state: initialState,
  dispatch: () => {},
  hasSavedGame: false,
});

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const hasSavedGame = useMemo(() => {
    if (state.game) return true;
    return loadGame() !== null;
  }, [state.game]);

  useEffect(() => {
    if (state.game) {
      saveGame(state.game);
    }
  }, [state.game]);

  return (
    <GameContext.Provider value={{ state, dispatch, hasSavedGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
