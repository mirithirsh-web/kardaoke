export type CardColor = 'yellow' | 'blue' | 'red';

export interface InspirationCard {
  id: string;
  color: CardColor;
  instruction: { en: string; he: string; es: string; fr: string };
  bonusPoints: number;
  copies: number;
  exclusionGroup?: string;
}

export interface HeldCard {
  card: InspirationCard;
  roundsRemaining: number;
  fulfilled: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  basePoints: number;
  bonusPoints: number;
  cardPoints: number;
  heldCard: HeldCard | null;
  fulfilledCards: InspirationCard[];
  hasUsedAdvancedDraw: boolean;
}

export type TurnPhase =
  | 'choose-action'
  | 'draw-card'
  | 'advanced-draw'
  | 'steal-cards'
  | 'singing'
  | 'judging'
  | 'scoring'
  | 'summary';

export interface TurnScore {
  round: number;
  maestroId: string;
  maestroBasePoints: number;
  maestroWordBonus: number;
  maestroCardBonus: number;
  singerScores: { playerId: string; points: number }[];
  songName?: string;
  stolenCards?: { fromPlayerId: string; cardColor: CardColor; cardPoints: number }[];
}

export interface StolenCardSelection {
  fromPlayerId: string;
  card: InspirationCard;
}

export interface GameState {
  players: Player[];
  currentMaestroIndex: number;
  currentRound: number;
  totalRounds: number;
  turnPhase: TurnPhase;
  usedSongs: string[];
  cardDecks: {
    yellow: InspirationCard[];
    blue: InspirationCard[];
    red: InspirationCard[];
  };
  includeCards: boolean;
  allowStealing: boolean;
  scoreHistory: TurnScore[];
  locale: string;
  activeCard: InspirationCard | null;
  advancedDrawCards: InspirationCard[] | null;
  pendingStolenCards: StolenCardSelection[] | null;
  turnsPlayedThisRound: number;
}

export type Screen =
  | 'home' | 'mode-select' | 'setup' | 'rules' | 'play' | 'scoreboard' | 'endgame'
  | 'create-room' | 'join-room' | 'multiplayer-lobby' | 'multiplayer-play' | 'multiplayer-endgame';

export interface RoomPlayer {
  uid: string;
  name: string;
  order: number;
  connected: boolean;
}

export interface RoomSettings {
  rounds: number;
  includeCards: boolean;
  allowStealing: boolean;
  selectedPacks: string[];
}

export interface PublicCardInfo {
  color: CardColor;
  bonusPoints: number;
}

export interface MultiplayerGameState {
  currentMaestroIndex: number;
  currentRound: number;
  totalRounds: number;
  turnPhase: TurnPhase;
  turnsPlayedThisRound: number;
  usedSongs: string[];
  scoreHistory: TurnScore[];
  includeCards: boolean;
  allowStealing: boolean;
  publicCard: PublicCardInfo | null;
  activeCard: InspirationCard | null;
  revealedCard: InspirationCard | null;
  advancedDrawCards: InspirationCard[] | null;
  pendingStolenCards: StolenCardSelection[] | null;
}

export interface MultiplayerScores {
  [uid: string]: {
    score: number;
    basePoints: number;
    bonusPoints: number;
    cardPoints: number;
    fulfilledCards: InspirationCard[];
    heldCard: HeldCard | null;
    hasUsedAdvancedDraw: boolean;
  };
}

export interface JudgingState {
  wordCount: number;
  singerResponses: { [uid: string]: boolean };
}
