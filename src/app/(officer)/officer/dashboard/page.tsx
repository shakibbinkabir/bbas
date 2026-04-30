import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/application/PageHeader';
import { EmptyState } from '@/components/application/EmptyState';

export default async function OfficerDashboardPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.dashboard')} description={t('appNameLong')} />
      <EmptyState title={t('common.noData')} description={t('nav.applications')} />
    </div>
  );
}
