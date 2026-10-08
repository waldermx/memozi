import type { IUserRepository } from '../../domain/ports/outbound/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';
import type { SupportedLocale } from '@memozi/shared';
import { UserNotFoundError } from '../../shared/AppError.js';

export interface UpdateUserSettingsInput {
  userId: string;
  preferredLocale?: SupportedLocale;
  dailyNewCards?: number;
  maxReviews?: number;
}

export class UpdateUserSettings {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: UpdateUserSettingsInput): Promise<User> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) throw new UserNotFoundError();

    if (input.preferredLocale !== undefined) user.preferredLocale = input.preferredLocale;
    if (input.dailyNewCards !== undefined) user.dailyNewCards = input.dailyNewCards;
    if (input.maxReviews !== undefined) user.maxReviews = input.maxReviews;

    return this.userRepo.update(user);
  }
}
