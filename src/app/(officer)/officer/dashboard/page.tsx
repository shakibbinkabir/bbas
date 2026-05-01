import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  MessageCircleWarning,
} from 'lucide-react';
import { PageHeader } from '@/components/application/PageHeader';
import { SummaryCard } from '@/components/officer/SummaryCard';
import { ApplicationQueue } from '@/components/officer/ApplicationQueue';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { toBanglaNumerals } from '@/lib/utils';
import type { UserProfile } from '@/types';

function startOfMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d.toISOString();
}

function fmt(value: number | null, locale: string): string {
  const n = value ?? 0;
  return locale === 'bn' ? toBanglaNumerals(n) : String(n);
}

export default async function OfficerDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('*, authority:authorities(*)')
    .eq('id', user.id)
    .maybeSingle();

  if (!profileData) redirect('/verify-otp');
  const profile = profileData as UserProfile;
  if (profile.role !== 'officer' && profile.role !== 'admin') {
    redirect('/owner/dashboard');
  }

  const t = await getTranslations();
  const locale = await getLocale();

  // Counts — run in parallel.
  const [myPendingRes, infoRequestedRes, completedRes, totalRes] = await Promise.all([
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_officer_id', profile.id)
      .in('status', ['submitted', 'under_review', 'corrections_submitted']),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_officer_id', profile.id)
      .eq('status', 'information_requested'),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_officer_id', profile.id)
      .in('status', ['approved', 'rejected'])
      .gte('updated_at', startOfMonth()),
    profile.role === 'admin' && profile.authority_id
      ? supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('authority_id', profile.authority_id)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const myPending = myPendingRes.count ?? 0;
  const infoRequested = infoRequestedRes.count ?? 0;
  const completed = completedRes.count ?? 0;
  const total = totalRes.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('officer.dashboardTitle')}
        description={t('officer.dashboardSubtitle')}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label={t('officer.myPending')}
          value={fmt(myPending, locale)}
          description={t('officer.myPendingDesc')}
          tone="blue"
        />
        <SummaryCard
          icon={MessageCircleWarning}
          label={t('officer.infoRequested')}
          value={fmt(infoRequested, locale)}
          description={t('officer.infoRequestedDesc')}
          tone="amber"
        />
        <SummaryCard
          icon={CheckCircle2}
          label={t('officer.completedThisMonth')}
          value={fmt(completed, locale)}
          description={t('officer.completedThisMonthDesc')}
          tone="green"
        />
        {profile.role === 'admin' && (
          <SummaryCard
            icon={Building2}
            label={t('officer.totalInAuthority')}
            value={fmt(total, locale)}
            description={t('officer.totalInAuthorityDesc')}
            tone="default"
          />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('officer.queueTitle')}</h2>
        <ApplicationQueue />
      </div>
    </div>
  );
}
