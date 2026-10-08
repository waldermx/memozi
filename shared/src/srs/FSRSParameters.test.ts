import { describe, it, expect } from 'vitest';
import { FSRSParameters } from './FSRSParameters.js';

describe('FSRSParameters', () => {
  it('creates default params with 17 weights', () => {
    expect(FSRSParameters.default().weights).toHaveLength(17);
  });

  it('rejects array with wrong length', () => {
    expect(() => FSRSParameters.fromArray([1, 2, 3])).toThrow();
  });

  it('rejects array with NaN values', () => {
    const bad = Array(17).fill(1) as number[];
    bad[5] = NaN;
    expect(() => FSRSParameters.fromArray(bad)).toThrow();
  });

  it('fromJsonOrDefault returns defaults for invalid input', () => {
    expect(FSRSParameters.fromJsonOrDefault('not-an-array').weights).toEqual(
      FSRSParameters.default().weights,
    );
  });

  it('fromJsonOrDefault returns defaults for null', () => {
    expect(FSRSParameters.fromJsonOrDefault(null).weights).toEqual(
      FSRSParameters.default().weights,
    );
  });

  it('fromJsonOrDefault catches array with wrong length', () => {
    expect(FSRSParameters.fromJsonOrDefault([1, 2, 3]).weights).toEqual(
      FSRSParameters.default().weights,
    );
  });

  it('serializes and deserializes roundtrip', () => {
    const original = FSRSParameters.default();
    const restored = FSRSParameters.fromArray(original.toArray());
    expect(restored.weights).toEqual(original.weights);
  });

  it('withWeights returns a new instance with updated weights', () => {
    const original = FSRSParameters.default();
    const newWeights = original.toArray().map((w) => w * 1.01);
    const updated = original.withWeights(newWeights);
    expect(updated.weights).toEqual(newWeights);
    expect(original.weights).not.toEqual(newWeights);
  });
});
