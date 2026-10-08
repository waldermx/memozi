/**
 * @file src/domain/services/FSRSService.ts
 * @description Adapter between the backend `Card` entity and the shared SRS core.
 *
 * The scheduling logic itself lives in `@memozi/shared` (srs/scheduler.ts) so the
 * app can schedule cards offline. This service only maps the persisted entity
 * to the framework-free `SrsCard` and back, and assigns ids to new cards.
 */

import {
  createNewSrsCard,
  scheduleBinary,
  type BinaryRating,
  type FSRSParameters,
  type Grade,
  type SrsCard,
} from '@memozi/shared';
import { nanoid } from 'nanoid';
import { Card } from '../entities/Card.js';

/** Result returned after scheduling a binary review. */
export interface ScheduleResult {
  /** The card with updated FSRS state (new instance, the original is unchanged) */
  updatedCard: Card;
  /** The FSRS Grade applied (Again=1 or Good=3) */
  rating: Grade;
}

export class FSRSService {
  /**
   * Schedule a card using the binary review outcome.
   *
   * @param reviewedAt - The review timestamp. Defaults to now. Pass explicitly in tests.
   */
  scheduleBinary(
    card: Card,
    binaryRating: BinaryRating,
    params: FSRSParameters,
    reviewedAt: Date = new Date(),
  ): ScheduleResult {
    const result = scheduleBinary(toSrsCard(card), binaryRating, params, reviewedAt);
    return {
      updatedCard: new Card({
        id: card.id,
        userId: card.userId,
        characterId: card.characterId,
        ...result.card,
      }),
      rating: result.rating,
    };
  }

  /** Create a brand-new card for a user × character pair, due immediately. */
  createNewCard(userId: string, characterId: string, now: Date = new Date()): Card {
    return new Card({ id: nanoid(), userId, characterId, ...createNewSrsCard(now) });
  }
}

function toSrsCard(card: Card): SrsCard {
  return {
    state: card.state,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.lastReview,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
  };
}
