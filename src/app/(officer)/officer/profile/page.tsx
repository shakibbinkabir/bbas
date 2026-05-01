import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { Building2, ClipboardList, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/application/PageHeader';
import { ProfileForm } from '@/components/owner/ProfileForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getInitials, toBanglaNumerals } from '@/lib/utils';
import type { UserProfile } from '@/types';

export default async function OfficerProfilePage() {
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

  const { count: assignedCount } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_officer_id', profile.id);

  const t = await getTranslations();
  const locale = await getLocale();

  const displayName =
    profile.full_name_en || profile.full_name_bn || profile.email || profile.phone;
  const initials = getInitials(profile.full_name_en || profile.full_name_bn) || 'O';
  const designation =
    profile.role === 'admin'
      ? t('officer.adminDesignation')
      : t('officer.officerDesignation');
  const roleBadge =
    profile.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleOfficer');
  const authorityName = profile.authority
    ? locale === 'bn'
      ? profile.authority.name_bn
      : profile.authority.name_en
    : '—';
  const countLabel =
    locale === 'bn' ? toBanglaNumerals(assignedCount ?? 0) : String(assignedCount ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.profile')} description={t('profile.subtitle')} />

      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-5 md:flex-row md:items-center md:p-6">
          <Avatar className="h-16 w-16 text-lg">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{displayName}</h2>
              <Badge variant="secondary">{roleBadge}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{designation}</p>
            {profile.email && (
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            )}
            <p className="text-sm text-muted-foreground">{profile.phone}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label={t('officer.designation')}
          value={designation}
        />
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          label={t('officer.authority')}
          value={authorityName}
        />
        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label={t('officer.assignedApplications')}
          value={countLabel}
        />
      </div>

      <Card>
        <CardContent className="p-5 md:p-6">
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-base font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
