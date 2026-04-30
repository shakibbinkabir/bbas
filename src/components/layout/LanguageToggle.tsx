'use client';

import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      void setLocale(locale === 'bn' ? 'en' : 'bn');
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      aria-label={`Switch to ${locale === 'bn' ? 'English' : 'বাংলা'}`}
      className={cn('gap-2', className)}
    >
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span className="font-medium">{locale === 'bn' ? 'EN' : 'বাং'}</span>
    </Button>
  );
}
