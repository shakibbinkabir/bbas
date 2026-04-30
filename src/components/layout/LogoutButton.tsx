'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface LogoutButtonProps {
  variant?: 'default' | 'ghost' | 'outline' | 'link';
  showLabel?: boolean;
  className?: string;
}

export function LogoutButton({ variant = 'ghost', showLabel = true, className }: LogoutButtonProps) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // Server route mirrors the client-side signOut and clears server cookies.
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      router.push('/login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleLogout}
      disabled={loading}
      className={cn('gap-2', className)}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {showLabel && <span>{t('nav.logout')}</span>}
    </Button>
  );
}
