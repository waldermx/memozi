/**
 * @file shared/src/practice/steps.ts
 * @description Splits a vocabulary word into the characters the learner writes.
 *
 * A card is a word, but the writing quiz works one character at a time. This
 * module turns `{ simplified, pinyin }` into an ordered list of steps. It works on
 * code points (never UTF-16 units) so characters outside the BMP stay whole.
 */

/** Minimal word data needed to build a practice session. */
export interface PracticeWordInput {
  readonly id: string | number;
  /** The word as shown to the learner, e.g. "不客气" or "T恤". */
  readonly simplified: string;
  /** Space-separated pinyin, one syllable per character, e.g. "bù kè qi". */
  readonly pinyin: string;
}

/** One character the learner has to write. */
export interface PracticeStep {
  /** 0-based position of this step among the practice steps. */
  readonly index: number;
  /** 0-based code point position of `char` inside `word` (for highlighting). */
  readonly position: number;
  readonly char: string;
  /** Syllable for this character, or null when it cannot be aligned safely. */
  readonly pinyin: string | null;
  /** The full word, kept as a visual reference. */
  readonly word: string;
  /** Number of practice steps in the word. */
  readonly total: number;
}

export type InvalidPracticeWordCode = 'EMPTY_WORD' | 'NO_CJK_CHARACTERS';

/** Thrown when a word cannot be practised as handwriting. */
export class InvalidPracticeWordError extends Error {
  readonly code: InvalidPracticeWordCode;
  readonly wordId: string | number;

  constructor(code: InvalidPracticeWordCode, wordId: string | number) {
    super(
      code === 'EMPTY_WORD'
        ? `Word ${String(wordId)} is empty`
        : `Word ${String(wordId)} has no CJK characters to write`,
    );
    this.name = 'InvalidPracticeWordError';
    this.code = code;
    this.wordId = wordId;
  }
}

const HAN = /^\p{Script=Han}$/u;

/** True when the code point is a Han character the writing quiz can handle. */
export function isHanCharacter(char: string): boolean {
  return HAN.test(char);
}

/**
 * Builds the ordered practice steps for a word.
 *
 * Non-Han characters (latin letters, spaces, "·") are not steps but remain part
 * of `word`. Pinyin is aligned per step when the syllable count matches either
 * the Han characters or every visible character; otherwise each step gets null.
 *
 * @throws {InvalidPracticeWordError} when the word is empty or has no Han characters.
 */
export function toPracticeSteps(input: PracticeWordInput): readonly PracticeStep[] {
  const word = input.simplified;
  if (word.trim() === '') {
    throw new InvalidPracticeWordError('EMPTY_WORD', input.id);
  }

  const chars = Array.from(word);
  const hanPositions = chars.flatMap((c, i) => (isHanCharacter(c) ? [i] : []));
  if (hanPositions.length === 0) {
    throw new InvalidPracticeWordError('NO_CJK_CHARACTERS', input.id);
  }

  const syllables = input.pinyin.trim().split(/\s+/u).filter((s) => s !== '');
  const syllableAt = alignSyllables(chars, hanPositions, syllables);
  const total = hanPositions.length;

  return Object.freeze(
    hanPositions.map((position, index) =>
      Object.freeze({
        index,
        position,
        char: chars[position] as string,
        pinyin: syllableAt(position, index),
        word,
        total,
      }),
    ),
  );
}

function alignSyllables(
  chars: readonly string[],
  hanPositions: readonly number[],
  syllables: readonly string[],
): (position: number, index: number) => string | null {
  if (syllables.length === hanPositions.length) {
    return (_position, index) => syllables[index] ?? null;
  }

  // Some entries spell out the non-Han part too ("T恤" → "T xù").
  const visible = chars.flatMap((c, i) => (c.trim() === '' ? [] : [i]));
  if (syllables.length === visible.length) {
    return (position) => syllables[visible.indexOf(position)] ?? null;
  }

  return () => null;
}
