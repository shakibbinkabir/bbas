'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/application/StatusBadge';
import { StageBadge } from '@/components/application/StageBadge';
import { ProgressBar } from '@/components/application/ProgressBar';
import { StageTimeline } from '@/components/application/StageTimeline';
import { DocumentList } from '@/components/application/DocumentList';
import { useLocale } from '@/hooks/useLocale';
import { BUILDING_TYPES } from '@/lib/constants';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';
import type { Application, BuildingType } from '@/types';

interface ApplicationDetailProps {
  application: Application;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </header>
      <div className="px-4 py-3 text-sm">{children}</div>
    </section>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="col-span-2 break-words">{value || '—'}</dd>
    </div>
  );
}

export function ApplicationDetail({ application }: ApplicationDetailProps) {
  const t = useTranslations();
  const { locale } = useLocale();

  const buildingTypeLabel = useMemo(() => {
    const meta = BUILDING_TYPES.find(
      (b) => b.value === application.building_type
    );
    if (!meta) return application.building_type;
    return locale === 'bn' ? meta.labelBn : meta.labelEn;
  }, [application.building_type, locale]);

  const authorityLabel = application.authority
    ? `${locale === 'bn' ? application.authority.name_bn : application.authority.name_en} (${application.authority.code})`
    : '—';

  const greenSelected = [
    application.has_solar_panel && t('wizard.solarPanelTitle'),
    application.has_rainwater_harvest && t('wizard.rainwaterTitle'),
    application.has_green_roof && t('wizard.greenRoofTitle'),
    application.has_ev_charging && t('wizard.evChargingTitle'),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">
              {application.application_number}
            </h2>
            <StatusBadge status={application.status} />
            <Badge variant="secondary" className="font-normal">
              {buildingTypeLabel}
            </Badge>
          </div>
          <StageBadge stage={application.current_stage} />
        </div>
        <div className="md:w-1/3">
          <ProgressBar currentStage={application.current_stage} showLabel />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title={t('wizard.sectionProjectInfo')}>
            <dl className="divide-y divide-border">
              <DataRow
                label={t('application.projectNameEn')}
                value={application.project_name_en}
              />
              <DataRow
                label={t('application.projectNameBn')}
                value={application.project_name_bn}
              />
              <DataRow
                label={t('application.buildingType')}
                value={buildingTypeLabel}
              />
              <DataRow
                label={t('application.numFloors')}
                value={
                  application.num_floors == null
                    ? '—'
                    : formatNumber(application.num_floors, locale)
                }
              />
              <DataRow
                label={t('application.totalArea')}
                value={
                  application.total_area_sqft == null
                    ? '—'
                    : formatNumber(application.total_area_sqft, locale)
                }
              />
              <DataRow
                label={t('application.estimatedCost')}
                value={
                  application.estimated_cost_bdt == null
                    ? '—'
                    : formatCurrency(application.estimated_cost_bdt, locale)
                }
              />
            </dl>
          </Section>

          <Section title={t('wizard.sectionLandInfo')}>
            <dl className="divide-y divide-border">
              <DataRow label={t('wizard.authority')} value={authorityLabel} />
              <DataRow
                label={t('application.mouza')}
                value={application.land_mouza}
              />
              <DataRow
                label={t('application.khatianNo')}
                value={application.land_khatian_no}
              />
              <DataRow
                label={t('application.dagNo')}
                value={application.land_dag_no}
              />
              <DataRow
                label={t('application.landArea')}
                value={
                  application.land_area_katha == null
                    ? '—'
                    : formatNumber(application.land_area_katha, locale)
                }
              />
              <DataRow
                label={t('application.addressEn')}
                value={application.land_address_en}
              />
              <DataRow
                label={t('application.addressBn')}
                value={application.land_address_bn}
              />
              {(application.land_latitude != null ||
                application.land_longitude != null) && (
                <DataRow
                  label="GPS"
                  value={`${application.land_latitude ?? '—'}, ${application.land_longitude ?? '—'}`}
                />
              )}
            </dl>
          </Section>

          <Section title={t('wizard.sectionGreenInitiatives')}>
            {greenSelected.length === 0 ? (
              <p className="text-muted-foreground">
                {t('wizard.noGreenSelected')}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {greenSelected.map((label) => (
                  <li key={label} className="flex items-center gap-2">
                    <Check
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            )}
            {application.green_description && (
              <p className="mt-3 text-muted-foreground">
                {application.green_description}
              </p>
            )}
          </Section>

          <Section title={t('wizard.sectionDocuments')}>
            <DocumentList
              applicationId={application.id}
              documents={application.documents ?? []}
              mode="owner"
              editable={false}
              buildingType={application.building_type as BuildingType}
            />
          </Section>
        </div>

        <div className="space-y-5">
          <Section title={t('officer.keyDates')}>
            <dl className="divide-y divide-border">
              <DataRow
                label={t('officer.submittedOn')}
                value={
                  application.submitted_at
                    ? formatDateTime(application.submitted_at, locale)
                    : '—'
                }
              />
              <DataRow
                label={t('officer.lastUpdated')}
                value={formatDateTime(application.updated_at, locale)}
              />
              {application.approved_at && (
                <DataRow
                  label={t('status.approved')}
                  value={formatDateTime(application.approved_at, locale)}
                />
              )}
              {application.rejected_at && (
                <DataRow
                  label={t('status.rejected')}
                  value={formatDateTime(application.rejected_at, locale)}
                />
              )}
            </dl>
            {application.rejection_reason && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {application.rejection_reason}
              </div>
            )}
          </Section>

          <Section title={t('stage.current')}>
            <StageTimeline currentStage={application.current_stage} />
          </Section>
        </div>
      </div>

      <div>
        <Button variant="outline" asChild>
          <Link href="/owner/dashboard">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('common.back')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
