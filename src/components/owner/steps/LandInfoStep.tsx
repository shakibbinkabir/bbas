'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FieldRow } from '@/components/owner/FieldRow';
import { NumberInput } from '@/components/owner/NumberInput';
import { useFieldErrorMessage } from '@/lib/forms/errorMessages';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';
import type { ApplicationFormValues } from '@/lib/forms/applicationFormSchema';
import type { Authority } from '@/types';

interface LandInfoStepProps {
  authorities: Authority[];
}

function HelpTooltip({ label }: { label: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={label}
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LandInfoStep({ authorities }: LandInfoStepProps) {
  const t = useTranslations();
  const { locale } = useLocale();
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ApplicationFormValues>();
  const errorMessage = useFieldErrorMessage();
  const [gpsOpen, setGpsOpen] = useState(false);

  const lat = watch('landLatitude');
  const lng = watch('landLongitude');

  // If a saved draft has GPS values, expand the section so the user can see them.
  useEffect(() => {
    if (
      (lat !== '' && lat !== null && lat !== undefined) ||
      (lng !== '' && lng !== null && lng !== undefined)
    ) {
      setGpsOpen(true);
    }
  }, [lat, lng]);

  // If there's no authority selected yet but options exist, default to the first.
  const currentAuthority = watch('authorityId');
  useEffect(() => {
    if (!currentAuthority && authorities.length > 0) {
      setValue('authorityId', authorities[0].id, { shouldDirty: false });
    }
  }, [authorities, currentAuthority, setValue]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.step2Title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('wizard.step2Subtitle')}
        </p>
      </div>

      <FieldRow
        id="authorityId"
        label={t('wizard.authority')}
        required
        error={errorMessage(errors.authorityId)}
      >
        <Controller
          control={control}
          name="authorityId"
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id="authorityId" aria-invalid={!!errors.authorityId}>
                <SelectValue placeholder={t('wizard.selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {authorities.map((auth) => (
                  <SelectItem key={auth.id} value={auth.id}>
                    {locale === 'bn' ? auth.name_bn : auth.name_en} ({auth.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldRow>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldRow
          id="landMouza"
          label={
            <span className="inline-flex items-center gap-1.5">
              {t('application.mouza')}
              <HelpTooltip label={t('wizard.mouzaTooltip')} />
            </span>
          }
          required
          error={errorMessage(errors.landMouza)}
        >
          <Input
            id="landMouza"
            autoComplete="off"
            {...register('landMouza')}
            aria-invalid={!!errors.landMouza}
          />
        </FieldRow>

        <FieldRow
          id="landKhatianNo"
          label={
            <span className="inline-flex items-center gap-1.5">
              {t('application.khatianNo')}
              <HelpTooltip label={t('wizard.khatianTooltip')} />
            </span>
          }
          required
          error={errorMessage(errors.landKhatianNo)}
        >
          <Input
            id="landKhatianNo"
            autoComplete="off"
            {...register('landKhatianNo')}
            aria-invalid={!!errors.landKhatianNo}
          />
        </FieldRow>

        <FieldRow
          id="landDagNo"
          label={
            <span className="inline-flex items-center gap-1.5">
              {t('application.dagNo')}
              <HelpTooltip label={t('wizard.dagTooltip')} />
            </span>
          }
          required
          error={errorMessage(errors.landDagNo)}
        >
          <Input
            id="landDagNo"
            autoComplete="off"
            {...register('landDagNo')}
            aria-invalid={!!errors.landDagNo}
          />
        </FieldRow>
      </div>

      <FieldRow
        id="landAreaKatha"
        label={t('application.landArea')}
        required
        error={errorMessage(errors.landAreaKatha)}
        className="md:max-w-xs"
      >
        <Controller
          control={control}
          name="landAreaKatha"
          render={({ field }) => (
            <NumberInput
              id="landAreaKatha"
              value={field.value as number | string}
              onChange={field.onChange}
              onBlur={field.onBlur}
              min={0}
              step={0.5}
              ariaLabel={t('application.landArea')}
              buttonsLabels={{
                increment: t('wizard.increment'),
                decrement: t('wizard.decrement'),
              }}
              aria-invalid={!!errors.landAreaKatha}
            />
          )}
        />
      </FieldRow>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldRow
          id="landAddressEn"
          label={t('application.addressEn')}
          required
          error={errorMessage(errors.landAddressEn)}
        >
          <Textarea
            id="landAddressEn"
            rows={3}
            {...register('landAddressEn')}
            aria-invalid={!!errors.landAddressEn}
          />
        </FieldRow>

        <FieldRow
          id="landAddressBn"
          label={t('application.addressBn')}
          required
          error={errorMessage(errors.landAddressBn)}
        >
          <Textarea
            id="landAddressBn"
            rows={3}
            lang="bn"
            {...register('landAddressBn')}
            aria-invalid={!!errors.landAddressBn}
          />
        </FieldRow>
      </div>

      <div className="rounded-lg border border-border bg-muted/30">
        <button
          type="button"
          onClick={() => setGpsOpen((v) => !v)}
          aria-expanded={gpsOpen}
          aria-controls="gps-section"
          className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
        >
          <span>{t('wizard.gpsToggleLabel')}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              gpsOpen ? 'rotate-180' : 'rotate-0'
            )}
            aria-hidden="true"
          />
        </button>
        {gpsOpen && (
          <div id="gps-section" className="grid gap-4 px-4 pb-4 md:grid-cols-2">
            <FieldRow
              id="landLatitude"
              label={t('application.latitude')}
              error={errorMessage(errors.landLatitude)}
              helper={t('wizard.latitudeHelper')}
            >
              <Input
                id="landLatitude"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="23.8103"
                {...register('landLatitude')}
                aria-invalid={!!errors.landLatitude}
              />
            </FieldRow>
            <FieldRow
              id="landLongitude"
              label={t('application.longitude')}
              error={errorMessage(errors.landLongitude)}
              helper={t('wizard.longitudeHelper')}
            >
              <Input
                id="landLongitude"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="90.4125"
                {...register('landLongitude')}
                aria-invalid={!!errors.landLongitude}
              />
            </FieldRow>
            <div className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!('geolocation' in navigator)) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setValue('landLatitude', pos.coords.latitude.toFixed(6) as never, {
                        shouldDirty: true,
                      });
                      setValue('landLongitude', pos.coords.longitude.toFixed(6) as never, {
                        shouldDirty: true,
                      });
                    },
                    () => {
                      /* user denied — ignore */
                    }
                  );
                }}
              >
                {t('wizard.useCurrentLocation')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
