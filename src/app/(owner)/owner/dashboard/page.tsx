import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  CheckCircle2,
  Clock,
  FileStack,
  Plus,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/application/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { ApplicationList } from '@/components/owner/ApplicationList';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

interface SummaryCard {
  key: 'total' | 'approved' | 'pending' | 'rejected';
  labelKey: string;
  count: number;
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
}

async function fetchCounts(userId: string) {
  const supabase = await createServerSupabaseClient();

  // PRD: total excludes drafts; pending = submitted+under_review+information_requested+corrections_submitted
  const [totalRes, approvedRes, pendingRes, rejectedRes] = await Promise.all([
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .neq('status', 'draft'),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'approved'),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .in('status', [
        'submitted',
        'under_review',
        'information_requested',
        'corrections_submitted',
      ]),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'rejected'),
  ]);

  return {
    total: totalRes.count ?? 0,
    approved: approvedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    rejected: rejectedRes.count ?? 0,
  };
}

export default async function OwnerDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const t = await getTranslations();
  const counts = await fetchCounts(user.id);

  const cards: SummaryCard[] = [
    {
      key: 'total',
      labelKey: 'dashboard.totalApplications',
      count: counts.total,
      icon: FileStack,
      iconClass: 'text-blue-600 dark:text-blue-300',
      bgClass: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      key: 'approved',
      labelKey: 'dashboard.approved',
      count: counts.approved,
      icon: CheckCircle2,
      iconClass: 'text-green-600 dark:text-green-300',
      bgClass: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      key: 'pending',
      labelKey: 'dashboard.pending',
      count: counts.pending,
      icon: Clock,
      iconClass: 'text-amber-600 dark:text-amber-300',
      bgClass: 'bg-amber-50 dark:bg-amber-900/30',
    },
    {
      key: 'rejected',
      labelKey: 'dashboard.rejected',
      count: counts.rejected,
      icon: XCircle,
      iconClass: 'text-red-600 dark:text-red-300',
      bgClass: 'bg-red-50 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="relative space-y-6">
      <PageHeader
        title={t('nav.dashboard')}
        description={t('dashboard.welcome')}
      />

      <section
        aria-label={t('dashboard.summary')}
        className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="overflow-hidden">
              <CardContent className="flex items-start gap-3 p-4 md:p-5">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    card.bgClass
                  )}
                  aria-hidden="true"
                >
                  <Icon className={cn('h-5 w-5', card.iconClass)} />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-2xl font-bold leading-none tabular-nums md:text-3xl">
                    {card.count}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground md:text-sm">
                    {t(card.labelKey)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="space-y-2"
            aria-label={t('common.loading')}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 w-full animate-pulse rounded-md bg-muted/60"
              />
            ))}
          </div>
        }
      >
        <ApplicationList />
      </Suspense>

      {/* Floating "New Application" button */}
      <Link
        href="/owner/applications/new"
        aria-label={t('nav.newApplication')}
        className="fixed bottom-20 right-4 z-20 inline-flex h-14 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-lg transition-transform hover:bg-brand-hover hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:bottom-6"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        <span>{t('nav.newApplication')}</span>
      </Link>
    </div>
  );
}
