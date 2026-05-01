'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationModal } from '@/components/application/ConfirmationModal';
import { StepProgress } from '@/components/owner/StepProgress';
import { ProjectInfoStep } from '@/components/owner/steps/ProjectInfoStep';
import { LandInfoStep } from '@/components/owner/steps/LandInfoStep';
import { GreenInitiativesStep } from '@/components/owner/steps/GreenInitiativesStep';
import { DocumentUploadStep } from '@/components/owner/steps/DocumentUploadStep';
import { ReviewSubmitStep } from '@/components/owner/steps/ReviewSubmitStep';
import {
  STEP_FIELDS,
  useApplicationFormStore,
  type WizardStep,
} from '@/store/applicationForm';
import {
  applicationFormSchema,
  DEFAULT_FORM_VALUES,
  toDraftPayload,
  type ApplicationFormValues,
} from '@/lib/forms/applicationFormSchema';
import type { Application, Authority, DocumentMeta } from '@/types';

interface ApplicationWizardProps {
  authorities: Authority[];
}

const AUTOSAVE_INTERVAL_MS = 30_000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string })?.error ?? `Request failed (${res.status})`
    );
  }
  return (body as { data?: T }).data ?? (body as T);
}

function applicationToFormValues(app: Application): Partial<ApplicationFormValues> {
  return {
    projectNameEn: app.project_name_en ?? '',
    projectNameBn: app.project_name_bn ?? '',
    buildingType: app.building_type,
    numFloors: app.num_floors == null ? '' : (app.num_floors as never),
    totalAreaSqft:
      app.total_area_sqft == null ? '' : (app.total_area_sqft as never),
    estimatedCostBdt:
      app.estimated_cost_bdt == null ? '' : (app.estimated_cost_bdt as never),

    authorityId: app.authority_id ?? '',
    landMouza: app.land_mouza ?? '',
    landKhatianNo: app.land_khatian_no ?? '',
    landDagNo: app.land_dag_no ?? '',
    landAreaKatha:
      app.land_area_katha == null ? '' : (app.land_area_katha as never),
    landAddressEn: app.land_address_en ?? '',
    landAddressBn: app.land_address_bn ?? '',
    landLatitude:
      app.land_latitude == null ? '' : (app.land_latitude as never),
    landLongitude:
      app.land_longitude == null ? '' : (app.land_longitude as never),

    hasSolarPanel: !!app.has_solar_panel,
    hasRainwaterHarvest: !!app.has_rainwater_harvest,
    hasGreenRoof: !!app.has_green_roof,
    hasEvCharging: !!app.has_ev_charging,
    greenDescription: app.green_description ?? '',
  };
}

/** Pick the first step the user hasn't filled out yet. */
function detectResumeStep(values: Partial<ApplicationFormValues>): WizardStep {
  const step1Done =
    !!values.projectNameEn &&
    !!values.projectNameBn &&
    !!values.buildingType &&
    values.numFloors !== '' &&
    values.totalAreaSqft !== '' &&
    values.estimatedCostBdt !== '';
  if (!step1Done) return 1;
  const step2Done =
    !!values.authorityId &&
    !!values.landMouza &&
    !!values.landKhatianNo &&
    !!values.landDagNo &&
    values.landAreaKatha !== '' &&
    !!values.landAddressEn &&
    !!values.landAddressBn;
  if (!step2Done) return 2;
  return 3;
}

export function ApplicationWizard({ authorities }: ApplicationWizardProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const draftIdParam = searchParams.get('draft');

  const applicationId = useApplicationFormStore((s) => s.applicationId);
  const setApplicationId = useApplicationFormStore((s) => s.setApplicationId);
  const currentStep = useApplicationFormStore((s) => s.currentStep);
  const setCurrentStep = useApplicationFormStore((s) => s.setCurrentStep);
  const visitedSteps = useApplicationFormStore((s) => s.visitedSteps);
  const isSaving = useApplicationFormStore((s) => s.isSaving);
  const setSaving = useApplicationFormStore((s) => s.setSaving);
  const isDirty = useApplicationFormStore((s) => s.isDirty);
  const setDirty = useApplicationFormStore((s) => s.setDirty);
  const markSaved = useApplicationFormStore((s) => s.markSaved);
  const lastSavedAt = useApplicationFormStore((s) => s.lastSavedAt);
  const setDocuments = useApplicationFormStore((s) => s.setDocuments);
  const resetStore = useApplicationFormStore((s) => s.reset);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    mode: 'onTouched',
    defaultValues: useMemo(() => {
      const fallback = authorities[0]?.id ?? '';
      return { ...DEFAULT_FORM_VALUES, authorityId: fallback };
    }, [authorities]),
  });

  const valuesRef = useRef<ApplicationFormValues>(methods.getValues());
  useEffect(() => {
    const sub = methods.watch((v) => {
      valuesRef.current = v as ApplicationFormValues;
      setDirty(true);
    });
    return () => sub.unsubscribe();
  }, [methods, setDirty]);

  // ---------------------------------------------------------------------------
  // Bootstrap: create new draft OR load existing one.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        if (draftIdParam) {
          const app = await fetchJson<Application>(
            `/api/applications/${draftIdParam}`
          );
          if (cancelled) return;
          if (app.status !== 'draft' && app.status !== 'information_requested') {
            toast({
              title: t('common.error'),
              description: t('wizard.draftNoLongerEditable'),
              variant: 'destructive',
            });
            router.replace(`/owner/applications/${app.id}`);
            return;
          }
          const values = applicationToFormValues(app);
          methods.reset({ ...DEFAULT_FORM_VALUES, ...values });
          setApplicationId(app.id);
          setDocuments((app.documents ?? []) as DocumentMeta[]);
          setCurrentStep(detectResumeStep(values));
          // Reset doesn't fire `watch`, so explicitly clear dirty state.
          setDirty(false);
        } else {
          const created = await fetchJson<{ id: string; status: string }>(
            '/api/applications',
            { method: 'POST' }
          );
          if (cancelled) return;
          setApplicationId(created.id);
          // Tag the URL so a refresh resumes the same draft.
          const url = new URL(window.location.href);
          url.searchParams.set('draft', created.id);
          window.history.replaceState({}, '', url.toString());
          setDirty(false);
        }
      } catch (e) {
        toast({
          title: t('common.error'),
          description: e instanceof Error ? e.message : t('common.error'),
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // Bootstrap runs exactly once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      // Clean up store when wizard unmounts.
      resetStore();
    };
  }, [resetStore]);

  // ---------------------------------------------------------------------------
  // Save logic — debounced auto-save and explicit Save Draft.
  // ---------------------------------------------------------------------------
  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!applicationId) return false;
    setSaving(true);
    try {
      const payload = toDraftPayload(valuesRef.current);
      await fetchJson<Application>(`/api/applications/${applicationId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      markSaved();
      return true;
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('common.error'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [applicationId, markSaved, setSaving, t, toast]);

  // Auto-save every 30 seconds when there are unsaved changes.
  useEffect(() => {
    if (!applicationId) return;
    const id = setInterval(() => {
      if (useApplicationFormStore.getState().isDirty) {
        void saveDraft();
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [applicationId, saveDraft]);

  // Warn on close/refresh if the form is dirty.
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (useApplicationFormStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation handlers.
  // ---------------------------------------------------------------------------
  const goToStep = useCallback(
    async (target: WizardStep, opts: { validate?: boolean } = {}) => {
      if (opts.validate) {
        const fields = STEP_FIELDS[currentStep];
        if (fields.length > 0) {
          const ok = await methods.trigger(fields);
          if (!ok) return;
        }
      }
      // Save when leaving any step (best-effort; ignores failure).
      if (useApplicationFormStore.getState().isDirty) {
        await saveDraft();
      }
      setCurrentStep(target);
    },
    [currentStep, methods, saveDraft, setCurrentStep]
  );

  const handleNext = useCallback(async () => {
    if (currentStep >= 5) return;
    await goToStep((currentStep + 1) as WizardStep, { validate: true });
  }, [currentStep, goToStep]);

  const handleBack = useCallback(() => {
    if (currentStep <= 1) return;
    void goToStep((currentStep - 1) as WizardStep);
  }, [currentStep, goToStep]);

  const handleStepClick = useCallback(
    (step: WizardStep) => {
      if (step >= currentStep) return;
      void goToStep(step);
    },
    [currentStep, goToStep]
  );

  const handleSaveClick = useCallback(async () => {
    const ok = await saveDraft();
    if (ok) {
      toast({
        title: t('messages.savedDraft'),
      });
    }
  }, [saveDraft, t, toast]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleSubmitConfirmed = useCallback(async () => {
    if (!applicationId) return;
    setIsSubmitting(true);
    try {
      // Save latest values first so the server has the final form snapshot.
      const saved = await saveDraft();
      if (!saved) return;
      const result = await fetchJson<{
        applicationNumber: string;
        status: string;
      }>(`/api/applications/${applicationId}/submit`, { method: 'POST' });
      toast({
        title: t('messages.applicationSubmitted'),
        description: t('wizard.submittedNumber', {
          number: result.applicationNumber,
        }),
      });
      // Mark clean so beforeunload doesn't warn on the redirect.
      setDirty(false);
      router.push(`/owner/applications/${applicationId}`);
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [applicationId, router, saveDraft, setDirty, t, toast]);

  if (bootstrapping || !applicationId) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[40vh] items-center justify-center"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        <StepProgress
          currentStep={currentStep}
          visitedSteps={visitedSteps}
          onStepClick={handleStepClick}
        />

        <div className="rounded-lg border border-border bg-card p-4 md:p-6">
          {currentStep === 1 && <ProjectInfoStep />}
          {currentStep === 2 && <LandInfoStep authorities={authorities} />}
          {currentStep === 3 && <GreenInitiativesStep />}
          {currentStep === 4 && (
            <DocumentUploadStep applicationId={applicationId} />
          )}
          {currentStep === 5 && (
            <ReviewSubmitStep
              authorities={authorities}
              onEdit={(step) => void goToStep(step)}
              onSubmit={() => setConfirmSubmit(true)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('common.back')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleSaveClick}
            disabled={isSaving || isSubmitting}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {t('application.saveDraft')}
          </Button>

          {lastSavedAt && !isDirty && (
            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
              {t('wizard.savedAt', {
                time: new Date(lastSavedAt).toLocaleTimeString(),
              })}
            </span>
          )}

          <div className="ml-auto">
            {currentStep < 5 ? (
              <Button type="button" onClick={handleNext} disabled={isSaving}>
                {t('common.next')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        <ConfirmationModal
          open={confirmSubmit}
          onOpenChange={setConfirmSubmit}
          title={t('wizard.confirmSubmitTitle')}
          description={t('wizard.confirmSubmitBody')}
          confirmText={t('wizard.confirmSubmitYes')}
          cancelText={t('wizard.confirmSubmitNo')}
          onConfirm={handleSubmitConfirmed}
        />
      </div>
    </FormProvider>
  );
}
