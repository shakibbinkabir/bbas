import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleRoute, requireAuth, HttpError, ErrorCode } from '@/lib/utils/api';
import { preferencesSchema } from '@/lib/validators';
import { LOCALE_COOKIE, THEME_COOKIE } from '@/lib/constants';

export async function PUT(req: NextRequest) {
  return handleRoute(async () => {
    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const body = await req.json();
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid preferences',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }

    const { preferredLanguage, preferredTheme } = parsed.data;

    const update: { preferred_language?: 'bn' | 'en'; preferred_theme?: 'light' | 'dark' } = {};
    if (preferredLanguage) update.preferred_language = preferredLanguage;
    if (preferredTheme) update.preferred_theme = preferredTheme;

    if (Object.keys(update).length === 0) {
      return profile;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(update)
      .eq('id', profile.id)
      .select('*, authority:authorities(*)')
      .single();

    if (error) {
      throw new HttpError(500, error.message, ErrorCode.INTERNAL_ERROR);
    }

    // Mirror preferences in cookies so the next request renders correctly
    // before /api/auth/me is called.
    const cookieStore = await cookies();
    if (preferredLanguage) {
      cookieStore.set(LOCALE_COOKIE, preferredLanguage, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    if (preferredTheme) {
      cookieStore.set(THEME_COOKIE, preferredTheme, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }

    return data;
  });
}
