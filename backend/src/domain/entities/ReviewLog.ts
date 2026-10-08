/**
 * @file src/domain/entities/ReviewLog.ts
 * @description Immutable audit log of a single review event.
 *
 * Every call to SubmitBinaryReview creates a ReviewLog. These logs are the raw
 * material for future FSRS parameter optimization and the activity heatmap.
 *
 * @design Immutable by convention — logs are never updated, only created.
 */

import { CardState, FSRSRating } from '@memozi/shared';

export class ReviewLog {
  readonly id: string;
  readonly cardId: string;
  readonly userId: string;
  /** The FSRS rating applied (1=Again, 3=Good in our binary model) */
  readonly rating: FSRSRating;
  /** Raw HanziWriter mistake count for analytics */
  readonly totalMistakes: number;
  /** Card state BEFORE this review */
  readonly stateBefore: CardState;
  /** Card state AFTER this review */
  readonly stateAfter: CardState;
  /** FSRS stability value after scheduling */
  readonly stability: number;
  /** FSRS difficulty value after scheduling */
  readonly difficulty: number;
  /** Days elapsed since the card was last reviewed */
  readonly elapsedDays: number;
  /** Days until the next review (the scheduled interval) */
  readonly scheduledDays: number;
  /** ISO timestamp of when the review occurred */
  readonly reviewedAt: Date;

  constructor(props: {
    id: string;
    cardId: string;
    userId: string;
    rating: FSRSRating;
    totalMistakes: number;
    stateBefore: CardState;
    stateAfter: CardState;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    reviewedAt?: Date;
  }) {
    this.id = props.id;
    this.cardId = props.cardId;
    this.userId = props.userId;
    this.rating = props.rating;
    this.totalMistakes = props.totalMistakes;
    this.stateBefore = props.stateBefore;
    this.stateAfter = props.stateAfter;
    this.stability = props.stability;
    this.difficulty = props.difficulty;
    this.elapsedDays = props.elapsedDays;
    this.scheduledDays = props.scheduledDays;
    this.reviewedAt = props.reviewedAt ?? new Date();
  }
}
