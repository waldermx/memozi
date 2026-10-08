import apiFetch from './api';
import type { UserProgressResponse, AchievementDto } from '@memozi/shared';

export const gamificationService = {
  async getProgress(): Promise<UserProgressResponse> {
    return apiFetch<UserProgressResponse>('/gamification/progress');
  },

  async getAchievements(): Promise<AchievementDto[]> {
    return apiFetch<AchievementDto[]>('/gamification/achievements');
  },
};
