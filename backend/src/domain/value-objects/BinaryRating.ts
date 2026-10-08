/**
 * @file src/domain/value-objects/BinaryRating.ts
 * @description Immutable value object representing the binary review outcome from HanziWriter.
 *
 * MemoZi uses a binary correctness model: HanziWriter's quiz mode fires an
 * `onComplete` callback with `{ totalMistakes: number }`. The domain maps
 * this directly to FSRS ratings without any user intervention:
 *
 *   totalMistakes === 0  →  Correct  →  FSRS Rating.Good (3)
 *   totalMistakes  > 0  →  Incorrect →  FSRS Rating.Again (1)
 *
 * This design is intentional (see ADR-002) to eliminate cognitive overhead
 * for the learner during active recall.
 */

import { FSRSRating } from '@memozi/shared';
import { type Grade, Rating } from 'ts-fsrs';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BinaryOutcome = 'correct' | 'incorrect';

// ─── Value Object ─────────────────────────────────────────────────────────────

/**
 * Represents the result of a single HanziWriter quiz session.
 *
 * @invariant `totalMistakes` is a non-negative integer.
 */
export class BinaryRating {
  private constructor(
    /** The normalized outcome — the authoritative truth for FSRS scheduling */
    public readonly outcome: BinaryOutcome,
    /** Raw mistake count from HanziWriter's quiz `onComplete` event */
    public readonly totalMistakes: number,
  ) {}

  /**
   * Create a BinaryRating from HanziWriter quiz output.
   *
   * @param totalMistakes - The `totalMistakes` value from HanziWriter's `onComplete` callback.
   * @throws {RangeError} If totalMistakes is negative.
   *
   * @example
   * ```ts
   * // From HanziWriter: quiz.on('complete', ({ totalMistakes }) => {
   * const rating = BinaryRating.fromHanziWriter(totalMistakes);
   * const fsrsRating = rating.toFSRSRating(); // Rating.Good or Rating.Again
   * // })
   * ```
   */
  static fromHanziWriter(totalMistakes: number): BinaryRating {
    if (totalMistakes < 0 || !Number.isInteger(totalMistakes)) {
      throw new RangeError(`totalMistakes must be a non-negative integer, got: ${totalMistakes}`);
    }
    const outcome: BinaryOutcome = totalMistakes === 0 ? 'correct' : 'incorrect';
    return new BinaryRating(outcome, totalMistakes);
  }

  /** Create a correct rating (0 mistakes). Useful in tests and seeding. */
  static correct(): BinaryRating {
    return new BinaryRating('correct', 0);
  }

  /** Create an incorrect rating with a given mistake count. Useful in tests. */
  static incorrect(mistakes = 1): BinaryRating {
    return new BinaryRating('incorrect', mistakes);
  }

  get isCorrect(): boolean {
    return this.outcome === 'correct';
  }

  /**
   * Convert to the ts-fsrs `Grade` type used by the FSRS algorithm's `next()` method.
   * Grade is `Rating` excluding `Rating.Manual` — our binary model only uses Again(1) and Good(3).
   * - Correct  →  Rating.Good  (3): normal interval progression
   * - Incorrect →  Rating.Again (1): card returns to learning, resets stability
   */
  toFSRSRating(): Grade {
    return this.isCorrect ? Rating.Good : Rating.Again;
  }

  /**
   * Convert to the shared `FSRSRating` enum (for API responses).
   * The shared type mirrors ts-fsrs values for cross-boundary type safety.
   */
  toSharedRating(): FSRSRating {
    return this.isCorrect ? FSRSRating.Good : FSRSRating.Again;
  }

  toString(): string {
    return `BinaryRating(${this.outcome}, mistakes=${this.totalMistakes})`;
  }
}
