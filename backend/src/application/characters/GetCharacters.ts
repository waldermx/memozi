import type { ICharacterRepository } from '../../domain/ports/outbound/ICharacterRepository.js';
import type { Character } from '../../domain/entities/Character.js';
import type { SupportedLocale } from '@memozi/shared';

export interface GetCharactersInput {
  hskLevel: number;
  locale: SupportedLocale;
  page: number;
  pageSize: number;
}

export interface GetCharactersOutput {
  items: Character[];
  total: number;
  page: number;
  totalPages: number;
}

export class GetCharacters {
  constructor(private readonly characterRepo: ICharacterRepository) {}

  async execute(input: GetCharactersInput): Promise<GetCharactersOutput> {
    const pageSize = Math.min(input.pageSize, 100);
    const { items, total } = await this.characterRepo.findByHSKLevel({
      hskLevel: input.hskLevel,
      locale: input.locale,
      page: input.page,
      pageSize,
    });
    return {
      items,
      total,
      page: input.page,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
