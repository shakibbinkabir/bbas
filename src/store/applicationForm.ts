'use client';

import { create } from 'zustand';
import type { DocumentMeta } from '@/types';
import type { ApplicationFormValues } from '@/lib/forms/applicationFormSchema';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

interface ApplicationFormState {
  applicationId: string | null;
  currentStep: WizardStep;
  visitedSteps: Set<WizardStep>;
  documents: DocumentMeta[];
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: number | null;
  setApplicationId: (id: string | null) => void;
  setCurrentStep: (step: WizardStep) => void;
  markVisited: (step: WizardStep) => void;
  setDocuments: (docs: DocumentMeta[]) => void;
  addDocument: (doc: DocumentMeta) => void;
  removeDocumentById: (id: string) => void;
  setSaving: (saving: boolean) => void;
  setDirty: (dirty: boolean) => void;
  markSaved: () => void;
  reset: () => void;
}

const INITIAL: Pick<
  ApplicationFormState,
  | 'applicationId'
  | 'currentStep'
  | 'visitedSteps'
  | 'documents'
  | 'isSaving'
  | 'isDirty'
  | 'lastSavedAt'
> = {
  applicationId: null,
  currentStep: 1,
  visitedSteps: new Set<WizardStep>([1]),
  documents: [],
  isSaving: false,
  isDirty: false,
  lastSavedAt: null,
};

export const useApplicationFormStore = create<ApplicationFormState>((set) => ({
  ...INITIAL,
  setApplicationId: (applicationId) => set({ applicationId }),
  setCurrentStep: (step) =>
    set((s) => {
      const next = new Set<WizardStep>(s.visitedSteps);
      next.add(step);
      return { currentStep: step, visitedSteps: next };
    }),
  markVisited: (step) =>
    set((s) => {
      const next = new Set<WizardStep>(s.visitedSteps);
      next.add(step);
      return { visitedSteps: next };
    }),
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) =>
    set((s) => ({ documents: [...s.documents, doc] })),
  removeDocumentById: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
  setSaving: (isSaving) => set({ isSaving }),
  setDirty: (isDirty) => set({ isDirty }),
  markSaved: () =>
    set({ isDirty: false, isSaving: false, lastSavedAt: Date.now() }),
  reset: () =>
    set({ ...INITIAL, visitedSteps: new Set<WizardStep>([1]) }),
}));

/** Step → fields the user must complete before advancing. */
export const STEP_FIELDS: Record<WizardStep, Array<keyof ApplicationFormValues>> = {
  1: [
    'projectNameEn',
    'projectNameBn',
    'buildingType',
    'numFloors',
    'totalAreaSqft',
    'estimatedCostBdt',
  ],
  2: [
    'authorityId',
    'landMouza',
    'landKhatianNo',
    'landDagNo',
    'landAreaKatha',
    'landAddressEn',
    'landAddressBn',
  ],
  3: [],
  4: [],
  5: [],
};
