'use client';

import { useCallback } from 'react';
import { useLocale as useNextIntlLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE } from '@/lib/constants';
import type { Locale } from '@/i18n/config';

/**
 * useLocale — read/set the current UI locale.
 *
 * The setter:
 *   1. updates the LOCALE_COOKIE cookie
 *   2. fires PUT /api/profile/preferences (best-effort; ignored if unauthenticated)
 *   3. calls router.refresh() so server components re-render with new messages
 */
export function useLocale() {
  const locale = useNextIntlLocale() as Locale;
  const router = useRouter();

  const setLocale = useCallback(
    async (next: Locale) => {
      if (next === locale) return;

      // Cookie first — guarantees the next request reads the new value.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

      // Persist to profile (silently ignore if not signed in).
      try {
        await fetch('/api/profile/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredLanguage: next }),
        });
      } catch {
        /* unauthenticated — cookie alone is enough */
      }

      router.refresh();
    },
    [locale, router]
  );

  return { locale, setLocale };
}
