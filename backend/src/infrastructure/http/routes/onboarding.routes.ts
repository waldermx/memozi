import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRepository } from '../../database/prisma/repositories/UserRepository.js';
import { CharacterRepository } from '../../database/prisma/repositories/CharacterRepository.js';
import { CardRepository } from '../../database/prisma/repositories/CardRepository.js';
import { CompleteOnboarding } from '../../../application/onboarding/CompleteOnboarding.js';
import { SupportedLocale } from '@memozi/shared';

const OnboardingBody = z.object({
  startingHSKLevel: z.union([z.literal(1), z.literal(2)]),
  preferredLocale: z.nativeEnum(SupportedLocale),
  dailyNewCards: z.union([z.literal(5), z.literal(10), z.literal(20)]),
});

export async function registerOnboardingRoutes(app: FastifyInstance): Promise<void> {
  const userRepo = new UserRepository(app.prisma);
  const characterRepo = new CharacterRepository(app.prisma);
  const cardRepo = new CardRepository(app.prisma);

  app.post(
    '/onboarding',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Onboarding'], summary: 'Complete the mandatory onboarding flow' },
    },
    async (request, reply) => {
      const body = OnboardingBody.parse(request.body);
      const useCase = new CompleteOnboarding(userRepo, characterRepo, cardRepo);
      await useCase.execute({
        userId: request.user.id,
        startingHskLevel: body.startingHSKLevel,
        preferredLocale: body.preferredLocale,
        dailyNewCards: body.dailyNewCards,
      });
      return reply.code(204).send();
    },
  );
}
