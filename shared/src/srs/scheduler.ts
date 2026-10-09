/**
 * @file shared/src/srs/scheduler.ts
 * @description Pure binary FSRS scheduler built on ts-fsrs.
 *
 * No I/O and no clock: the review time is always passed in, so the same
 * inputs give the same output on the device, on the server and in tests.
 *
 * FSRS key concepts:
 *   - Stability (S): how many days until retrievability drops to 90%
 *   - Difficulty (D): intrinsic hardness of the card, range [1, 10]
 *   - Retrievability (R): probability of recall at review time
 *   - Rating: 1=Again, 3=Good in our binary model
 *
 * @see https://github.com/open-spaced-repetition/ts-fsrs
 */

import {
  createEmptyCard,
  dateDiffInDays,
  fsrs,
  generatorParameters,
  type Card as FSRSCard,
  type Grade,
  type State,
  type StepUnit,
} from 'ts-fsrs';
import type { BinaryRating } from './BinaryRating.js';
import type { FSRSParameters } from './FSRSParameters.js';
import type { SrsCard } from './SrsCard.js';
import { CardState } from '../types/enums.js';

export type { StepUnit };

export interface SchedulerOptions {
  /**
   * Short-term steps for New/Learning cards, e.g. `['1m', '10m']` (the ts-fsrs default).
   * Pass `[]` to let FSRS pick the interval directly, which is what you want when
   * the step position (`SrsCard.learningSteps`) cannot be stored.
   */
  learningSteps?: readonly StepUnit[];
  /** Short-term steps after a lapse. ts-fsrs default: `['10m']`. */
  relearningSteps?: readonly StepUnit[];
}

export interface ScheduleResult {
  /** The card with its new FSRS state (a new object, the input is untouched) */
  card: SrsCard;
  /** The FSRS grade that was applied (Again=1 or Good=3) */
  rating: Grade;
}

/**
 * Initial state for a card that has never been reviewed. It is due right away.
 *
 * @param now - Creation time; becomes the card's `due`.
 */
export function createNewSrsCard(now: Date): SrsCard {
  const empty = createEmptyCard(now);
  return {
    state: CardState.New,
    due: empty.due,
    stability: empty.stability,
    difficulty: empty.difficulty,
    reps: empty.reps,
    lapses: empty.lapses,
    lastReview: null,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: empty.learning_steps,
  };
}

/**
 * Schedule a card from the binary outcome of a practice session.
 *
 *   - correct (0 mistakes)   → Rating.Good  → normal interval progression
 *   - incorrect (>0 mistakes) → Rating.Again → back to (re)learning
 *
 * @param card - Current state before this review.
 * @param binaryRating - Outcome of the session.
 * @param params - FSRS weights for this user.
 * @param reviewedAt - Review timestamp. Always explicit, never read from the clock here.
 * @param options - (Re)learning steps; ts-fsrs defaults when omitted.
 */
export function scheduleBinary(
  card: SrsCard,
  binaryRating: BinaryRating,
  params: FSRSParameters,
  reviewedAt: Date,
  options: SchedulerOptions = {},
): ScheduleResult {
  const algo = fsrs(
    generatorParameters({
      w: params.toArray(),
      ...(options.learningSteps ? { learning_steps: options.learningSteps } : {}),
      ...(options.relearningSteps ? { relearning_steps: options.relearningSteps } : {}),
    }),
  );
  const rating = binaryRating.toFSRSRating();
  const scheduled = algo.next(toFSRSCard(card), reviewedAt, rating).card;

  return {
    card: {
      state: scheduled.state as number as CardState,
      due: scheduled.due,
      stability: scheduled.stability,
      difficulty: scheduled.difficulty,
      reps: scheduled.reps,
      lapses: scheduled.lapses,
      lastReview: reviewedAt,
      // Computed here because Card.elapsed_days is deprecated in ts-fsrs 5 and
      // goes away in 6.
      elapsedDays: card.lastReview === null ? 0 : dateDiffInDays(card.lastReview, reviewedAt),
      scheduledDays: scheduled.scheduled_days,
      learningSteps: scheduled.learning_steps,
    },
    rating,
  };
}

/** CardState values 0-3 match ts-fsrs `State` values 0-3. */
function toFSRSCard(card: SrsCard): FSRSCard {
  const base: FSRSCard = {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    // Not read by the ts-fsrs 5 scheduler (it uses last_review), but still required by the type.
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number as State,
  };
  return card.lastReview === null ? base : { ...base, last_review: card.lastReview };
}
