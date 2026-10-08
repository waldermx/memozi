/**
 * @file src/domain/entities/User.ts
 * @description Domain entity representing an authenticated application user.
 *
 * Supports two authentication providers:
 *   - 'local': email + bcrypt password hash
 *   - 'google': Google OAuth2, no password stored
 *
 * FSRS parameters are stored per-user to allow future personalization
 * via parameter optimization once enough review data is collected.
 */

import { FSRSParameters, SupportedLocale } from '@memozi/shared';

export type AuthProvider = 'local' | 'google';

/**
 * Invariants:
 *   - `email` is a non-empty, valid email address (enforced at application layer via Zod)
 *   - `provider === 'local'` implies `passwordHash` is set
 *   - `provider === 'google'` implies `providerId` is set
 *   - `dailyNewCards` and `maxReviews` are positive integers
 */
export class User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  provider: AuthProvider;
  /** Non-null when provider === 'local'. Bcrypt hash, never the raw password. */
  passwordHash: string | null;
  /** Non-null when provider === 'google'. The Google subject ID. */
  providerId: string | null;
  /** Hashed refresh token stored for rotation verification. Null when logged out. */
  refreshTokenHash: string | null;
  preferredLocale: SupportedLocale;
  fsrsParameters: FSRSParameters;
  dailyNewCards: number;
  maxReviews: number;
  onboardingCompleted: boolean;
  startingHskLevel: number | null;
  createdAt: Date;

  constructor(props: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    provider: AuthProvider;
    passwordHash?: string | null;
    providerId?: string | null;
    refreshTokenHash?: string | null;
    preferredLocale?: SupportedLocale;
    fsrsParameters?: FSRSParameters;
    dailyNewCards?: number;
    maxReviews?: number;
    onboardingCompleted?: boolean;
    startingHskLevel?: number | null;
    createdAt?: Date;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.displayName = props.displayName;
    this.avatarUrl = props.avatarUrl ?? null;
    this.provider = props.provider;
    this.passwordHash = props.passwordHash ?? null;
    this.providerId = props.providerId ?? null;
    this.refreshTokenHash = props.refreshTokenHash ?? null;
    this.preferredLocale = props.preferredLocale ?? SupportedLocale.ES;
    this.fsrsParameters = props.fsrsParameters ?? FSRSParameters.default();
    this.dailyNewCards = props.dailyNewCards ?? 10;
    this.maxReviews = props.maxReviews ?? 100;
    this.onboardingCompleted = props.onboardingCompleted ?? false;
    this.startingHskLevel = props.startingHskLevel ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }
}
