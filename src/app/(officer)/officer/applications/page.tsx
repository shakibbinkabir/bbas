import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/application/PageHeader';
import { EmptyState } from '@/components/application/EmptyState';

export default async function OfficerApplicationsPage() {
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.applications')} />
      <EmptyState title={t('common.noData')} />
    </div>
  );
}
