/**
 * @file shared/src/types/enums.ts
 * @description Core enumerations shared between frontend and backend.
 *
 * These enums define the domain vocabulary and act as the single source of truth
 * for values that must stay in sync across the API boundary.
 */

// ─── HSK Levels ──────────────────────────────────────────────────────────────

/**
 * HSK (Hanyu Shuiping Kaoshi) proficiency levels supported by the application.
 * HSK 1 is beginner (~150 words), HSK 4 is intermediate (~1200 words total).
 * Levels 5–6 are excluded from the MVP scope.
 */
export enum HSKLevel {
  HSK1 = 1,
  HSK2 = 2,
  HSK3 = 3,
  HSK4 = 4,
}

// ─── Supported Locales ───────────────────────────────────────────────────────

/**
 * BCP 47 locale codes supported by the application.
 *
 * @design Extensible by adding new members — the backend stores the locale string
 * directly in the database, so no migration is needed to add a language.
 * The UI will show the locale selector once more than 2 are defined.
 */
export enum SupportedLocale {
  /** Spanish (default). All seed data has full ES coverage. */
  ES = 'es',
  /** English. Full coverage via CC-CEDICT. */
  EN = 'en',
}

// ─── FSRS Card State ─────────────────────────────────────────────────────────

/**
 * FSRS-5 card learning states as defined in the ts-fsrs specification.
 *
 * State transitions:
 *   New → Learning (first review)
 *   Learning → Review (after graduating)
 *   Review → Relearning (after a lapse/Again rating)
 *   Relearning → Review (after re-graduating)
 */
export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

// ─── FSRS Ratings ────────────────────────────────────────────────────────────

/**
 * FSRS-5 review rating values.
 *
 * In MemoZi, only Again (1) and Good (3) are used because HanziWriter
 * determines correctness automatically (binary). Hard (2) and Easy (4)
 * are defined here for future extensibility but are not exposed in the UI.
 *
 * @see FSRSService.scheduleBinary() in the backend domain layer
 */
export enum FSRSRating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

// ─── Achievement Types ───────────────────────────────────────────────────────

/**
 * Categories of gamification achievements.
 * Used both for badge display logic and for grouping in the UI.
 */
export enum AchievementType {
  /** Related to review count milestones */
  Reviews = 'reviews',
  /** Related to consecutive days of practice */
  Streak = 'streak',
  /** Related to HSK level mastery */
  Mastery = 'mastery',
  /** Related to accuracy performance */
  Accuracy = 'accuracy',
  /** Special or event-based achievements */
  Special = 'special',
}
