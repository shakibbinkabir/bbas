'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { THEME_COOKIE } from '@/lib/constants';
import type { ThemePref } from '@/types';

function getInitialTheme(): ThemePref {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** useTheme — read/toggle the current theme; mirrors `dark` class on <html>. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>(getInitialTheme);
  const router = useRouter();

  // keep state in sync if the html class changes from elsewhere
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const setTheme = useCallback(
    async (next: ThemePref) => {
      document.documentElement.classList.toggle('dark', next === 'dark');
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      setThemeState(next);

      try {
        await fetch('/api/profile/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredTheme: next }),
        });
      } catch {
        /* unauthenticated — cookie alone is enough */
      }

      router.refresh();
    },
    [router]
  );

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  return { theme, setTheme, toggle };
}
