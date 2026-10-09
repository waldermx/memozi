/**
 * @file shared/src/types/api.types.ts
 * @description API contract types shared between frontend and backend.
 *
 * These types define the shape of HTTP request bodies and response payloads.
 * The backend infers them from Zod schemas; the frontend uses them directly
 * for type-safe API calls.
 *
 * Naming convention:
 *   - `*Request`   → body/params the frontend sends to the backend
 *   - `*Response`  → payload the backend returns to the frontend
 *   - `*Dto`       → internal data transfer object (used in both directions)
 */

import type { AchievementType, CardState, HSKLevel, SupportedLocale } from './enums.js';

// ─── Common Wrappers ─────────────────────────────────────────────────────────

/** Standard successful API response wrapper */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    totalPages?: number;
    total?: number;
  };
}

/** Standard error response shape. The `requestId` helps with log correlation. */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    requestId: string;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Tokens returned on login/register. Access token goes in memory; refresh in secure storage. */
export interface AuthTokensDto {
  accessToken: string;
  /** Omitted for web clients where the refresh token is set as HttpOnly cookie */
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthUserDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  preferredLocale: SupportedLocale;
  onboardingCompleted: boolean;
  startingHSKLevel: HSKLevel | null;
}

export interface AuthResponse {
  user: AuthUserDto;
  tokens: AuthTokensDto;
}

export interface RefreshTokenRequest {
  /** Only required in mobile/native clients. Web uses the cookie automatically. */
  refreshToken?: string;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

/**
 * Payload for completing the mandatory onboarding flow.
 * These are the only three decisions the user needs to make — the rest is automatic.
 */
export interface CompleteOnboardingRequest {
  /** The HSK level the user will start from. Options: 1 or 2 (3 and 4 unlock via progression). */
  startingHSKLevel: 1 | 2;
  /** User's preferred language for definitions and UI strings. */
  preferredLocale: SupportedLocale;
  /**
   * Number of new characters to introduce per day.
   * Corresponds to the option selected in the daily goal step.
   * 5 = "5 min/day", 10 = "10 min/day" (recommended), 20 = "20 min/day".
   */
  dailyNewCards: 5 | 10 | 20;
}

// ─── Characters ──────────────────────────────────────────────────────────────

/** Full character data returned from the API, localized to the user's language. */
export interface CharacterDto {
  id: string;
  character: string;
  pinyin: string;
  definition: string;
  hskLevel: HSKLevel;
  strokeCount: number;
  radical: string;
  frequencyRank: number;
  examples: Array<{
    sentenceZh: string;
    sentenceTranslation: string;
  }>;
}

/** Character with the user's current FSRS card state attached (for study screens). */
export interface CharacterWithCardDto extends CharacterDto {
  card: CardStateDto | null;
}

// ─── FSRS Cards ──────────────────────────────────────────────────────────────

/** Snapshot of a card's FSRS state as returned by the API. */
export interface CardStateDto {
  id: string;
  state: CardState;
  due: string;     // ISO 8601 date string
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReview: string | null;
}

// ─── Review ───────────────────────────────────────────────────────────────────

/** A single item in the review queue, combining card state and character data. */
export interface DueCardDto {
  cardId: string;
  character: CharacterDto;
  card: CardStateDto;
  /** True if this is the first time the user sees this character (state === New) */
  isNew: boolean;
}

export interface GetDueCardsResponse {
  cards: DueCardDto[];
  /** How many more due/new cards exist beyond this batch */
  remaining: number;
}

/**
 * Payload for submitting a binary review result from HanziWriter.
 *
 * The `correct` field is the authoritative outcome determined by HanziWriter's
 * quiz mode `onComplete` callback. MemoZi does NOT allow the user to override this.
 */
export interface SubmitReviewRequest {
  cardId: string;
  /** true = HanziWriter completed with 0 mistakes → maps to Rating.Good(3) */
  correct: boolean;
  /** The raw mistake count from HanziWriter's quiz `onComplete` event */
  totalMistakes: number;
}

/** Response after submitting a review — includes gamification effects. */
export interface SubmitReviewResponse {
  /** Updated card state after FSRS scheduling */
  card: CardStateDto;
  /** Human-readable next review interval (e.g., "in 3 days") */
  nextReviewIn: string;
  xpGained: number;
  streakDays: number;
  leveledUp: boolean;
  /** Any newly unlocked achievements from this review */
  newAchievements: AchievementDto[];
}

// ─── Review Statistics ────────────────────────────────────────────────────────

export interface ReviewStatsResponse {
  totalCards: number;
  cardsByState: Record<CardState, number>;
  /** Retention rate as a value from 0 to 1 */
  retentionRate: number;
  streakDays: number;
  longestStreak: number;
  /** Array of {date: ISO string, count: number} for the activity heatmap */
  activityLast90Days: Array<{ date: string; count: number }>;
  /** Number of cards due per day for the next 14 days */
  forecast: Array<{ date: string; dueCount: number }>;
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export interface UserProgressResponse {
  xpTotal: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  streakDays: number;
  longestStreak: number;
  /** Cards learned per HSK level */
  progressByHSK: Record<HSKLevel, { learned: number; total: number }>;
}

export interface AchievementDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: AchievementType;
  xpReward: number;
  iconEmoji: string;
  /** ISO 8601 date when unlocked, or null if not yet unlocked */
  unlockedAt: string | null;
}

// ─── Settings / User ─────────────────────────────────────────────────────────

export interface UpdateUserSettingsRequest {
  preferredLocale?: SupportedLocale;
  dailyNewCards?: number;
  maxReviews?: number;
}
