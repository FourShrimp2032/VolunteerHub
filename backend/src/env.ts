import type { User } from "./db/schema";

export interface Env {
  DB: D1Database;
  /** Static frontend build (only bound in the production Worker). */
  ASSETS?: Fetcher;
  /** Optional R2 bucket. When absent, uploads are stored inline in D1. */
  UPLOADS?: R2Bucket;
  /** Comma-separated e-mails that become admins on registration. */
  ADMIN_EMAILS?: string;
  /** Monobank jar that supports the platform itself (separate from fundraisers). */
  PLATFORM_SUPPORT_JAR_URL?: string;
  /** Used to anonymise visitor IPs for unique-view counting. */
  VISITOR_SALT?: string;
  /** "production" enables the Secure cookie flag. */
  ENVIRONMENT?: string;
  /** Extra allowed origins for state-changing requests (comma-separated), e.g. http://localhost:3000 */
  ALLOWED_ORIGINS?: string;
  /** base64 of 32 random bytes; encrypts organizers' Monobank personal tokens at rest. */
  MONO_TOKEN_KEY?: string;
  /** Google OAuth Client ID for verifying Google ID tokens. */
  GOOGLE_CLIENT_ID?: string;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { user: User | null };
};
