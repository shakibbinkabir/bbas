'use client';

import { useTranslations } from 'next-intl';
import type { FieldError } from 'react-hook-form';

/**
 * Map an RHF field error to a localized string. The schema sets `message` to
 * an i18n keyword (e.g. 'required', 'tooShort'); this hook resolves it via
 * the `formError.*` namespace and falls back to the literal key.
 */
export function useFieldErrorMessage() {
  const t = useTranslations('formError');
  return (error: FieldError | undefined): string | undefined => {
    if (!error) return undefined;
    const key = (error.message ?? error.type ?? 'invalid') as string;
    try {
      return t(key as never);
    } catch {
      return key;
    }
  };
}
