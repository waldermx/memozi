import type { PrismaClient } from '@prisma/client';
import type { IUserRepository } from '../../../../domain/ports/outbound/IUserRepository.js';
import { User } from '../../../../domain/entities/User.js';
import { FSRSParameters, SupportedLocale } from '@memozi/shared';

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toEntity(row) : null;
  }

  async findByProviderId(provider: string, providerId: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({ where: { provider, providerId } });
    return row ? this.toEntity(row) : null;
  }

  async create(user: User): Promise<User> {
    const row = await this.prisma.user.create({ data: this.toDb(user) });
    return this.toEntity(row);
  }

  async update(user: User): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id: user.id },
      data: this.toDb(user),
    });
    return this.toEntity(row);
  }

  async updateRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async updateOnboarding(
    userId: string,
    data: {
      onboardingCompleted: boolean;
      startingHskLevel: number;
      dailyNewCards: number;
      preferredLocale: string;
    },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: data.onboardingCompleted,
        startingHskLevel: data.startingHskLevel,
        dailyNewCards: data.dailyNewCards,
        preferredLocale: data.preferredLocale,
      },
    });
  }

  private toEntity(row: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    provider: string;
    passwordHash: string | null;
    providerId: string | null;
    refreshTokenHash: string | null;
    preferredLocale: string;
    fsrsParameters: unknown;
    dailyNewCards: number;
    maxReviews: number;
    onboardingCompleted: boolean;
    startingHskLevel: number | null;
    createdAt: Date;
  }): User {
    return new User({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      provider: row.provider as 'local' | 'google',
      passwordHash: row.passwordHash,
      providerId: row.providerId,
      refreshTokenHash: row.refreshTokenHash,
      preferredLocale: row.preferredLocale as SupportedLocale,
      fsrsParameters: FSRSParameters.fromJsonOrDefault(row.fsrsParameters),
      dailyNewCards: row.dailyNewCards,
      maxReviews: row.maxReviews,
      onboardingCompleted: row.onboardingCompleted,
      startingHskLevel: row.startingHskLevel,
      createdAt: row.createdAt,
    });
  }

  private toDb(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      passwordHash: user.passwordHash,
      providerId: user.providerId,
      refreshTokenHash: user.refreshTokenHash,
      preferredLocale: user.preferredLocale,
      fsrsParameters: user.fsrsParameters.toArray(),
      dailyNewCards: user.dailyNewCards,
      maxReviews: user.maxReviews,
      onboardingCompleted: user.onboardingCompleted,
      startingHskLevel: user.startingHskLevel,
    };
  }
}
