import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/application/PageHeader';
import { ManageOfficersClient } from '@/components/officer/ManageOfficersClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/types';

export default async function ManageOfficersPage() {
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
  if (profile.role !== 'admin') {
    redirect('/officer/dashboard');
  }

  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('manageOfficers.title')}
        description={t('manageOfficers.subtitle')}
      />
      <ManageOfficersClient currentUserId={profile.id} />
    </div>
  );
}
