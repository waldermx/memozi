/**
 * @file src/domain/services/FSRSService.ts
 * @description Domain service that wraps ts-fsrs to schedule card reviews.
 *
 * This service is stateless and contains no I/O — it is a pure function on
 * domain objects. Tests can call it directly without any mocks.
 *
 * FSRS-5 key concepts:
 *   - Stability (S): how many days until retrievability drops to 90%
 *   - Difficulty (D): intrinsic hardness of the card, range [1, 10]
 *   - Retrievability (R): probability of recall at review time
 *   - Rating: the quality of the response (1=Again, 3=Good in our binary model)
 *
 * @see https://github.com/open-spaced-repetition/ts-fsrs
 */

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  State,
  type Card as FSRSCard,
  type Grade,
} from 'ts-fsrs';
import type { BinaryRating } from '../value-objects/BinaryRating.js';
import type { FSRSParameters } from '../value-objects/FSRSParameters.js';
import { Card } from '../entities/Card.js';
import { CardState } from '@memozi/shared';
import { nanoid } from 'nanoid';

/** Result returned after scheduling a binary review. */
export interface ScheduleResult {
  /** The card with updated FSRS state (mutated copy — original is unchanged) */
  updatedCard: Card;
  /** The FSRS Grade applied (Again=1 or Good=3) */
  rating: Grade;
}

/**
 * Pure domain service for FSRS-5 card scheduling.
 *
 * Usage in application layer:
 * ```ts
 * const fsrsService = new FSRSService();
 * const result = fsrsService.scheduleBinary(card, binaryRating, user.fsrsParameters);
 * await cardRepo.update(result.updatedCard);
 * ```
 */
export class FSRSService {
  /**
   * Schedule a card using the binary review outcome from HanziWriter.
   *
   * Maps BinaryRating to FSRS:
   *   - correct (0 mistakes) → Rating.Good (3) → normal interval progression
   *   - incorrect (>0 mistakes) → Rating.Again (1) → card returns to learning queue
   *
   * @param card - The current card state before this review.
   * @param binaryRating - The outcome determined by HanziWriter quiz completion.
   * @param params - FSRS parameters for this user. Defaults to global defaults if omitted.
   * @param reviewedAt - The review timestamp. Defaults to now. Pass explicitly in tests.
   *
   * @returns A new Card instance with updated FSRS state. The original `card` is not mutated.
   */
  scheduleBinary(
    card: Card,
    binaryRating: BinaryRating,
    params: FSRSParameters,
    reviewedAt: Date = new Date(),
  ): ScheduleResult {
    const algo = fsrs(
      generatorParameters({ w: params.toArray() }),
    );

    const fsrsCard = this.toFSRSCard(card);
    const rating = binaryRating.toFSRSRating();

    // ts-fsrs returns a record of all possible next states keyed by Rating
    const result = algo.next(fsrsCard, reviewedAt, rating);
    const scheduled = result.card;

    const updatedCard = new Card({
      ...card,
      state: scheduled.state as unknown as CardState,
      stability: scheduled.stability,
      difficulty: scheduled.difficulty,
      due: scheduled.due,
      reps: scheduled.reps,
      lapses: scheduled.lapses,
      lastReview: reviewedAt,
      elapsedDays: scheduled.elapsed_days,
      scheduledDays: scheduled.scheduled_days,
    });

    return { updatedCard, rating };
  }

  /**
   * Create a brand-new FSRS card for a user × character pair.
   * The card starts in state=New with default FSRS values and is due immediately.
   *
   * @param userId - The owning user's ID.
   * @param characterId - The character to create the card for.
   *
   * @example
   * ```ts
   * const newCard = fsrsService.createNewCard(userId, characterId);
   * await cardRepo.create(newCard);
   * ```
   */
  createNewCard(userId: string, characterId: string): Card {
    const fsrsCard = createEmptyCard();
    return new Card({
      id: nanoid(),
      userId,
      characterId,
      state: CardState.New,
      stability: fsrsCard.stability,
      difficulty: fsrsCard.difficulty,
      due: fsrsCard.due,
      reps: fsrsCard.reps,
      lapses: fsrsCard.lapses,
      lastReview: null,
      elapsedDays: 0,
      scheduledDays: 0,
    });
  }

  /** Convert our domain Card to the ts-fsrs Card format. */
  private toFSRSCard(card: Card): FSRSCard {
    const base = {
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsedDays,
      scheduled_days: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      // CardState enum values are 0-3, matching ts-fsrs State enum values 0-3
      state: card.state as unknown as State,
    };
    if (card.lastReview !== null) {
      return { ...base, last_review: card.lastReview };
    }
    return base;
  }
}
