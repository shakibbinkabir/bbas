import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/application/PageHeader';
import { ApplicationDetail } from '@/components/owner/ApplicationDetail';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Application } from '@/types';

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const t = await getTranslations();

  const { data } = await supabase
    .from('applications')
    .select('*, authority:authorities(*), documents:application_documents(*)')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();

  if (data.status === 'draft' || data.status === 'information_requested') {
    redirect(`/owner/applications/new?draft=${data.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.applications')}
        description={data.application_number}
      />
      <ApplicationDetail application={data as Application} />
    </div>
  );
}
