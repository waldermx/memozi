/**
 * @file src/domain/entities/Gamification.ts
 * @description Gamification state entities: UserGamification and Achievement.
 *
 * MemoZi gamification is opinionated and purposefully constrained:
 *   - XP is the only currency (no coins, diamonds, etc.)
 *   - Levels are fixed (not user-configurable)
 *   - Streak resets at midnight in the user's timezone
 *   - Achievements are system-defined, not unlockable via purchases
 *
 * The XP level table is defined here in the domain to keep the progression
 * curve a business/design decision, not a database concern.
 */

import { AchievementType } from '@memozi/shared';

// ─── XP Level Table ───────────────────────────────────────────────────────────

/**
 * XP thresholds for each level (1-indexed: index 0 = level 1).
 *
 * Curve: each level requires ~20% more XP than the previous one.
 * Level 1 starts at 0 XP; reaching level 2 requires 100 XP, etc.
 */
const LEVEL_THRESHOLDS: readonly number[] = [
  0,     // Level 1 — starting level
  100,   // Level 2
  250,   // Level 3
  500,   // Level 4
  900,   // Level 5
  1400,  // Level 6
  2100,  // Level 7
  3000,  // Level 8
  4200,  // Level 9
  5700,  // Level 10
  7500,  // Level 11
  9800,  // Level 12
  12600, // Level 13
  16000, // Level 14
  20000, // Level 15 — "Master"
] as const;

/** XP awarded per correct review (Good rating). */
export const XP_PER_CORRECT = 10;
/** XP awarded per incorrect review (Again rating). Small reward for participation. */
export const XP_PER_INCORRECT = 2;
/** Bonus XP for completing a session with 100% accuracy. */
export const XP_PERFECT_SESSION_BONUS = 50;

/**
 * Calculate the level for a given total XP amount.
 *
 * @example
 * ```ts
 * getLevelForXP(0)   // 1
 * getLevelForXP(100) // 2
 * getLevelForXP(250) // 3
 * getLevelForXP(99)  // 1
 * ```
 */
export function getLevelForXP(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && xp >= threshold) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Get the XP range for a given level.
 *
 * @returns `{ from: number, to: number }` — the XP boundaries for this level.
 */
export function getXPRangeForLevel(level: number): { from: number; to: number } {
  const idx = level - 1;
  const from = LEVEL_THRESHOLDS[idx] ?? 0;
  const to = LEVEL_THRESHOLDS[idx + 1] ?? from + 99999;
  return { from, to };
}

// ─── UserGamification Entity ──────────────────────────────────────────────────

/**
 * Mutable gamification state for a user.
 * This is a 1:1 extension of the User entity, separated for bounded context clarity.
 */
export class UserGamification {
  id: string;
  userId: string;
  xpTotal: number;
  streakDays: number;
  longestStreak: number;
  /** Date of last review activity, used for streak calculation */
  lastActivityDate: Date | null;

  constructor(props: {
    id: string;
    userId: string;
    xpTotal?: number;
    streakDays?: number;
    longestStreak?: number;
    lastActivityDate?: Date | null;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.xpTotal = props.xpTotal ?? 0;
    this.streakDays = props.streakDays ?? 0;
    this.longestStreak = props.longestStreak ?? 0;
    this.lastActivityDate = props.lastActivityDate ?? null;
  }

  get level(): number {
    return getLevelForXP(this.xpTotal);
  }

  get xpRange(): { from: number; to: number } {
    return getXPRangeForLevel(this.level);
  }

  get progressToNextLevel(): number {
    const { from, to } = this.xpRange;
    const range = to - from;
    if (range <= 0) return 1;
    return Math.min((this.xpTotal - from) / range, 1);
  }
}

// ─── Achievement (System-defined Catalogue) ───────────────────────────────────

/**
 * A system-defined achievement. The catalogue is seeded at startup.
 * Users unlock achievements via `UserAchievement`.
 */
export class Achievement {
  readonly id: string;
  readonly slug: string;
  readonly titleEs: string;
  readonly titleEn: string;
  readonly descriptionEs: string;
  readonly descriptionEn: string;
  readonly type: AchievementType;
  readonly xpReward: number;
  readonly iconEmoji: string;
  /** Condition function used by GamificationService to check if the achievement is earned */
  readonly condition: (stats: AchievementCheckStats) => boolean;

  constructor(props: {
    id: string;
    slug: string;
    titleEs: string;
    titleEn: string;
    descriptionEs: string;
    descriptionEn: string;
    type: AchievementType;
    xpReward: number;
    iconEmoji: string;
    condition: (stats: AchievementCheckStats) => boolean;
  }) {
    this.id = props.id;
    this.slug = props.slug;
    this.titleEs = props.titleEs;
    this.titleEn = props.titleEn;
    this.descriptionEs = props.descriptionEs;
    this.descriptionEn = props.descriptionEn;
    this.type = props.type;
    this.xpReward = props.xpReward;
    this.iconEmoji = props.iconEmoji;
    this.condition = props.condition;
  }
}

/** Context passed to achievement condition functions. */
export interface AchievementCheckStats {
  totalReviews: number;
  streakDays: number;
  correctReviewsInCurrentSession: number;
  totalInCurrentSession: number;
  hsk1MasteredCount: number;
  hsk1TotalCount: number;
}

// ─── Achievement Catalogue ────────────────────────────────────────────────────

/**
 * The complete set of achievements available in the application.
 * Seeded to the database on first run. Checked by `GamificationService`.
 */
export const ACHIEVEMENT_CATALOGUE: Achievement[] = [
  new Achievement({
    id: 'ach-001',
    slug: 'first-stroke',
    titleEs: 'Primer Trazo',
    titleEn: 'First Stroke',
    descriptionEs: 'Completa tu primera revisión',
    descriptionEn: 'Complete your first review',
    type: AchievementType.Reviews,
    xpReward: 50,
    iconEmoji: '✏️',
    condition: (s) => s.totalReviews >= 1,
  }),
  new Achievement({
    id: 'ach-002',
    slug: 'streak-7',
    titleEs: 'Racha de Fuego',
    titleEn: 'On Fire',
    descriptionEs: 'Practica 7 días consecutivos',
    descriptionEn: 'Practice 7 days in a row',
    type: AchievementType.Streak,
    xpReward: 100,
    iconEmoji: '🔥',
    condition: (s) => s.streakDays >= 7,
  }),
  new Achievement({
    id: 'ach-003',
    slug: 'centurion',
    titleEs: 'Centurión',
    titleEn: 'Centurion',
    descriptionEs: 'Completa 100 revisiones en total',
    descriptionEn: 'Complete 100 total reviews',
    type: AchievementType.Reviews,
    xpReward: 150,
    iconEmoji: '💯',
    condition: (s) => s.totalReviews >= 100,
  }),
  new Achievement({
    id: 'ach-004',
    slug: 'hsk1-master',
    titleEs: 'Maestro del HSK 1',
    titleEn: 'HSK 1 Master',
    descriptionEs: 'Domina todos los caracteres del HSK 1',
    descriptionEn: 'Master all HSK 1 characters',
    type: AchievementType.Mastery,
    xpReward: 300,
    iconEmoji: '🏆',
    condition: (s) => s.hsk1TotalCount > 0 && s.hsk1MasteredCount >= s.hsk1TotalCount,
  }),
  new Achievement({
    id: 'ach-005',
    slug: 'perfect-session',
    titleEs: 'Perfeccionista',
    titleEn: 'Perfectionist',
    descriptionEs: 'Completa una sesión sin ningún error',
    descriptionEn: 'Complete a session with zero mistakes',
    type: AchievementType.Accuracy,
    xpReward: 75,
    iconEmoji: '⭐',
    condition: (s) =>
      s.totalInCurrentSession >= 5 &&
      s.correctReviewsInCurrentSession === s.totalInCurrentSession,
  }),
];
