'use client';

import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  BUILDING_TYPES,
  getRequiredDocuments,
  getOptionalDocuments,
} from '@/lib/constants';
import { useApplicationFormStore } from '@/store/applicationForm';
import { useLocale } from '@/hooks/useLocale';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ApplicationFormValues } from '@/lib/forms/applicationFormSchema';
import type { Authority, BuildingType, DocumentType } from '@/types';

interface ReviewSubmitStepProps {
  authorities: Authority[];
  onEdit: (step: 1 | 2 | 3 | 4) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function SectionCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span>{t('common.edit')}</span>
        </Button>
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

export function ReviewSubmitStep({
  authorities,
  onEdit,
  onSubmit,
  isSubmitting,
}: ReviewSubmitStepProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const { watch } = useFormContext<ApplicationFormValues>();
  const documents = useApplicationFormStore((s) => s.documents);

  const values = watch();

  const buildingTypeMeta = BUILDING_TYPES.find((b) => b.value === values.buildingType);
  const authority = authorities.find((a) => a.id === values.authorityId);

  const required = useMemo(
    () => getRequiredDocuments(values.buildingType as BuildingType),
    [values.buildingType]
  );
  const optional = useMemo(
    () => getOptionalDocuments(values.buildingType as BuildingType),
    [values.buildingType]
  );

  const uploadedTypes = useMemo(() => {
    return new Set(documents.map((d) => d.document_type));
  }, [documents]);

  const missingRequired = required.filter((d) => !uploadedTypes.has(d.value));
  const canSubmit = missingRequired.length === 0;

  const greenSelected = [
    values.hasSolarPanel && t('wizard.solarPanelTitle'),
    values.hasRainwaterHarvest && t('wizard.rainwaterTitle'),
    values.hasGreenRoof && t('wizard.greenRoofTitle'),
    values.hasEvCharging && t('wizard.evChargingTitle'),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.step5Title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('wizard.step5Subtitle')}
        </p>
      </div>

      <SectionCard
        title={t('wizard.sectionProjectInfo')}
        onEdit={() => onEdit(1)}
      >
        <dl className="divide-y divide-border">
          <DataRow
            label={t('application.projectNameEn')}
            value={values.projectNameEn}
          />
          <DataRow
            label={t('application.projectNameBn')}
            value={values.projectNameBn}
          />
          <DataRow
            label={t('application.buildingType')}
            value={
              buildingTypeMeta
                ? locale === 'bn'
                  ? buildingTypeMeta.labelBn
                  : buildingTypeMeta.labelEn
                : values.buildingType
            }
          />
          <DataRow
            label={t('application.numFloors')}
            value={
              values.numFloors === '' ? '—' : formatNumber(Number(values.numFloors), locale)
            }
          />
          <DataRow
            label={t('application.totalArea')}
            value={
              values.totalAreaSqft === ''
                ? '—'
                : formatNumber(Number(values.totalAreaSqft), locale)
            }
          />
          <DataRow
            label={t('application.estimatedCost')}
            value={
              values.estimatedCostBdt === ''
                ? '—'
                : formatCurrency(Number(values.estimatedCostBdt), locale)
            }
          />
          {values.projectDescription && (
            <DataRow
              label={t('wizard.projectDescription')}
              value={values.projectDescription}
            />
          )}
        </dl>
      </SectionCard>

      <SectionCard
        title={t('wizard.sectionLandInfo')}
        onEdit={() => onEdit(2)}
      >
        <dl className="divide-y divide-border">
          <DataRow
            label={t('wizard.authority')}
            value={
              authority
                ? `${locale === 'bn' ? authority.name_bn : authority.name_en} (${authority.code})`
                : '—'
            }
          />
          <DataRow label={t('application.mouza')} value={values.landMouza} />
          <DataRow
            label={t('application.khatianNo')}
            value={values.landKhatianNo}
          />
          <DataRow
            label={t('application.dagNo')}
            value={values.landDagNo}
          />
          <DataRow
            label={t('application.landArea')}
            value={
              values.landAreaKatha === ''
                ? '—'
                : formatNumber(Number(values.landAreaKatha), locale)
            }
          />
          <DataRow
            label={t('application.addressEn')}
            value={values.landAddressEn}
          />
          <DataRow
            label={t('application.addressBn')}
            value={values.landAddressBn}
          />
          {(values.landLatitude !== '' || values.landLongitude !== '') && (
            <DataRow
              label="GPS"
              value={`${values.landLatitude || '—'}, ${values.landLongitude || '—'}`}
            />
          )}
        </dl>
      </SectionCard>

      <SectionCard
        title={t('wizard.sectionGreenInitiatives')}
        onEdit={() => onEdit(3)}
      >
        {greenSelected.length === 0 ? (
          <p className="text-muted-foreground">{t('wizard.noGreenSelected')}</p>
        ) : (
          <ul className="space-y-1.5">
            {greenSelected.map((label) => (
              <li key={label} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        )}
        {values.greenDescription && (
          <p className="mt-3 text-muted-foreground">{values.greenDescription}</p>
        )}
      </SectionCard>

      <SectionCard
        title={t('wizard.sectionDocuments')}
        onEdit={() => onEdit(4)}
      >
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('wizard.requiredDocsHeading')}
            </p>
            <ul className="space-y-1.5">
              {required.map((d) => {
                const ok = uploadedTypes.has(d.value as DocumentType);
                return (
                  <li key={d.value} className="flex items-center gap-2">
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <X className="h-4 w-4 text-destructive" aria-hidden="true" />
                    )}
                    <span className={cn(!ok && 'text-destructive')}>
                      {locale === 'bn' ? d.labelBn : d.labelEn}
                    </span>
                  </li>
                );
              })}
              {required.length === 0 && (
                <li className="text-muted-foreground">
                  {t('wizard.noRequiredDocs')}
                </li>
              )}
            </ul>
          </div>
          {optional.some((d) => uploadedTypes.has(d.value as DocumentType)) && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('wizard.optionalDocsHeading')}
              </p>
              <ul className="space-y-1.5">
                {optional
                  .filter((d) => uploadedTypes.has(d.value as DocumentType))
                  .map((d) => (
                    <li key={d.value} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      <span>{locale === 'bn' ? d.labelBn : d.labelEn}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </SectionCard>

      {!canSubmit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('wizard.cannotSubmitTitle')}</AlertTitle>
          <AlertDescription>
            {t('wizard.cannotSubmitBody', { count: missingRequired.length })}
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        size="lg"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
      >
        {isSubmitting ? t('wizard.submitting') : t('application.submit')}
      </Button>
    </div>
  );
}
