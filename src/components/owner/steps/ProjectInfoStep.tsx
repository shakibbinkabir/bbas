'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldRow } from '@/components/owner/FieldRow';
import { NumberInput } from '@/components/owner/NumberInput';
import { useFieldErrorMessage } from '@/lib/forms/errorMessages';
import { BUILDING_TYPES } from '@/lib/constants';
import { useLocale } from '@/hooks/useLocale';
import type { ApplicationFormValues } from '@/lib/forms/applicationFormSchema';

export function ProjectInfoStep() {
  const t = useTranslations();
  const { locale } = useLocale();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormValues>();
  const errorMessage = useFieldErrorMessage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.step1Title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('wizard.step1Subtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldRow
          id="projectNameEn"
          label={t('application.projectNameEn')}
          required
          error={errorMessage(errors.projectNameEn)}
        >
          <Input
            id="projectNameEn"
            autoComplete="off"
            placeholder="My Building Project"
            {...register('projectNameEn')}
            aria-invalid={!!errors.projectNameEn}
          />
        </FieldRow>

        <FieldRow
          id="projectNameBn"
          label={t('application.projectNameBn')}
          required
          error={errorMessage(errors.projectNameBn)}
        >
          <Input
            id="projectNameBn"
            autoComplete="off"
            placeholder="আমার ভবন প্রকল্প"
            lang="bn"
            {...register('projectNameBn')}
            aria-invalid={!!errors.projectNameBn}
          />
        </FieldRow>

        <FieldRow
          id="buildingType"
          label={t('application.buildingType')}
          required
          error={errorMessage(errors.buildingType)}
        >
          <Controller
            control={control}
            name="buildingType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="buildingType"
                  aria-invalid={!!errors.buildingType}
                  aria-label={t('application.buildingType')}
                >
                  <SelectValue placeholder={t('wizard.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {BUILDING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {locale === 'bn' ? type.labelBn : type.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>

        <FieldRow
          id="numFloors"
          label={t('application.numFloors')}
          required
          error={errorMessage(errors.numFloors)}
        >
          <Controller
            control={control}
            name="numFloors"
            render={({ field }) => (
              <NumberInput
                id="numFloors"
                value={field.value as number | string}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={1}
                max={40}
                step={1}
                ariaLabel={t('application.numFloors')}
                buttonsLabels={{
                  increment: t('wizard.increment'),
                  decrement: t('wizard.decrement'),
                }}
                aria-invalid={!!errors.numFloors}
              />
            )}
          />
        </FieldRow>

        <FieldRow
          id="totalAreaSqft"
          label={t('application.totalArea')}
          required
          error={errorMessage(errors.totalAreaSqft)}
        >
          <Controller
            control={control}
            name="totalAreaSqft"
            render={({ field }) => (
              <NumberInput
                id="totalAreaSqft"
                value={field.value as number | string}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={1}
                max={10_000_000}
                step={1}
                ariaLabel={t('application.totalArea')}
                buttonsLabels={{
                  increment: t('wizard.increment'),
                  decrement: t('wizard.decrement'),
                }}
                aria-invalid={!!errors.totalAreaSqft}
              />
            )}
          />
        </FieldRow>

        <FieldRow
          id="estimatedCostBdt"
          label={t('application.estimatedCost')}
          required
          error={errorMessage(errors.estimatedCostBdt)}
        >
          <Controller
            control={control}
            name="estimatedCostBdt"
            render={({ field }) => (
              <NumberInput
                id="estimatedCostBdt"
                value={field.value as number | string}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={1}
                step={1000}
                ariaLabel={t('application.estimatedCost')}
                buttonsLabels={{
                  increment: t('wizard.increment'),
                  decrement: t('wizard.decrement'),
                }}
                aria-invalid={!!errors.estimatedCostBdt}
              />
            )}
          />
        </FieldRow>
      </div>

      <FieldRow
        id="projectDescription"
        label={t('wizard.projectDescription')}
        helper={t('wizard.projectDescriptionHelper')}
        error={errorMessage(errors.projectDescription)}
      >
        <Textarea
          id="projectDescription"
          rows={4}
          maxLength={2000}
          {...register('projectDescription')}
          aria-invalid={!!errors.projectDescription}
        />
      </FieldRow>
    </div>
  );
}
