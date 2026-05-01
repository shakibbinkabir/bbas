import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplicationReviewTabs } from '@/components/officer/ApplicationReviewTabs';
import { ActionPanel } from '@/components/officer/ActionPanel';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Application, DocumentMeta, UserProfile } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationReviewPage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: appData, error } = await supabase
    .from('applications')
    .select(
      '*, authority:authorities(*), owner:user_profiles!applications_owner_id_fkey(id, full_name_en, full_name_bn, phone, email), assigned_officer:user_profiles!applications_assigned_officer_id_fkey(id, full_name_en, full_name_bn, role)'
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !appData) {
    notFound();
  }
  const application = appData as Application;

  // Authority scoping
  if (
    profile.authority_id &&
    application.authority_id !== profile.authority_id
  ) {
    notFound();
  }

  const { data: documents } = await supabase
    .from('application_documents')
    .select('*')
    .eq('application_id', id)
    .order('uploaded_at', { ascending: true });

  const t = await getTranslations();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/officer/dashboard">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t('common.back')}
          </Link>
        </Button>
        <p className="font-mono text-sm text-muted-foreground">
          {application.application_number}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: tabs (≈65%) */}
        <div className="order-1 lg:col-span-8">
          <ApplicationReviewTabs
            application={application}
            documents={(documents as DocumentMeta[] | null) ?? []}
          />
        </div>

        {/* Right: action panel (≈35%) — sticky on desktop, stacked at bottom on mobile */}
        <aside className="order-2 lg:col-span-4">
          <ActionPanel application={application} currentUser={profile} />
        </aside>
      </div>
    </div>
  );
}
