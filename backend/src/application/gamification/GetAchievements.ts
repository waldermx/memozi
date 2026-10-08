import type { IGamificationRepository } from '../../domain/ports/outbound/IGamificationRepository.js';
import { ACHIEVEMENT_CATALOGUE } from '../../domain/entities/Gamification.js';
import type { AchievementDto } from '@memozi/shared';

export class GetAchievements {
  constructor(private readonly gamificationRepo: IGamificationRepository) {}

  async execute(userId: string, locale: 'es' | 'en'): Promise<AchievementDto[]> {
    const unlocked = await this.gamificationRepo.getUnlockedAchievements(userId);
    const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

    return ACHIEVEMENT_CATALOGUE.map((ach) => ({
      id: ach.id,
      slug: ach.slug,
      title: locale === 'en' ? ach.titleEn : ach.titleEs,
      description: locale === 'en' ? ach.descriptionEn : ach.descriptionEs,
      type: ach.type,
      xpReward: ach.xpReward,
      iconEmoji: ach.iconEmoji,
      unlockedAt: unlockedMap.get(ach.id)?.toISOString() ?? null,
    }));
  }
}
