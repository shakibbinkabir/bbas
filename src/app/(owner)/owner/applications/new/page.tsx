import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/application/PageHeader';
import { ApplicationWizard } from '@/components/owner/ApplicationWizard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Authority } from '@/types';

export default async function NewApplicationPage() {
  const t = await getTranslations();
  const supabase = await createServerSupabaseClient();

  const { data: authorities } = await supabase
    .from('authorities')
    .select('*')
    .eq('is_active', true)
    .order('code', { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.newApplication')}
        description={t('wizard.pageSubtitle')}
      />
      <ApplicationWizard authorities={(authorities ?? []) as Authority[]} />
    </div>
  );
}
