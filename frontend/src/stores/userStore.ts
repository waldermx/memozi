import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Achievement {
  id: string;
  titleEs: string;
  descriptionEs: string;
  iconEmoji: string;
  xpReward: number;
  type: 'reviews' | 'streak' | 'mastery' | 'accuracy' | 'special';
  unlocked: boolean;
  unlockedAt?: string;
}

export interface UserState {
  // Identity
  userId: string | null;
  displayName: string;
  email: string;
  avatarId: string; // emoji avatar key e.g. "panda", "dragon"
  token: string | null;

  // Gamification
  xpTotal: number;
  level: number;
  xpToNextLevel: number;
  streakDays: number;
  longestStreak: number;
  lastActivityDate: string | null;

  // Progress
  totalReviews: number;
  charactersMastered: number;
  lifetimeAccuracy: number;
  hskLevel: number;

  // Achievements
  achievements: Achievement[];

  // Activity (last 90 days YYYY-MM-DD → count)
  activityHeatmap: Record<string, number>;

  // Settings
  preferredLocale: string;
  dailyGoal: number;

  // Onboarding & guest
  onboardingCompleted: boolean;
  guestReviews: number;
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9000, 13000];

function levelFromXP(xp: number): { level: number; xpToNextLevel: number } {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 5000;
  return { level, xpToNextLevel: nextThreshold - xp };
}

interface UserActions {
  setUser(data: Partial<UserState>): void;
  setToken(token: string | null): void;
  setAvatar(avatarId: string): void;
  addXP(amount: number): void;
  recordActivity(): void;
  unlockAchievement(id: string): void;
  setAchievements(achievements: Achievement[]): void;
  updateHeatmap(date: string, count: number): void;
  incrementGuestReviews(): void;
  logout(): void;
}

const INITIAL_STATE: UserState = {
  userId: null,
  displayName: 'Estudiante',
  email: '',
  avatarId: 'panda',
  token: null,
  xpTotal: 0,
  level: 1,
  xpToNextLevel: 100,
  streakDays: 0,
  longestStreak: 0,
  lastActivityDate: null,
  totalReviews: 0,
  charactersMastered: 0,
  lifetimeAccuracy: 0,
  hskLevel: 1,
  achievements: [],
  activityHeatmap: {},
  preferredLocale: 'es',
  dailyGoal: 10,
  onboardingCompleted: false,
  guestReviews: 0,
};

export const useUserStore = create<UserState & UserActions>()(
  persist(
    immer((set) => ({
      ...INITIAL_STATE,

      setUser(data) {
        set((s) => { Object.assign(s, data); });
      },

      setToken(token) {
        set((s) => { s.token = token; });
      },

      setAvatar(avatarId) {
        set((s) => { s.avatarId = avatarId; });
      },

      addXP(amount) {
        set((s) => {
          s.xpTotal += amount;
          const { level, xpToNextLevel } = levelFromXP(s.xpTotal);
          s.level = level;
          s.xpToNextLevel = xpToNextLevel;
        });
      },

      recordActivity() {
        set((s) => {
          const today = new Date().toISOString().split('T')[0];
          s.activityHeatmap[today] = (s.activityHeatmap[today] ?? 0) + 1;
          if (s.lastActivityDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (s.lastActivityDate === yesterday) {
              s.streakDays += 1;
            } else if (s.lastActivityDate !== today) {
              s.streakDays = 1;
            }
            s.lastActivityDate = today;
            if (s.streakDays > s.longestStreak) {
              s.longestStreak = s.streakDays;
            }
          }
        });
      },

      unlockAchievement(id) {
        set((s) => {
          const a = s.achievements.find((a) => a.id === id);
          if (a && !a.unlocked) {
            a.unlocked = true;
            a.unlockedAt = new Date().toISOString();
          }
        });
      },

      setAchievements(achievements) {
        set((s) => { s.achievements = achievements; });
      },

      updateHeatmap(date, count) {
        set((s) => { s.activityHeatmap[date] = count; });
      },

      incrementGuestReviews() {
        set((s) => { s.guestReviews += 1; });
      },

      logout() {
        set((s) => { Object.assign(s, INITIAL_STATE); });
      },
    })),
    {
      name: 'memozi-user',
      partialize: (s) => ({
        userId: s.userId,
        displayName: s.displayName,
        email: s.email,
        avatarId: s.avatarId,
        token: s.token,
        xpTotal: s.xpTotal,
        level: s.level,
        xpToNextLevel: s.xpToNextLevel,
        streakDays: s.streakDays,
        longestStreak: s.longestStreak,
        lastActivityDate: s.lastActivityDate,
        totalReviews: s.totalReviews,
        charactersMastered: s.charactersMastered,
        lifetimeAccuracy: s.lifetimeAccuracy,
        hskLevel: s.hskLevel,
        achievements: s.achievements,
        activityHeatmap: s.activityHeatmap,
        preferredLocale: s.preferredLocale,
        dailyGoal: s.dailyGoal,
        onboardingCompleted: s.onboardingCompleted,
        guestReviews: s.guestReviews,
      }),
    },
  ),
);
