import type { ICardRepository } from '../../domain/ports/outbound/ICardRepository.js';
import type { ICharacterRepository } from '../../domain/ports/outbound/ICharacterRepository.js';
import type { IUserRepository } from '../../domain/ports/outbound/IUserRepository.js';
import type { Card } from '../../domain/entities/Card.js';
import type { Character } from '../../domain/entities/Character.js';
import type { SupportedLocale } from '@memozi/shared';
import { UserNotFoundError } from '../../shared/AppError.js';

export interface DueCardItem {
  card: Card;
  character: Character;
  isNew: boolean;
}

export interface GetDueCardsOutput {
  cards: DueCardItem[];
  remaining: number;
}

export class GetDueCards {
  constructor(
    private readonly cardRepo: ICardRepository,
    private readonly characterRepo: ICharacterRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    userId: string,
    locale: SupportedLocale,
    limit = 20,
  ): Promise<GetDueCardsOutput> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new UserNotFoundError();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const dueCards = await this.cardRepo.findDueByUser(userId, limit, now);
    const remaining = limit - dueCards.length;

    const newCards: Card[] = [];
    if (remaining > 0 && user.startingHskLevel !== null) {
      const newToday = await this.cardRepo.countNewTodayByUser(userId, todayStart);
      const budget = Math.max(0, user.dailyNewCards - newToday);
      if (budget > 0) {
        const fetched = await this.cardRepo.findNewByUserAndHSK(
          userId,
          user.startingHskLevel,
          Math.min(remaining, budget),
        );
        newCards.push(...fetched);
      }
    }

    const allCards = [...dueCards, ...newCards];
    const items: DueCardItem[] = [];
    for (const card of allCards) {
      const character = await this.characterRepo.findById(card.characterId, locale);
      if (character) {
        items.push({ card, character, isNew: card.isNew });
      }
    }

    // Count total remaining due + new beyond this batch
    const totalDue = await this.cardRepo.findDueByUser(userId, 9999, now);
    const totalNew = user.startingHskLevel
      ? await this.cardRepo.findNewByUserAndHSK(userId, user.startingHskLevel, 9999)
      : [];
    const totalRemaining = Math.max(0, totalDue.length + totalNew.length - allCards.length);

    return { cards: items, remaining: totalRemaining };
  }
}
