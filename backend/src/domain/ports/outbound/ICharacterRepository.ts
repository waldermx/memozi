/**
 * @file src/domain/ports/outbound/ICharacterRepository.ts
 * @description Outbound port for character data persistence.
 *
 * In hexagonal architecture, this interface is defined in the domain layer.
 * The infrastructure layer provides the concrete Prisma implementation.
 * The application layer only depends on this interface — never on Prisma directly.
 */

import type { SupportedLocale } from '@memozi/shared';
import type { Character } from '../../entities/Character.js';

export interface CharacterSearchOptions {
  /** Free-text search across hanzi character, pinyin, and definition */
  query: string;
  locale: SupportedLocale;
  limit?: number;
}

export interface CharacterListOptions {
  hskLevel: number;
  locale: SupportedLocale;
  page: number;
  pageSize: number;
}

export interface ICharacterRepository {
  /**
   * Find a single character by its ID, with translations in the given locale.
   * Returns null if not found.
   */
  findById(id: string, locale: SupportedLocale): Promise<Character | null>;

  /**
   * Return a paginated list of characters for a given HSK level.
   * Results are ordered by frequency_rank ascending (most common first).
   */
  findByHSKLevel(options: CharacterListOptions): Promise<{
    items: Character[];
    total: number;
  }>;

  /**
   * Full-text search across hanzi, pinyin, and definitions in the given locale.
   * Limited to `options.limit` results (default 20, max 50).
   */
  search(options: CharacterSearchOptions): Promise<Character[]>;

  /**
   * Count the total number of characters at a given HSK level.
   * Used for progress calculation ("learned X / Y characters").
   */
  countByHSKLevel(hskLevel: number): Promise<number>;

  /**
   * Return only character IDs for a given HSK level (no translations loaded).
   * Used by CompleteOnboarding to bulk-create cards efficiently.
   */
  findIdsByHSKLevel(hskLevel: number): Promise<string[]>;
}
