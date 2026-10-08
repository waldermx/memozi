import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  ICharacterRepository,
  CharacterListOptions,
  CharacterSearchOptions,
} from '../../../../domain/ports/outbound/ICharacterRepository.js';
import { Character } from '../../../../domain/entities/Character.js';
import { type SupportedLocale, type HSKLevel } from '@memozi/shared';

type CharacterRow = Prisma.CharacterGetPayload<{
  include: { translations: true; examples: true };
}>;

export class CharacterRepository implements ICharacterRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, _locale: SupportedLocale): Promise<Character | null> {
    const row = await this.prisma.character.findUnique({
      where: { id },
      include: { translations: true, examples: true },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByHSKLevel(
    options: CharacterListOptions,
  ): Promise<{ items: Character[]; total: number }> {
    const { hskLevel, page, pageSize } = options;
    const skip = (page - 1) * pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.character.findMany({
        where: { hskLevel },
        include: { translations: true, examples: true },
        orderBy: { frequencyRank: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.character.count({ where: { hskLevel } }),
    ]);
    return { items: rows.map((r) => this.toEntity(r)), total };
  }

  async search(options: CharacterSearchOptions): Promise<Character[]> {
    const { query, locale, limit = 20 } = options;
    const rows = await this.prisma.character.findMany({
      where: {
        OR: [
          { character: { contains: query } },
          { pinyin: { contains: query, mode: 'insensitive' } },
          {
            translations: {
              some: { definition: { contains: query, mode: 'insensitive' }, locale },
            },
          },
        ],
      },
      include: { translations: true, examples: true },
      take: Math.min(limit, 50),
      orderBy: { frequencyRank: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async countByHSKLevel(hskLevel: number): Promise<number> {
    return this.prisma.character.count({ where: { hskLevel } });
  }

  async findIdsByHSKLevel(hskLevel: number): Promise<string[]> {
    const rows = await this.prisma.character.findMany({
      where: { hskLevel },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private toEntity(row: CharacterRow): Character {
    return new Character({
      id: row.id,
      character: row.character,
      pinyin: row.pinyin,
      hskLevel: row.hskLevel as HSKLevel,
      strokeCount: row.strokeCount,
      radical: row.radical,
      frequencyRank: row.frequencyRank,
      translations: row.translations.map((t) => ({
        locale: t.locale as SupportedLocale,
        definition: t.definition,
      })),
      examples: row.examples.map((e) => ({
        locale: e.locale as SupportedLocale,
        sentenceZh: e.sentenceZh,
        sentenceTranslation: e.sentenceTranslation,
      })),
    });
  }
}
