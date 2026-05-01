import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">404</h1>
        <p className="text-base text-muted-foreground">{t('errors.notFound')}</p>
        <Button asChild>
          <Link href="/">{t('common.back')}</Link>
        </Button>
      </div>
    </div>
  );
}
