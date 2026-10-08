import type { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import type { ICardRepository } from '../../../../domain/ports/outbound/ICardRepository.js';
import { Card } from '../../../../domain/entities/Card.js';
import { CardState } from '@memozi/shared';

type CardRow = {
  id: string;
  userId: string;
  characterId: string;
  state: number;
  stability: number;
  difficulty: number;
  due: Date;
  reps: number;
  lapses: number;
  lastReview: Date | null;
  elapsedDays: number;
  scheduledDays: number;
};

export class CardRepository implements ICardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findDueByUser(userId: string, limit: number, now: Date): Promise<Card[]> {
    const rows = await this.prisma.card.findMany({
      where: { userId, due: { lte: now }, state: { not: CardState.New } },
      orderBy: { due: 'asc' },
      take: limit,
    });
    return rows.map(this.toEntity);
  }

  async countNewTodayByUser(userId: string, todayStart: Date): Promise<number> {
    const rows = await this.prisma.reviewLog.findMany({
      where: { userId, reviewedAt: { gte: todayStart }, stateBefore: CardState.New },
      distinct: ['cardId'],
      select: { cardId: true },
    });
    return rows.length;
  }

  async findNewByUserAndHSK(userId: string, hskLevel: number, limit: number): Promise<Card[]> {
    const rows = await this.prisma.card.findMany({
      where: { userId, state: CardState.New, character: { hskLevel } },
      orderBy: { character: { frequencyRank: 'asc' } },
      take: limit,
    });
    return rows.map(this.toEntity);
  }

  async findById(id: string): Promise<Card | null> {
    const row = await this.prisma.card.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByUserAndCharacter(userId: string, characterId: string): Promise<Card | null> {
    const row = await this.prisma.card.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });
    return row ? this.toEntity(row) : null;
  }

  async create(card: Card): Promise<Card> {
    const row = await this.prisma.card.create({ data: this.toDb(card) });
    return this.toEntity(row);
  }

  async update(card: Card): Promise<Card> {
    const row = await this.prisma.card.update({
      where: { id: card.id },
      data: this.toDb(card),
    });
    return this.toEntity(row);
  }

  async upsert(card: Card): Promise<Card> {
    const row = await this.prisma.card.upsert({
      where: { userId_characterId: { userId: card.userId, characterId: card.characterId } },
      create: this.toDb(card),
      update: this.toDb(card),
    });
    return this.toEntity(row);
  }

  async createManyNew(userId: string, characterIds: string[]): Promise<void> {
    const now = new Date();
    await this.prisma.card.createMany({
      data: characterIds.map((characterId) => ({
        id: nanoid(),
        userId,
        characterId,
        state: CardState.New,
        stability: 0,
        difficulty: 0,
        due: now,
        reps: 0,
        lapses: 0,
        lastReview: null,
        elapsedDays: 0,
        scheduledDays: 0,
      })),
      skipDuplicates: true,
    });
  }

  async countByStateForUser(userId: string): Promise<Record<number, number>> {
    const groups = await this.prisma.card.groupBy({
      by: ['state'],
      where: { userId },
      _count: { state: true },
    });
    const result: Record<number, number> = {};
    for (const g of groups) {
      result[g.state] = g._count.state;
    }
    return result;
  }

  async countMasteredByUserAndHSK(userId: string, hskLevel: number): Promise<number> {
    return this.prisma.card.count({
      where: { userId, state: CardState.Review, character: { hskLevel } },
    });
  }

  async countLearnedByUserAndHSK(userId: string, hskLevel: number): Promise<number> {
    return this.prisma.card.count({
      where: { userId, state: { not: CardState.New }, character: { hskLevel } },
    });
  }

  private toEntity(row: CardRow): Card {
    return new Card({
      id: row.id,
      userId: row.userId,
      characterId: row.characterId,
      state: row.state as CardState,
      stability: row.stability,
      difficulty: row.difficulty,
      due: row.due,
      reps: row.reps,
      lapses: row.lapses,
      lastReview: row.lastReview,
      elapsedDays: row.elapsedDays,
      scheduledDays: row.scheduledDays,
    });
  }

  private toDb(card: Card) {
    return {
      id: card.id,
      userId: card.userId,
      characterId: card.characterId,
      state: card.state,
      stability: card.stability,
      difficulty: card.difficulty,
      due: card.due,
      reps: card.reps,
      lapses: card.lapses,
      lastReview: card.lastReview,
      elapsedDays: card.elapsedDays,
      scheduledDays: card.scheduledDays,
    };
  }
}
