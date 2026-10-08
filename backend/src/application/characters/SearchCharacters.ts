import type { ICharacterRepository } from '../../domain/ports/outbound/ICharacterRepository.js';
import type { Character } from '../../domain/entities/Character.js';
import type { SupportedLocale } from '@memozi/shared';

export class SearchCharacters {
  constructor(private readonly characterRepo: ICharacterRepository) {}

  async execute(query: string, locale: SupportedLocale, limit = 20): Promise<Character[]> {
    if (!query.trim()) return [];
    return this.characterRepo.search({ query: query.trim(), locale, limit });
  }
}
