import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/application/PageHeader';
import { EmptyState } from '@/components/application/EmptyState';

export default async function OwnerApplicationsPage() {
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.myApplications')} />
      <EmptyState title={t('common.noData')} />
    </div>
  );
}
