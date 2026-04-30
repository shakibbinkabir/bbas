import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/application/PageHeader';
import { ProfileForm } from '@/components/owner/ProfileForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getInitials } from '@/lib/utils';
import type { UserProfile } from '@/types';

export default async function OwnerProfilePage() {
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

  const t = await getTranslations();

  const displayName =
    profile.full_name_en || profile.full_name_bn || profile.email || profile.phone;
  const initials = getInitials(profile.full_name_en || profile.full_name_bn) || 'U';

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
              <Badge variant="secondary">{t('profile.roleOwner')}</Badge>
            </div>
            {profile.email && (
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            )}
            <p className="text-sm text-muted-foreground">{profile.phone}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 md:p-6">
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
