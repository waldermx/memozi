/**
 * @file src/domain/entities/Card.ts
 * @description FSRS card state entity — the user's learning progress for a single character.
 *
 * A Card is the FSRS state machine for one user × character pair. It tracks all
 * parameters required by the FSRS-5 algorithm to schedule the next review.
 *
 * Lifecycle:
 *   1. Created with state=New when a character is first added to the user's deck.
 *   2. FSRSService.scheduleBinary() transitions the card through states.
 *   3. The card is persisted back after every review.
 *
 * @see FSRSService for scheduling logic
 * @see https://github.com/open-spaced-repetition/ts-fsrs for algorithm details
 */

import { CardState } from '@memozi/shared';

/**
 * Mutable FSRS state for a user's study card.
 *
 * All numeric properties correspond directly to FSRS-5 model variables.
 * `stability` (S) and `difficulty` (D) are the primary learned quantities.
 */
export class Card {
  /** Unique card ID (UUID) */
  id: string;
  /** FK → User */
  userId: string;
  /** FK → Character */
  characterId: string;
  /** FSRS card state */
  state: CardState;
  /** FSRS Stability (S): estimated days until 90% retention probability drops below threshold */
  stability: number;
  /** FSRS Difficulty (D): intrinsic difficulty of this card, range [1, 10] */
  difficulty: number;
  /** Timestamp of when this card is next due for review */
  due: Date;
  /** Total number of successful reviews */
  reps: number;
  /** Total number of Rating.Again responses (memory lapses) */
  lapses: number;
  /** Timestamp of the most recent review, null if never reviewed */
  lastReview: Date | null;
  /** Elapsed days since last review at scheduling time (FSRS internal) */
  elapsedDays: number;
  /** Scheduled interval in days (FSRS internal, used for next due calculation) */
  scheduledDays: number;

  constructor(props: {
    id: string;
    userId: string;
    characterId: string;
    state?: CardState;
    stability?: number;
    difficulty?: number;
    due?: Date;
    reps?: number;
    lapses?: number;
    lastReview?: Date | null;
    elapsedDays?: number;
    scheduledDays?: number;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.characterId = props.characterId;
    this.state = props.state ?? CardState.New;
    this.stability = props.stability ?? 0;
    this.difficulty = props.difficulty ?? 0;
    this.due = props.due ?? new Date();
    this.reps = props.reps ?? 0;
    this.lapses = props.lapses ?? 0;
    this.lastReview = props.lastReview ?? null;
    this.elapsedDays = props.elapsedDays ?? 0;
    this.scheduledDays = props.scheduledDays ?? 0;
  }

  /** True if this card has never been reviewed. */
  get isNew(): boolean {
    return this.state === CardState.New;
  }

  /** True if the card is due for review right now. */
  isDue(at: Date = new Date()): boolean {
    return this.due <= at;
  }

  /** Human-readable next review description. Used in API responses. */
  nextReviewDescription(): string {
    const now = new Date();
    const diffMs = this.due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'now';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 30) return `in ${Math.ceil(diffDays / 7)} weeks`;
    return `in ${Math.ceil(diffDays / 30)} months`;
  }
}
