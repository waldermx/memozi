/**
 * @file shared/src/srs/FSRSParameters.ts
 * @description Immutable value object holding the FSRS model weights.
 *
 * ts-fsrs 5 implements FSRS-6, which uses 21 weights (w[0..20]). Older weight
 * sets are still accepted and migrated with ts-fsrs `migrateParameters`:
 *   - 17 weights: FSRS-4.5 (what the backend stored in users.fsrs_parameters
 *     before the upgrade)
 *   - 19 weights: FSRS-5
 *
 * Every user starts with the library defaults. Personalised weights need enough
 * review history for the optimizer, which is out of scope for now.
 *
 * @see https://github.com/open-spaced-repetition/ts-fsrs
 */

import { generatorParameters, migrateParameters } from 'ts-fsrs';

const SUPPORTED_LENGTHS: readonly number[] = [17, 19, 21];

/**
 * @invariant Always holds 21 finite weights.
 */
export class FSRSParameters {
  private constructor(public readonly weights: readonly number[]) {}

  /** The current ts-fsrs default weights (FSRS-6). */
  static default(): FSRSParameters {
    return new FSRSParameters([...generatorParameters().w]);
  }

  /**
   * Create from a weights array (e.g. loaded from storage). 17- and 19-weight
   * arrays are migrated to 21 weights; 21-weight arrays are kept as given.
   *
   * @throws {Error} If the length is not 17, 19 or 21, or a value is not finite.
   */
  static fromArray(weights: readonly number[]): FSRSParameters {
    if (!SUPPORTED_LENGTHS.includes(weights.length)) {
      throw new Error(`FSRSParameters must have 17, 19 or 21 weights, received ${weights.length}.`);
    }
    if (weights.some((w) => typeof w !== 'number' || !Number.isFinite(w))) {
      throw new Error('FSRSParameters must only contain finite numbers.');
    }
    // 21 weights are already current; migrating them again would re-clip and break
    // the toArray()/fromArray() round trip.
    return new FSRSParameters(weights.length === 21 ? [...weights] : migrateParameters(weights));
  }

  /**
   * Parse an unknown value (e.g. a JSON column). Falls back to the defaults
   * when the value is not a valid weights array.
   */
  static fromJsonOrDefault(json: unknown): FSRSParameters {
    if (!Array.isArray(json)) return FSRSParameters.default();
    try {
      return FSRSParameters.fromArray(json as number[]);
    } catch {
      return FSRSParameters.default();
    }
  }

  /** Serialize to a plain array for storage. Always 21 weights. */
  toArray(): number[] {
    return [...this.weights];
  }

  /** Return a new instance with other weights (for a future optimizer). */
  withWeights(weights: readonly number[]): FSRSParameters {
    return FSRSParameters.fromArray(weights);
  }
}
