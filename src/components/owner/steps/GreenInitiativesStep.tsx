'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Droplets, Info, Sun, TreePine, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldRow } from '@/components/owner/FieldRow';
import { useFieldErrorMessage } from '@/lib/forms/errorMessages';
import { cn } from '@/lib/utils';
import type { ApplicationFormValues } from '@/lib/forms/applicationFormSchema';

interface InitiativeOption {
  field: 'hasSolarPanel' | 'hasRainwaterHarvest' | 'hasGreenRoof' | 'hasEvCharging';
  titleKey: string;
  descriptionKey: string;
  Icon: typeof Sun;
}

const INITIATIVES: InitiativeOption[] = [
  {
    field: 'hasSolarPanel',
    titleKey: 'wizard.solarPanelTitle',
    descriptionKey: 'wizard.solarPanelDesc',
    Icon: Sun,
  },
  {
    field: 'hasRainwaterHarvest',
    titleKey: 'wizard.rainwaterTitle',
    descriptionKey: 'wizard.rainwaterDesc',
    Icon: Droplets,
  },
  {
    field: 'hasGreenRoof',
    titleKey: 'wizard.greenRoofTitle',
    descriptionKey: 'wizard.greenRoofDesc',
    Icon: TreePine,
  },
  {
    field: 'hasEvCharging',
    titleKey: 'wizard.evChargingTitle',
    descriptionKey: 'wizard.evChargingDesc',
    Icon: Zap,
  },
];

export function GreenInitiativesStep() {
  const t = useTranslations();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormValues>();
  const errorMessage = useFieldErrorMessage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.step3Title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('wizard.step3Subtitle')}
        </p>
      </div>

      <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-300">
        <Info className="h-4 w-4" />
        <AlertTitle>{t('wizard.greenIncentiveTitle')}</AlertTitle>
        <AlertDescription>{t('wizard.greenIncentiveBody')}</AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2">
        {INITIATIVES.map(({ field, titleKey, descriptionKey, Icon }) => (
          <Controller
            key={field}
            control={control}
            name={field}
            render={({ field: rhf }) => {
              const checked = !!rhf.value;
              return (
                <button
                  type="button"
                  onClick={() => rhf.onChange(!checked)}
                  className={cn(
                    'group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    checked
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-border bg-card hover:border-primary/50'
                  )}
                  aria-pressed={checked}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      checked
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-semibold">{t(titleKey)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(descriptionKey)}
                    </p>
                  </div>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => rhf.onChange(!!v)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={t(titleKey)}
                    className="mt-1"
                  />
                </button>
              );
            }}
          />
        ))}
      </div>

      <FieldRow
        id="greenDescription"
        label={t('wizard.greenAdditionalDetails')}
        helper={t('wizard.greenAdditionalDetailsHelper')}
        error={errorMessage(errors.greenDescription)}
      >
        <Textarea
          id="greenDescription"
          rows={3}
          maxLength={1000}
          {...register('greenDescription')}
          aria-invalid={!!errors.greenDescription}
        />
      </FieldRow>
    </div>
  );
}
