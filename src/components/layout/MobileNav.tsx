'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText, LayoutDashboard, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/owner/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { href: '/owner/applications', icon: FileText, labelKey: 'nav.applications' },
  { href: '/owner/profile', icon: User, labelKey: 'nav.profile' },
] as const;

export function MobileNav() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-3">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`) ||
            (item.href === '/owner/applications' && pathname.includes('/owner/applications'));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
