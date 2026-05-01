'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations();

  useEffect(() => {
    console.error('[app/error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{t('common.error')}</h1>
        <p className="text-sm text-muted-foreground">
          {error.digest ? `Reference: ${error.digest}` : t('errors.networkError')}
        </p>
        <Button onClick={reset}>{t('common.retry')}</Button>
      </div>
    </div>
  );
}
