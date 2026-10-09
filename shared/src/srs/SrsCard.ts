/**
 * @file shared/src/srs/SrsCard.ts
 * @description Framework-free FSRS state of a single card (one HSK word).
 *
 * This is the scheduling state only: no ids, no user, no persistence concerns.
 * The device stores it next to its own card record; the backend maps its
 * Prisma-backed `Card` entity to and from it.
 */

import type { CardState } from '../types/enums.js';

export interface SrsCard {
  /** FSRS learning state (New, Learning, Review, Relearning) */
  state: CardState;
  /** When the card is next due */
  due: Date;
  /** FSRS stability S, in days */
  stability: number;
  /** FSRS difficulty D, range [1, 10] */
  difficulty: number;
  /** Number of reviews */
  reps: number;
  /** Number of lapses (Again on a Review card) */
  lapses: number;
  /** Timestamp of the last review, null if never reviewed */
  lastReview: Date | null;
  /** Days between the previous review and the last one */
  elapsedDays: number;
  /** Interval in days chosen at the last review */
  scheduledDays: number;
  /** Index of the current (re)learning step; 0 outside of learning */
  learningSteps: number;
}
