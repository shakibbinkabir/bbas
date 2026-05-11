import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('applications')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();

  if (data.status === 'draft' || data.status === 'information_requested') {
    redirect(`/owner/applications/new?draft=${data.id}`);
  }

  return <div>Application Detail</div>;
}
