/**
 * @file src/domain/entities/Character.ts
 * @description Domain entity representing a Chinese character entry in the HSK corpus.
 *
 * A Character is the static, language-learning content — it does NOT change based on
 * user interactions. User-specific data (progress, next review date) lives in `Card`.
 *
 * I18n design: Definitions and examples are stored in separate child objects
 * (`CharacterTranslation`, `CharacterExample`) indexed by locale. The entity
 * always carries the resolved locale data for the requesting user.
 */

import type { HSKLevel, SupportedLocale } from '@memozi/shared';

// ─── Sub-types ─────────────────────────────────────────────────────────────────

/** A single localized definition entry for a character. */
export interface CharacterTranslation {
  locale: SupportedLocale;
  definition: string;
}

/** A localized example sentence for a character. */
export interface CharacterExample {
  locale: SupportedLocale;
  /** Original Chinese sentence containing the character. */
  sentenceZh: string;
  /** Translation of the sentence in the given locale. */
  sentenceTranslation: string;
}

// ─── Entity ───────────────────────────────────────────────────────────────────

/**
 * Immutable representation of a Chinese character from the HSK vocabulary list.
 *
 * @invariant `character` is a non-empty string.
 * @invariant `hskLevel` is between 1 and 4 inclusive.
 * @invariant `strokeCount` is a positive integer.
 */
export class Character {
  readonly id: string;
  readonly character: string;
  readonly pinyin: string;
  readonly hskLevel: HSKLevel;
  readonly strokeCount: number;
  readonly radical: string;
  readonly frequencyRank: number;
  /** Translations keyed by locale — always includes at least SupportedLocale.ES */
  readonly translations: ReadonlyMap<SupportedLocale, CharacterTranslation>;
  /** Example sentences keyed by locale */
  readonly examples: ReadonlyMap<SupportedLocale, CharacterExample[]>;

  constructor(props: {
    id: string;
    character: string;
    pinyin: string;
    hskLevel: HSKLevel;
    strokeCount: number;
    radical: string;
    frequencyRank: number;
    translations: CharacterTranslation[];
    examples: CharacterExample[];
  }) {
    if (!props.character) throw new Error('Character.character cannot be empty.');
    if (props.hskLevel < 1 || props.hskLevel > 4) {
      throw new Error(`Invalid HSK level: ${props.hskLevel}. Must be 1–4.`);
    }
    if (props.strokeCount <= 0) {
      throw new Error(`strokeCount must be positive, got: ${props.strokeCount}`);
    }

    this.id = props.id;
    this.character = props.character;
    this.pinyin = props.pinyin;
    this.hskLevel = props.hskLevel;
    this.strokeCount = props.strokeCount;
    this.radical = props.radical;
    this.frequencyRank = props.frequencyRank;

    this.translations = new Map(props.translations.map((t) => [t.locale, t]));

    const exampleMap = new Map<SupportedLocale, CharacterExample[]>();
    for (const ex of props.examples) {
      const existing = exampleMap.get(ex.locale) ?? [];
      existing.push(ex);
      exampleMap.set(ex.locale, existing);
    }
    this.examples = exampleMap;
  }

  /**
   * Get the definition for a given locale, falling back to Spanish if unavailable.
   *
   * @param locale - The desired locale.
   * @returns The definition string, or an empty string if no translation exists.
   */
  getDefinition(locale: SupportedLocale): string {
    return (
      this.translations.get(locale)?.definition ??
      this.translations.get('es' as SupportedLocale)?.definition ??
      ''
    );
  }

  /** Get all example sentences for a given locale. Returns empty array if none. */
  getExamples(locale: SupportedLocale): CharacterExample[] {
    return this.examples.get(locale) ?? [];
  }
}
