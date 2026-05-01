'use client';

import { useTranslations } from 'next-intl';
import {
  CarFront,
  CloudRain,
  Leaf,
  MapPin,
  Sun,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProgressBar } from '@/components/application/ProgressBar';
import { StageTimeline } from '@/components/application/StageTimeline';
import { StatusBadge } from '@/components/application/StatusBadge';
import { useLocale } from '@/hooks/useLocale';
import { BUILDING_TYPES } from '@/lib/constants';
import {
  cn,
  formatCurrency,
  formatDate,
  formatNumber,
} from '@/lib/utils';
import type { Application, BuildingType } from '@/types';

interface OverviewTabProps {
  application: Application;
}

function buildingTypeLabel(value: BuildingType, locale: 'bn' | 'en'): string {
  const meta = BUILDING_TYPES.find((b) => b.value === value);
  if (!meta) return value;
  return locale === 'bn' ? meta.labelBn : meta.labelEn;
}

function projectName(app: Application, locale: 'bn' | 'en'): string {
  const primary = locale === 'bn' ? app.project_name_bn : app.project_name_en;
  const secondary = locale === 'bn' ? app.project_name_en : app.project_name_bn;
  return primary || secondary || '—';
}

function landAddress(app: Application, locale: 'bn' | 'en'): string {
  const primary = locale === 'bn' ? app.land_address_bn : app.land_address_en;
  const secondary = locale === 'bn' ? app.land_address_en : app.land_address_bn;
  return primary || secondary || '—';
}

function authorityName(app: Application, locale: 'bn' | 'en'): string {
  if (!app.authority) return '—';
  return locale === 'bn' ? app.authority.name_bn : app.authority.name_en;
}

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

interface DataRowProps {
  label: string;
  value: React.ReactNode;
}

function DataRow({ label, value }: DataRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}

export function OverviewTab({ application }: OverviewTabProps) {
  const t = useTranslations();
  const { locale } = useLocale();

  const days = daysSince(application.submitted_at);

  const greenInitiatives: Array<{ key: string; on: boolean; Icon: typeof Leaf; label: string }> = [
    {
      key: 'solar',
      on: application.has_solar_panel,
      Icon: Sun,
      label: t('application.solarPanel'),
    },
    {
      key: 'rain',
      on: application.has_rainwater_harvest,
      Icon: CloudRain,
      label: t('application.rainwaterHarvest'),
    },
    {
      key: 'roof',
      on: application.has_green_roof,
      Icon: Leaf,
      label: t('application.greenRoof'),
    },
    {
      key: 'ev',
      on: application.has_ev_charging,
      Icon: CarFront,
      label: t('application.evCharging'),
    },
  ];

  const activeInitiatives = greenInitiatives.filter((g) => g.on);

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-mono text-sm text-muted-foreground">
                {application.application_number}
              </p>
              <h2 className="text-xl font-semibold">{projectName(application, locale)}</h2>
              <p className="text-sm text-muted-foreground">
                {authorityName(application, locale)}
              </p>
            </div>
            <StatusBadge status={application.status} />
          </div>

          <Separator />

          <div>
            <div className="mb-2 flex items-baseline justify-between text-xs text-muted-foreground">
              <span>{t('officer.currentStage')}</span>
              <span>
                {t('officer.stageOf', {
                  current: application.current_stage,
                  total: 9,
                })}
              </span>
            </div>
            <ProgressBar currentStage={application.current_stage} showLabel={false} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <KeyDate
              label={t('officer.submittedOn')}
              value={
                application.submitted_at
                  ? formatDate(application.submitted_at, locale)
                  : '—'
              }
            />
            <KeyDate
              label={t('officer.lastUpdated')}
              value={formatDate(application.updated_at, locale)}
            />
            <KeyDate
              label={t('officer.daysPending')}
              value={days === null ? '—' : String(days)}
              tone={
                days === null
                  ? undefined
                  : days > 30
                    ? 'red'
                    : days > 14
                      ? 'amber'
                      : undefined
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Visual stage timeline */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 text-base font-semibold">{t('officer.tabOverview')}</h3>
          <StageTimeline currentStage={application.current_stage} />
        </CardContent>
      </Card>

      {/* Project + Land summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-base font-semibold">{t('officer.projectSummary')}</h3>
            <dl className="divide-y divide-border">
              <DataRow
                label={t('application.projectName')}
                value={projectName(application, locale)}
              />
              <DataRow
                label={t('application.buildingType')}
                value={
                  <Badge variant="secondary" className="font-normal">
                    {buildingTypeLabel(application.building_type, locale)}
                  </Badge>
                }
              />
              <DataRow
                label={t('application.numFloors')}
                value={
                  application.num_floors !== null
                    ? formatNumber(application.num_floors, locale)
                    : '—'
                }
              />
              <DataRow
                label={t('application.totalArea')}
                value={
                  application.total_area_sqft !== null
                    ? formatNumber(application.total_area_sqft, locale)
                    : '—'
                }
              />
              <DataRow
                label={t('application.estimatedCost')}
                value={
                  application.estimated_cost_bdt !== null
                    ? formatCurrency(application.estimated_cost_bdt, locale)
                    : '—'
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-base font-semibold">{t('officer.landSummary')}</h3>
            <dl className="divide-y divide-border">
              <DataRow label={t('officer.authority')} value={authorityName(application, locale)} />
              <DataRow
                label={t('application.mouza')}
                value={application.land_mouza ?? '—'}
              />
              <DataRow
                label={t('application.khatianNo')}
                value={application.land_khatian_no ?? '—'}
              />
              <DataRow
                label={t('application.dagNo')}
                value={application.land_dag_no ?? '—'}
              />
              <DataRow
                label={t('application.landArea')}
                value={
                  application.land_area_katha !== null
                    ? formatNumber(application.land_area_katha, locale)
                    : '—'
                }
              />
              <DataRow
                label={t('application.address')}
                value={
                  <span className="inline-flex items-start gap-1">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span>{landAddress(application, locale)}</span>
                  </span>
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Green initiatives */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-base font-semibold">{t('officer.greenInitiatives')}</h3>
          {activeInitiatives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('officer.noGreenInitiatives')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeInitiatives.map(({ key, Icon, label }) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-950/40 dark:text-green-300"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          )}
          {application.green_description && (
            <p className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
              {application.green_description}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface KeyDateProps {
  label: string;
  value: string;
  tone?: 'amber' | 'red';
}

function KeyDate({ label, value, tone }: KeyDateProps) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-base font-semibold tabular-nums',
          tone === 'red' && 'text-red-600 dark:text-red-400',
          tone === 'amber' && 'text-amber-600 dark:text-amber-400'
        )}
      >
        {value}
      </p>
    </div>
  );
}
