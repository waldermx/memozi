import type { ICardRepository } from '../../domain/ports/outbound/ICardRepository.js';
import type { ICharacterRepository } from '../../domain/ports/outbound/ICharacterRepository.js';
import type { IGamificationRepository } from '../../domain/ports/outbound/IGamificationRepository.js';
import { getXPRangeForLevel } from '../../domain/entities/Gamification.js';
import { HSKLevel } from '@memozi/shared';

export interface HSKProgress {
  learned: number;
  total: number;
}

export interface GamificationProgressOutput {
  xpTotal: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  streakDays: number;
  longestStreak: number;
  progressByHSK: Record<HSKLevel, HSKProgress>;
}

export class GetGamificationProgress {
  constructor(
    private readonly gamificationRepo: IGamificationRepository,
    private readonly cardRepo: ICardRepository,
    private readonly characterRepo: ICharacterRepository,
  ) {}

  async execute(userId: string): Promise<GamificationProgressOutput> {
    const gamification = await this.gamificationRepo.findOrCreateByUser(userId);
    const { from, to } = getXPRangeForLevel(gamification.level);

    const hskLevels = [HSKLevel.HSK1, HSKLevel.HSK2, HSKLevel.HSK3, HSKLevel.HSK4];
    const progressByHSK = {} as Record<HSKLevel, HSKProgress>;

    await Promise.all(
      hskLevels.map(async (level) => {
        const [total, learned] = await Promise.all([
          this.characterRepo.countByHSKLevel(level),
          this.cardRepo.countLearnedByUserAndHSK(userId, level),
        ]);
        progressByHSK[level] = { total, learned };
      }),
    );

    return {
      xpTotal: gamification.xpTotal,
      level: gamification.level,
      xpForCurrentLevel: from,
      xpForNextLevel: to,
      streakDays: gamification.streakDays,
      longestStreak: gamification.longestStreak,
      progressByHSK,
    };
  }
}
