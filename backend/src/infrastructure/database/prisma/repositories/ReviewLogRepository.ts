import type { PrismaClient } from '@prisma/client';
import type {
  IReviewLogRepository,
  ReviewActivityDay,
} from '../../../../domain/ports/outbound/IReviewLogRepository.js';
import { ReviewLog } from '../../../../domain/entities/ReviewLog.js';
import { type CardState, FSRSRating } from '@memozi/shared';

export class ReviewLogRepository implements IReviewLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(log: ReviewLog): Promise<ReviewLog> {
    const row = await this.prisma.reviewLog.create({
      data: {
        id: log.id,
        cardId: log.cardId,
        userId: log.userId,
        rating: log.rating,
        totalMistakes: log.totalMistakes,
        stateBefore: log.stateBefore,
        stateAfter: log.stateAfter,
        stability: log.stability,
        difficulty: log.difficulty,
        elapsedDays: log.elapsedDays,
        scheduledDays: log.scheduledDays,
        reviewedAt: log.reviewedAt,
      },
    });
    return new ReviewLog({
      id: row.id,
      cardId: row.cardId,
      userId: row.userId,
      rating: row.rating as FSRSRating,
      totalMistakes: row.totalMistakes,
      stateBefore: row.stateBefore as CardState,
      stateAfter: row.stateAfter as CardState,
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsedDays,
      scheduledDays: row.scheduledDays,
      reviewedAt: row.reviewedAt,
    });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.reviewLog.count({ where: { userId } });
  }

  async getActivityByUser(userId: string, daysBack: number): Promise<ReviewActivityDay[]> {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const rows = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(reviewed_at) AS date, COUNT(*) AS count
      FROM review_logs
      WHERE user_id = ${userId} AND reviewed_at >= ${since}
      GROUP BY DATE(reviewed_at)
      ORDER BY date ASC
    `;
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  async getRetentionRateByUser(userId: string): Promise<number> {
    const [result] = await this.prisma.$queryRaw<
      Array<{ good: bigint; total: bigint }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE rating = 3) AS good,
        COUNT(*) AS total
      FROM review_logs
      WHERE user_id = ${userId}
    `;
    const total = Number(result?.total ?? 0);
    const good = Number(result?.good ?? 0);
    return total === 0 ? 0 : good / total;
  }
}
