import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserRole } from '@/types/database';
import type { UserProfile } from '@/types';

// =============================================================================
// ERROR CODES (PRD Section 20.2)
// =============================================================================
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(message: string, status: number, code: ErrorCode | string = ErrorCode.INTERNAL_ERROR, details?: unknown) {
  return NextResponse.json(
    { error: message, code, details },
    { status }
  );
}

// =============================================================================
// AUTH HELPERS — throw HttpError so route handlers can catch + return apiError
// =============================================================================
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface AuthedUser {
  authUserId: string;
  profile: UserProfile;
}

export async function getCurrentUser(
  supabase: SupabaseClient<Database>
): Promise<AuthedUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*, authority:authorities(*)')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) return null;
  return { authUserId: user.id, profile: profile as UserProfile };
}

export async function requireAuth(
  supabase: SupabaseClient<Database>
): Promise<AuthedUser> {
  const u = await getCurrentUser(supabase);
  if (!u) {
    throw new HttpError(401, 'Authentication required', ErrorCode.UNAUTHORIZED);
  }
  return u;
}

export async function requireRole(
  supabase: SupabaseClient<Database>,
  roles: UserRole[]
): Promise<AuthedUser> {
  const u = await requireAuth(supabase);
  if (!roles.includes(u.profile.role)) {
    throw new HttpError(403, 'Insufficient permissions', ErrorCode.FORBIDDEN);
  }
  return u;
}

/** Wraps an async route handler and converts HttpError + thrown errors into JSON responses. */
export async function handleRoute<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const result = await fn();
    if (result instanceof NextResponse) return result;
    return apiSuccess(result);
  } catch (err) {
    if (err instanceof HttpError) {
      return apiError(err.message, err.status, err.code, err.details);
    }
    // Next.js throws this internally during static-prerender to switch to dynamic;
    // it isn't a real error, so don't pollute logs with it.
    if (err && typeof err === 'object' && 'digest' in err && err.digest === 'DYNAMIC_SERVER_USAGE') {
      throw err;
    }
    console.error('[api] unhandled error', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500, ErrorCode.INTERNAL_ERROR);
  }
}
