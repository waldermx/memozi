/**
 * @file shared/src/srs/FSRSParameters.ts
 * @description Immutable value object encapsulating the 17 FSRS-5 parameters (w[0..16]).
 *
 * The FSRS-5 algorithm uses 17 trainable parameters to calculate memory stability
 * and retrievability. The default values provided here were determined by training
 * on 20+ million Anki reviews by the FSRS research team.
 *
 * Users can eventually have personalized parameters (stored in users.fsrs_parameters)
 * but this requires collecting enough review data for optimization. For the MVP,
 * all users start with the default parameters.
 *
 * @see https://github.com/open-spaced-repetition/fsrs5-paper for the research paper.
 */

/** The default FSRS-5 parameters trained on 20M+ reviews. */
const DEFAULT_PARAMS: readonly number[] = [
  0.40255, 1.18385, 3.1262, 15.4722,  // w[0..3]: initial stability for ratings 1-4
  7.2102, 0.5316, 1.0651, 0.06046,    // w[4..7]: difficulty/stability modifiers
  1.616, 0.1544, 1.0071,              // w[8..10]: forgetting curve shapers
  1.9395, 0.11, 0.29605, 2.2698,      // w[11..14]: learning state modifiers
  0.2994, 2.9898,                     // w[15..16]: relearning modifiers
] as const;

/**
 * Immutable value object holding FSRS-5 algorithm parameters.
 *
 * @invariant Always has exactly 17 parameters. No parameter is NaN.
 */
export class FSRSParameters {
  private constructor(public readonly weights: readonly number[]) {}

  /**
   * Create the default FSRS-5 parameters.
   * Use this for all new users and as the fallback when custom params are invalid.
   */
  static default(): FSRSParameters {
    return new FSRSParameters([...DEFAULT_PARAMS]);
  }

  /**
   * Create from a custom weights array (e.g., loaded from user's DB record).
   *
   * @param weights - Array of exactly 17 numbers.
   * @throws {Error} If the array length is not 17 or contains NaN values.
   *
   * @example
   * ```ts
   * const params = FSRSParameters.fromArray(user.fsrsParameters as number[]);
   * ```
   */
  static fromArray(weights: number[]): FSRSParameters {
    if (weights.length !== 17) {
      throw new Error(
        `FSRSParameters must have exactly 17 weights, received ${weights.length}. ` +
        'Falling back to defaults is recommended.',
      );
    }
    if (weights.some((w) => isNaN(w))) {
      throw new Error('FSRSParameters contains NaN values. Check the source data.');
    }
    return new FSRSParameters([...weights]);
  }

  /**
   * Attempt to parse from an unknown value (e.g., Prisma JSON field).
   * Returns default parameters on any error.
   */
  static fromJsonOrDefault(json: unknown): FSRSParameters {
    if (!Array.isArray(json)) return FSRSParameters.default();
    try {
      return FSRSParameters.fromArray(json as number[]);
    } catch {
      return FSRSParameters.default();
    }
  }

  /** Serialize to a plain array for storage in Prisma JSON columns. */
  toArray(): number[] {
    return [...this.weights];
  }

  /** Return a new instance with modified weights (for future FSRS optimizer). */
  withWeights(weights: number[]): FSRSParameters {
    return FSRSParameters.fromArray(weights);
  }
}
