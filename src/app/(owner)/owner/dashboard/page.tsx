import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/application/PageHeader';
import { EmptyState } from '@/components/application/EmptyState';
import { Button } from '@/components/ui/button';

export default async function OwnerDashboardPage() {
  const t = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.dashboard')}
        description={t('appNameLong')}
        action={
          <Button asChild>
            <Link href="/owner/applications/new">{t('nav.newApplication')}</Link>
          </Button>
        }
      />

      <EmptyState
        title={t('common.noData')}
        description={t('nav.myApplications')}
        action={{ label: t('nav.newApplication'), href: '/owner/applications/new' }}
      />
    </div>
  );
}
