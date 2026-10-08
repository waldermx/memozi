import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CardRepository } from '../../database/prisma/repositories/CardRepository.js';
import { CharacterRepository } from '../../database/prisma/repositories/CharacterRepository.js';
import { UserRepository } from '../../database/prisma/repositories/UserRepository.js';
import { ReviewLogRepository } from '../../database/prisma/repositories/ReviewLogRepository.js';
import { GamificationRepository } from '../../database/prisma/repositories/GamificationRepository.js';
import { GetDueCards } from '../../../application/review/GetDueCards.js';
import { SubmitBinaryReview } from '../../../application/review/SubmitBinaryReview.js';
import { GetReviewStats } from '../../../application/review/GetReviewStats.js';
import { SupportedLocale } from '@memozi/shared';
import type { DueCardDto, SubmitReviewResponse, CardStateDto } from '@memozi/shared';
import type { Character } from '../../../domain/entities/Character.js';
import type { Card } from '../../../domain/entities/Card.js';
import type { Achievement } from '../../../domain/entities/Gamification.js';

const SubmitBody = z.object({
  cardId: z.string(),
  correct: z.boolean(),
  totalMistakes: z.coerce.number().int().min(0),
});

export async function registerReviewRoutes(app: FastifyInstance): Promise<void> {
  const cardRepo = new CardRepository(app.prisma);
  const characterRepo = new CharacterRepository(app.prisma);
  const userRepo = new UserRepository(app.prisma);
  const reviewLogRepo = new ReviewLogRepository(app.prisma);
  const gamificationRepo = new GamificationRepository(app.prisma);

  app.get(
    '/review/due',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Review'], summary: 'Get due cards for review session' },
    },
    async (request, reply) => {
      const userId = request.user.id;
      const locale = SupportedLocale.ES;
      const useCase = new GetDueCards(cardRepo, characterRepo, userRepo);
      const result = await useCase.execute(userId, locale);

      const cards: DueCardDto[] = result.cards.map(({ card, character, isNew }) => ({
        cardId: card.id,
        character: toCharacterDto(character, locale),
        card: toCardStateDto(card),
        isNew,
      }));

      return reply.send({ data: { cards, remaining: result.remaining } });
    },
  );

  app.post(
    '/review/submit',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Review'], summary: 'Submit binary review result from HanziWriter' },
    },
    async (request, reply) => {
      const body = SubmitBody.parse(request.body);
      const useCase = new SubmitBinaryReview(
        cardRepo, reviewLogRepo, userRepo, gamificationRepo, characterRepo,
      );
      const result = await useCase.execute({
        userId: request.user.id,
        cardId: body.cardId,
        totalMistakes: body.totalMistakes,
      });

      const response: SubmitReviewResponse = {
        card: toCardStateDto(result.card),
        nextReviewIn: result.card.nextReviewDescription(),
        xpGained: result.xpGained,
        streakDays: result.streakDays,
        leveledUp: result.leveledUp,
        newAchievements: result.newAchievements.map((a) => toAchievementDto(a, 'es')),
      };
      return reply.send({ data: response });
    },
  );

  app.get(
    '/review/stats',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Review'], summary: 'Get review statistics and activity heatmap' },
    },
    async (request, reply) => {
      const useCase = new GetReviewStats(cardRepo, reviewLogRepo, gamificationRepo);
      const stats = await useCase.execute(request.user.id);
      return reply.send({ data: stats });
    },
  );

  app.get(
    '/review/forecast',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Review'], summary: 'Get scheduled card count for the next 14 days' },
    },
    async (request, reply) => {
      const useCase = new GetReviewStats(cardRepo, reviewLogRepo, gamificationRepo);
      const stats = await useCase.execute(request.user.id);
      return reply.send({ data: { forecast: stats.forecast } });
    },
  );
}

function toCharacterDto(char: Character, locale: SupportedLocale) {
  return {
    id: char.id,
    character: char.character,
    pinyin: char.pinyin,
    definition: char.getDefinition(locale),
    hskLevel: char.hskLevel,
    strokeCount: char.strokeCount,
    radical: char.radical,
    frequencyRank: char.frequencyRank,
    examples: char.getExamples(locale).map((e) => ({
      sentenceZh: e.sentenceZh,
      sentenceTranslation: e.sentenceTranslation,
    })),
  };
}

function toCardStateDto(card: Card): CardStateDto {
  return {
    id: card.id,
    state: card.state,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.lastReview?.toISOString() ?? null,
  };
}

function toAchievementDto(ach: Achievement, locale: 'es' | 'en') {
  return {
    id: ach.id,
    slug: ach.slug,
    title: locale === 'en' ? ach.titleEn : ach.titleEs,
    description: locale === 'en' ? ach.descriptionEn : ach.descriptionEs,
    type: ach.type,
    xpReward: ach.xpReward,
    iconEmoji: ach.iconEmoji,
    unlockedAt: new Date().toISOString(),
  };
}
