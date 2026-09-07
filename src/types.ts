export interface Participant {
  id: string;
  name: string;
  color: string;
  credits: number;
  assignedNumber?: number;
}

export interface VirtualBet {
  participantId: string;
  participantName: string;
  participantNumber?: number;
  amount: number;
}

export interface BetResult {
  won: boolean;
  participantName: string;
  participantNumber?: number;
  betAmount: number;
  payout: number;
  netGain: number;
  timestamp: number;
}

export interface SpinHistoryItem {
  id: string;
  winnerId: string;
  winnerName: string;
  winnerNumber?: number;
  date: string;
  time: string;
  timestamp: number;
  totalParticipants: number;
  betResult?: BetResult | null;
  seedVerification: string;
}

export interface WheelSettings {
  spinDuration: number; // in seconds (3, 5, 8, 10)
  rotations: number; // 5 - 15
  soundEnabled: boolean;
  confettiEnabled: boolean;
  fireworksEnabled: boolean;
  autoRemoveWinner: boolean;
  showNamesOnWheel: boolean;
  virtualBettingEnabled: boolean;
  startingCredits: number;
  minBet: number;
  maxBet: number;
}

export type WheelState = 'idle' | 'countdown' | 'spinning' | 'celebrating';
