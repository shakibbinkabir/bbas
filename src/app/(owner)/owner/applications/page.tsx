import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/application/PageHeader';
import { Button } from '@/components/ui/button';
import { ApplicationList } from '@/components/owner/ApplicationList';

export default async function OwnerApplicationsPage() {
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.myApplications')}
        action={
          <Button asChild>
            <Link href="/owner/applications/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{t('nav.newApplication')}</span>
            </Link>
          </Button>
        }
      />
      <ApplicationList />
    </div>
  );
}
