import { nanoid } from 'nanoid';
import type { ICardRepository } from '../../domain/ports/outbound/ICardRepository.js';
import type { IReviewLogRepository } from '../../domain/ports/outbound/IReviewLogRepository.js';
import type { IUserRepository } from '../../domain/ports/outbound/IUserRepository.js';
import type { IGamificationRepository } from '../../domain/ports/outbound/IGamificationRepository.js';
import type { ICharacterRepository } from '../../domain/ports/outbound/ICharacterRepository.js';
import { FSRSService } from '../../domain/services/FSRSService.js';
import { GamificationService } from '../../domain/services/GamificationService.js';
import { BinaryRating } from '@memozi/shared';
import { ReviewLog } from '../../domain/entities/ReviewLog.js';
import type { Achievement } from '../../domain/entities/Gamification.js';
import type { Card } from '../../domain/entities/Card.js';
import { CardNotFoundError, CardNotOwnedByUserError, UserNotFoundError } from '../../shared/AppError.js';

export interface SubmitBinaryReviewInput {
  userId: string;
  cardId: string;
  totalMistakes: number;
}

export interface SubmitBinaryReviewOutput {
  card: Card;
  xpGained: number;
  leveledUp: boolean;
  streakDays: number;
  newAchievements: Achievement[];
}

export class SubmitBinaryReview {
  private readonly fsrsService = new FSRSService();
  private readonly gamificationService = new GamificationService();

  constructor(
    private readonly cardRepo: ICardRepository,
    private readonly reviewLogRepo: IReviewLogRepository,
    private readonly userRepo: IUserRepository,
    private readonly gamificationRepo: IGamificationRepository,
    private readonly characterRepo: ICharacterRepository,
  ) {}

  async execute(input: SubmitBinaryReviewInput): Promise<SubmitBinaryReviewOutput> {
    const card = await this.cardRepo.findById(input.cardId);
    if (!card) throw new CardNotFoundError();
    if (card.userId !== input.userId) throw new CardNotOwnedByUserError();

    const user = await this.userRepo.findById(input.userId);
    if (!user) throw new UserNotFoundError();

    const binaryRating = BinaryRating.fromHanziWriter(input.totalMistakes);
    const stateBefore = card.state;
    const reviewedAt = new Date();

    const { updatedCard } = this.fsrsService.scheduleBinary(
      card,
      binaryRating,
      user.fsrsParameters,
      reviewedAt,
    );
    await this.cardRepo.update(updatedCard);

    const log = new ReviewLog({
      id: nanoid(),
      cardId: card.id,
      userId: input.userId,
      rating: binaryRating.toSharedRating(),
      totalMistakes: input.totalMistakes,
      stateBefore,
      stateAfter: updatedCard.state,
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      elapsedDays: updatedCard.elapsedDays,
      scheduledDays: updatedCard.scheduledDays,
      reviewedAt,
    });
    await this.reviewLogRepo.create(log);

    const gamification = await this.gamificationRepo.findOrCreateByUser(input.userId);
    const xpResult = this.gamificationService.calculateXP(gamification, binaryRating.isCorrect);
    const streakResult = this.gamificationService.updateStreak(gamification, reviewedAt);

    gamification.xpTotal = xpResult.totalXP;
    gamification.streakDays = streakResult.newStreakDays;
    gamification.longestStreak = streakResult.longestStreak;
    gamification.lastActivityDate = reviewedAt;
    await this.gamificationRepo.update(gamification);

    const totalReviews = await this.reviewLogRepo.countByUser(input.userId);
    const hsk1Total = await this.characterRepo.countByHSKLevel(1);
    const hsk1Mastered = await this.cardRepo.countMasteredByUserAndHSK(input.userId, 1);
    const alreadyUnlocked = await this.gamificationRepo.getUnlockedAchievementIds(input.userId);

    const newAchievements = this.gamificationService.checkAchievements(
      {
        totalReviews,
        streakDays: gamification.streakDays,
        correctReviewsInCurrentSession: binaryRating.isCorrect ? 1 : 0,
        totalInCurrentSession: 1,
        hsk1MasteredCount: hsk1Mastered,
        hsk1TotalCount: hsk1Total,
      },
      new Set(alreadyUnlocked),
    );

    let bonusXP = 0;
    for (const ach of newAchievements) {
      await this.gamificationRepo.unlockAchievement(input.userId, ach.id);
      bonusXP += ach.xpReward;
    }
    if (bonusXP > 0) {
      gamification.xpTotal += bonusXP;
      await this.gamificationRepo.update(gamification);
    }

    return {
      card: updatedCard,
      xpGained: xpResult.xpGained + bonusXP,
      leveledUp: xpResult.leveledUp,
      streakDays: gamification.streakDays,
      newAchievements,
    };
  }
}
