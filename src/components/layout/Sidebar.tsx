'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';
import type { UserRole } from '@/types';

interface SidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

const BASE_ITEMS = [
  { href: '/officer/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { href: '/officer/applications', icon: FileText, labelKey: 'nav.applications' },
] as const;

const ADMIN_ITEMS = [
  { href: '/officer/manage-officers', icon: Users, labelKey: 'nav.manageOfficers' },
] as const;

const PROFILE_ITEM = { href: '/officer/profile', icon: User, labelKey: 'nav.profile' } as const;

export function Sidebar({ role, collapsed = false, onToggleCollapse, className }: SidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();

  const items = [
    ...BASE_ITEMS,
    ...(role === 'admin' ? ADMIN_ITEMS : []),
    PROFILE_ITEM,
  ];

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-background transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      <div className="flex h-14 items-center border-b border-border px-3">
        {collapsed ? <Logo size="sm" href="/officer/dashboard" /> : <Logo href="/officer/dashboard" />}
      </div>

      <nav className="flex-1 overflow-y-auto p-2" aria-label="Officer navigation">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{t(item.labelKey)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {onToggleCollapse && (
        <div className="border-t border-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn('w-full', collapsed ? 'justify-center px-0' : 'justify-start gap-2')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>{t('common.close')}</span>
              </>
            )}
          </Button>
        </div>
      )}
    </aside>
  );
}
