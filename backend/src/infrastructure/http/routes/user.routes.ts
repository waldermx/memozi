import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserRepository } from '../../database/prisma/repositories/UserRepository.js';
import { GetUserProfile } from '../../../application/users/GetUserProfile.js';
import { UpdateUserSettings } from '../../../application/users/UpdateUserSettings.js';
import { SupportedLocale } from '@memozi/shared';

const SettingsBody = z.object({
  preferredLocale: z.nativeEnum(SupportedLocale).optional(),
  dailyNewCards: z.number().int().min(1).max(50).optional(),
  maxReviews: z.number().int().min(1).max(500).optional(),
});

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  const userRepo = new UserRepository(app.prisma);

  app.get(
    '/users/me',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Users'], summary: 'Get current user profile' },
    },
    async (request, reply) => {
      const useCase = new GetUserProfile(userRepo);
      const user = await useCase.execute(request.user.id);
      return reply.send({
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          preferredLocale: user.preferredLocale,
          dailyNewCards: user.dailyNewCards,
          maxReviews: user.maxReviews,
          onboardingCompleted: user.onboardingCompleted,
          startingHSKLevel: user.startingHskLevel,
          createdAt: user.createdAt.toISOString(),
        },
      });
    },
  );

  app.patch(
    '/users/me/settings',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Users'], summary: 'Update user settings (locale, daily goals)' },
    },
    async (request, reply) => {
      const body = SettingsBody.parse(request.body);
      const useCase = new UpdateUserSettings(userRepo);
      const user = await useCase.execute({
        userId: request.user.id,
        ...(body.preferredLocale !== undefined && { preferredLocale: body.preferredLocale }),
        ...(body.dailyNewCards !== undefined && { dailyNewCards: body.dailyNewCards }),
        ...(body.maxReviews !== undefined && { maxReviews: body.maxReviews }),
      });
      return reply.send({
        data: {
          preferredLocale: user.preferredLocale,
          dailyNewCards: user.dailyNewCards,
          maxReviews: user.maxReviews,
        },
      });
    },
  );
}
