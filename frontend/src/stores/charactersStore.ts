import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type DisplayState = 'new' | 'learning' | 'fresh' | 'due' | 'overdue' | 'mastered';

export interface CharacterCard {
  characterId: string;
  character: string;
  pinyin: string;
  definition: string;
  hskLevel: number;
  cardState: CardState;
  dueDate: string | null; // ISO
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
}

function getDisplayState(card: CharacterCard): DisplayState {
  if (card.cardState === 'new') return 'new';
  if (card.cardState === 'learning') return 'learning';
  const now = Date.now();
  const due = card.dueDate ? new Date(card.dueDate).getTime() : now;
  const twoDays = 2 * 24 * 3600 * 1000;
  if (card.stability >= 30) return 'mastered';
  if (now < due - twoDays) return 'fresh';
  if (now <= due) return 'due';
  return 'overdue';
}

interface CharactersState {
  cards: Record<string, CharacterCard>; // keyed by characterId
  lastSynced: string | null;
}

interface CharactersActions {
  upsertCard(card: CharacterCard): void;
  upsertCards(cards: CharacterCard[]): void;
  getDisplayState(characterId: string): DisplayState;
  clearAll(): void;
}

export const useCharactersStore = create<CharactersState & CharactersActions>()(
  persist(
    immer((set, get) => ({
      cards: {},
      lastSynced: null,

      upsertCard(card) {
        set((s) => { s.cards[card.characterId] = card; });
      },

      upsertCards(cards) {
        set((s) => {
          for (const c of cards) s.cards[c.characterId] = c;
          s.lastSynced = new Date().toISOString();
        });
      },

      getDisplayState(characterId) {
        const card = get().cards[characterId];
        if (!card) return 'new';
        return getDisplayState(card);
      },

      clearAll() {
        set((s) => { s.cards = {}; s.lastSynced = null; });
      },
    })),
    { name: 'memozi-characters' },
  ),
);
