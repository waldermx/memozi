import { describe, it, expect } from 'vitest';
import { generatorParameters, migrateParameters } from 'ts-fsrs';
import { FSRSParameters } from './FSRSParameters.js';

/** FSRS-4.5 defaults that were stored for every user before the ts-fsrs 5 upgrade. */
const LEGACY_17 = [
  0.40255, 1.18385, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.06046, 1.616, 0.1544, 1.0071,
  1.9395, 0.11, 0.29605, 2.2698, 0.2994, 2.9898,
];

describe('FSRSParameters', () => {
  describe('default()', () => {
    it('uses the current ts-fsrs default weights', () => {
      expect(FSRSParameters.default().weights).toEqual([...generatorParameters().w]);
    });

    it('has 21 weights (FSRS-6)', () => {
      expect(FSRSParameters.default().weights).toHaveLength(21);
    });
  });

  describe('fromArray()', () => {
    it('accepts a 21-weight array as is', () => {
      const w = [...generatorParameters().w];
      expect(FSRSParameters.fromArray(w).weights).toEqual(w);
    });

    it('migrates a stored 17-weight (FSRS-4.5) array to 21 weights', () => {
      const p = FSRSParameters.fromArray(LEGACY_17);
      expect(p.weights).toHaveLength(21);
      expect(p.weights).toEqual(migrateParameters(LEGACY_17));
    });

    it('migrates a 19-weight (FSRS-5) array to 21 weights', () => {
      const w19 = migrateParameters(LEGACY_17).slice(0, 19);
      const p = FSRSParameters.fromArray(w19);
      expect(p.weights).toHaveLength(21);
      expect(p.weights.slice(0, 19)).toEqual(w19);
    });

    it('rejects arrays with an unsupported length', () => {
      expect(() => FSRSParameters.fromArray([1, 2, 3])).toThrow(/17, 19 or 21/);
      expect(() => FSRSParameters.fromArray(Array(18).fill(1) as number[])).toThrow();
    });

    it('rejects NaN values', () => {
      const bad = [...LEGACY_17];
      bad[5] = NaN;
      expect(() => FSRSParameters.fromArray(bad)).toThrow(/finite/);
    });

    it('rejects non-finite values', () => {
      const bad = [...generatorParameters().w];
      bad[0] = Infinity;
      expect(() => FSRSParameters.fromArray(bad)).toThrow(/finite/);
    });

    it('does not keep a reference to the input array', () => {
      const w = [...generatorParameters().w];
      const p = FSRSParameters.fromArray(w);
      w[0] = 99;
      expect(p.weights[0]).not.toBe(99);
    });
  });

  describe('fromJsonOrDefault()', () => {
    it('returns defaults for non-array input', () => {
      expect(FSRSParameters.fromJsonOrDefault('not-an-array').weights).toEqual(
        FSRSParameters.default().weights,
      );
    });

    it('returns defaults for null', () => {
      expect(FSRSParameters.fromJsonOrDefault(null).weights).toEqual(
        FSRSParameters.default().weights,
      );
    });

    it('returns defaults for an array with a wrong length', () => {
      expect(FSRSParameters.fromJsonOrDefault([1, 2, 3]).weights).toEqual(
        FSRSParameters.default().weights,
      );
    });

    it('returns defaults for an array with non-numbers', () => {
      const bad: unknown[] = [...LEGACY_17];
      bad[0] = 'x';
      expect(FSRSParameters.fromJsonOrDefault(bad).weights).toEqual(
        FSRSParameters.default().weights,
      );
    });

    it('migrates a stored 17-weight array instead of dropping it', () => {
      expect(FSRSParameters.fromJsonOrDefault(LEGACY_17).weights).toEqual(
        migrateParameters(LEGACY_17),
      );
    });
  });

  it('serializes and deserializes roundtrip', () => {
    const original = FSRSParameters.fromArray(LEGACY_17);
    const restored = FSRSParameters.fromArray(original.toArray());
    expect(restored.weights).toEqual(original.weights);
  });

  it('withWeights returns a new instance with updated weights', () => {
    const original = FSRSParameters.default();
    const newWeights = original.toArray().map((w, i) => (i === 0 ? w + 0.1 : w));
    const updated = original.withWeights(newWeights);
    expect(updated.weights).toEqual(newWeights);
    expect(original.weights).not.toEqual(newWeights);
  });
});
