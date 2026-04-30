import { redirect } from 'next/navigation';
import { OfficerShell } from '@/components/layout/OfficerShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function OfficerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, authority:authorities(*)')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/verify-otp');
  }
  if (profile.role !== 'officer' && profile.role !== 'admin') {
    redirect('/owner/dashboard');
  }

  return <OfficerShell user={profile}>{children}</OfficerShell>;
}
