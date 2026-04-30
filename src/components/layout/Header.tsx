'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types';
import { LanguageToggle } from './LanguageToggle';
import { Logo } from './Logo';
import { ProfileDropdown } from './ProfileDropdown';
import { ThemeToggle } from './ThemeToggle';

export interface NavItem {
  href: string;
  labelKey: string;
}

interface HeaderProps {
  user: UserProfile;
  profileHref: string;
  /** Visible only on desktop. */
  navItems?: NavItem[];
  /** When true, shows a mobile sidebar toggle on the left (officer layout). */
  onMobileToggle?: () => void;
  showMobileToggle?: boolean;
}

export function Header({
  user,
  profileHref,
  navItems,
  onMobileToggle,
  showMobileToggle = false,
}: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          {showMobileToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMobileToggle}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Logo href={profileHref.startsWith('/officer') ? '/officer/dashboard' : '/owner/dashboard'} />
        </div>

        {navItems && navItems.length > 0 && (
          <nav className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <ProfileDropdown user={user} profileHref={profileHref} />
        </div>
      </div>
    </header>
  );
}
