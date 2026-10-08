import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CharacterRepository } from '../../database/prisma/repositories/CharacterRepository.js';
import { GetCharacters } from '../../../application/characters/GetCharacters.js';
import { GetCharacterById } from '../../../application/characters/GetCharacterById.js';
import { SearchCharacters } from '../../../application/characters/SearchCharacters.js';
import { SupportedLocale } from '@memozi/shared';
import type { CharacterDto } from '@memozi/shared';
import type { Character } from '../../../domain/entities/Character.js';

const ListQuery = z.object({
  hskLevel: z.coerce.number().int().min(1).max(4).default(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function registerCharacterRoutes(app: FastifyInstance): Promise<void> {
  const repo = new CharacterRepository(app.prisma);

  app.get(
    '/characters',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Characters'], summary: 'List characters by HSK level (paginated)' },
    },
    async (request, reply) => {
      const query = ListQuery.parse(request.query);
      const locale = (request.user as { preferredLocale?: SupportedLocale }).preferredLocale
        ?? SupportedLocale.ES;
      const useCase = new GetCharacters(repo);
      const result = await useCase.execute({ ...query, locale });
      return reply.send({
        data: result.items.map((c) => toDto(c, locale)),
        meta: { page: result.page, totalPages: result.totalPages, total: result.total },
      });
    },
  );

  const SearchQuery = z.object({
    q: z.string().min(1),
    locale: z.nativeEnum(SupportedLocale).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  });

  app.get(
    '/characters/search',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Characters'], summary: 'Search characters by pinyin, hanzi or definition' },
    },
    async (request, reply) => {
      const { q, locale, limit } = SearchQuery.parse(request.query);
      const loc = locale ?? (request.user as { preferredLocale?: SupportedLocale }).preferredLocale ?? SupportedLocale.ES;
      const useCase = new SearchCharacters(repo);
      const results = await useCase.execute(q, loc, limit);
      return reply.send(results.map((c) => toDto(c, loc)));
    },
  );

  app.get(
    '/characters/:id',
    {
      preHandler: [app.authenticate],
      schema: { tags: ['Characters'], summary: 'Get full character details' },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const locale = SupportedLocale.ES;
      const useCase = new GetCharacterById(repo);
      const character = await useCase.execute(id, locale);
      return reply.send({ data: toDto(character, locale) });
    },
  );
}

function toDto(char: Character, locale: SupportedLocale): CharacterDto {
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
