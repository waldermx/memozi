/**
 * @file shared/src/practice/session.ts
 * @description Pure state machine for practising one word, character by character.
 *
 * The UI drives it with the hanzi-writer quiz result of each character. Every
 * transition returns a new frozen state; the input state is never touched.
 * Once the last character is recorded the word gets a single binary rating:
 * Good when every character was written with zero mistakes and none was
 * skipped, Again otherwise.
 */

import { FSRSRating } from '../types/enums.js';
import { toPracticeSteps, type PracticeStep, type PracticeWordInput } from './steps.js';

/** The only ratings a writing session can produce. */
export type PracticeRating = FSRSRating.Good | FSRSRating.Again;

/** Outcome of one character. */
export interface CharResult {
  readonly mistakes: number;
  /** True when the learner asked for the answer instead of writing it. */
  readonly skipped: boolean;
}

/** One code point of the reference word, as the UI should render it. */
export interface ReferenceChar {
  readonly char: string;
  readonly position: number;
  /** False for non-Han parts ("T", "·", spaces) that are shown but not written. */
  readonly isPracticeStep: boolean;
  readonly isDone: boolean;
  readonly isCurrent: boolean;
}

export interface WordReference {
  readonly word: string;
  /** Code point position of the character being written, null when complete. */
  readonly highlightedPosition: number | null;
  readonly chars: readonly ReferenceChar[];
}

export interface WordPracticeState {
  readonly wordId: string | number;
  readonly word: string;
  readonly steps: readonly PracticeStep[];
  /** One entry per finished character, in order. */
  readonly results: readonly CharResult[];
  /** Index of the step being written; equals `steps.length` once complete. */
  readonly currentStep: number;
  /** The step being written, or null once complete. */
  readonly current: PracticeStep | null;
  readonly isComplete: boolean;
  readonly perCharMistakes: readonly number[];
  /** One flag per finished character: true when it was skipped. */
  readonly skipped: readonly boolean[];
  readonly totalMistakes: number;
  /** Null until complete. Good iff no mistakes and nothing skipped. */
  readonly rating: PracticeRating | null;
  readonly reference: WordReference;
}

export interface CharAttempt {
  /** Mistakes reported by the quiz for this character (non-negative integer). */
  readonly mistakes: number;
}

/**
 * Starts a session for a word.
 *
 * @throws {InvalidPracticeWordError} when the word has nothing to write.
 */
export function startWordPractice(input: PracticeWordInput): WordPracticeState {
  return buildState(input.id, toPracticeSteps(input), []);
}

/**
 * Records the result of the current character and moves to the next one.
 * Recording on a complete session is a no-op and returns the same state.
 *
 * @throws {RangeError} when `mistakes` is not a non-negative integer.
 */
export function recordCharResult(
  state: WordPracticeState,
  attempt: CharAttempt,
): WordPracticeState {
  return appendResult(state, attempt.mistakes, false);
}

/**
 * Gives up on the current character (show the answer / skip) and moves on.
 * A skipped character is a failure: the word will be rated Again. Mistakes made
 * before giving up can be passed and are kept. No-op on a complete session.
 *
 * @throws {RangeError} when `mistakes` is not a non-negative integer.
 */
export function skipCharacter(
  state: WordPracticeState,
  attempt: CharAttempt = { mistakes: 0 },
): WordPracticeState {
  return appendResult(state, attempt.mistakes, true);
}

function appendResult(
  state: WordPracticeState,
  mistakes: number,
  skipped: boolean,
): WordPracticeState {
  assertValidMistakes(mistakes);
  if (state.isComplete) return state;
  return buildState(state.wordId, state.steps, [...state.results, { mistakes, skipped }]);
}

function assertValidMistakes(mistakes: number): void {
  if (!Number.isInteger(mistakes) || mistakes < 0) {
    throw new RangeError(`mistakes must be a non-negative integer, got ${String(mistakes)}`);
  }
}

function buildState(
  wordId: string | number,
  steps: readonly PracticeStep[],
  results: readonly CharResult[],
): WordPracticeState {
  const currentStep = results.length;
  const isComplete = currentStep >= steps.length;
  const current = isComplete ? null : (steps[currentStep] ?? null);
  const perCharMistakes = results.map((r) => r.mistakes);
  const skipped = results.map((r) => r.skipped);
  const totalMistakes = perCharMistakes.reduce((sum, m) => sum + m, 0);
  const word = steps[0]?.word ?? '';

  let rating: PracticeRating | null = null;
  if (isComplete) {
    const clean = totalMistakes === 0 && !skipped.includes(true);
    rating = clean ? FSRSRating.Good : FSRSRating.Again;
  }

  return Object.freeze({
    wordId,
    word,
    steps,
    results: Object.freeze(results.map((r) => Object.freeze({ ...r }))),
    currentStep,
    current,
    isComplete,
    perCharMistakes: Object.freeze(perCharMistakes),
    skipped: Object.freeze(skipped),
    totalMistakes,
    rating,
    reference: buildReference(word, steps, currentStep, current),
  });
}

function buildReference(
  word: string,
  steps: readonly PracticeStep[],
  currentStep: number,
  current: PracticeStep | null,
): WordReference {
  const stepByPosition = new Map(steps.map((s) => [s.position, s]));
  const chars = Array.from(word).map((char, position) => {
    const step = stepByPosition.get(position);
    return Object.freeze({
      char,
      position,
      isPracticeStep: step !== undefined,
      isDone: step !== undefined && step.index < currentStep,
      isCurrent: step !== undefined && step === current,
    });
  });

  return Object.freeze({
    word,
    highlightedPosition: current?.position ?? null,
    chars: Object.freeze(chars),
  });
}
