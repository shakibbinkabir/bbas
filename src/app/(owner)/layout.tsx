import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const NAV_ITEMS = [
  { href: '/owner/dashboard', labelKey: 'nav.dashboard' },
  { href: '/owner/applications', labelKey: 'nav.myApplications' },
  { href: '/owner/profile', labelKey: 'nav.profile' },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
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
  if (profile.role !== 'owner') {
    redirect('/officer/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header user={profile} profileHref="/owner/profile" navItems={NAV_ITEMS} />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-6 md:pb-10">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
