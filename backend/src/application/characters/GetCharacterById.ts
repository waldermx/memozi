import type { ICharacterRepository } from '../../domain/ports/outbound/ICharacterRepository.js';
import type { Character } from '../../domain/entities/Character.js';
import type { SupportedLocale } from '@memozi/shared';
import { CharacterNotFoundError } from '../../shared/AppError.js';

export class GetCharacterById {
  constructor(private readonly characterRepo: ICharacterRepository) {}

  async execute(id: string, locale: SupportedLocale): Promise<Character> {
    const character = await this.characterRepo.findById(id, locale);
    if (!character) throw new CharacterNotFoundError();
    return character;
  }
}
