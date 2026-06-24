export interface Participant {
  ids: string;
  name: string;
  [key: string]: any;
}

export interface Prize {
  id: string;
  name: string;
  count: number;
}

export interface RewardLogEntry {
  id: string;
  timestamp: string;
  eventName: string;
  gameType: string;
  prize: string;
  winnerId: string;
  winnerName: string;
  isAccepted: boolean;
  isRejected: boolean;
  isRemovedFromPool: boolean;
  status: 'Accepted' | 'Rejected (Kept)' | 'Rejected (Removed)';
  sessionId: string;
}

export interface EventConfig {
  eventName: string;
  backgroundUrl: string;
  backgroundColor: string;
  backgroundBlur: number;
  backgroundOverlayOpacity: number;
  prizes: Prize[];
  participants: Participant[];
  remainingParticipants: Participant[];
  rewardLog: RewardLogEntry[];
  currentSessionId: string;
}

export type GameMode =
  | 'CONFIG'
  | 'MENU'
  | 'LUCKY_NUMBERS'
  | 'HUMAN_ATHLETICS'
  | 'LUCKY_WHEEL'
  | 'MYSTERY_CHESTS'
  | 'GACHA_MACHINE'
  | 'BALLOON_POP'
  | 'CARD_FLIP'
  | 'GRAND_FINALE';
