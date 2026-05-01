/**
 * Stage metadata + per-role action gating helpers (PRD Section 22.9 task 6.11).
 *
 * Pure functions. No DB access — they consult the static STAGES catalogue
 * from `src/types` and the same transition matrix the WorkflowEngine enforces.
 */

import { STAGES } from '@/types';
import type { AppStatus, UserRole, WorkflowAction } from '@/types/database';
import { FINAL_STAGE } from './engine';

const TERMINAL_STATUSES: ReadonlySet<AppStatus> = new Set<AppStatus>([
  'approved',
  'rejected',
  'withdrawn',
]);

const ADVANCE_SOURCE_STATUSES: ReadonlySet<AppStatus> = new Set<AppStatus>([
  'submitted',
  'under_review',
  'corrections_submitted',
]);

const RETURN_SOURCE_STATUSES: ReadonlySet<AppStatus> = new Set<AppStatus>([
  'submitted',
  'under_review',
  'corrections_submitted',
]);

export interface StageInfoOut {
  number: number;
  name: string;
  description: string;
  allowedActions: WorkflowAction[];
}

/** Localized stage metadata + the actions defined for that stage at the catalogue level. */
export function getStageInfo(
  stageNumber: number,
  locale: 'bn' | 'en'
): StageInfoOut {
  const stage = STAGES.find((s) => s.number === stageNumber);
  if (!stage) {
    return {
      number: stageNumber,
      name: locale === 'bn' ? 'অজানা ধাপ' : 'Unknown stage',
      description: '',
      allowedActions: [],
    };
  }
  return {
    number: stage.number,
    name: locale === 'bn' ? stage.nameBn : stage.nameEn,
    description: locale === 'bn' ? stage.descriptionBn : stage.descriptionEn,
    allowedActions: actionsForStage(stage.number),
  };
}

/** Actions a stage *could* support, ignoring status/role gates. */
function actionsForStage(stageNumber: number): WorkflowAction[] {
  if (stageNumber < 1 || stageNumber > FINAL_STAGE) return [];
  const actions: WorkflowAction[] = ['comment', 'return', 'reject'];
  if (stageNumber < FINAL_STAGE) actions.push('advance');
  if (stageNumber === FINAL_STAGE) actions.push('approve');
  return actions;
}

/** Actions the *given user* can take on an app at the given stage + status. */
export function getAllowedActions(
  stageNumber: number,
  role: UserRole,
  applicationStatus: AppStatus
): WorkflowAction[] {
  if (role === 'owner') {
    const owner: WorkflowAction[] = [];
    if (applicationStatus === 'information_requested') owner.push('submit');
    if (!TERMINAL_STATUSES.has(applicationStatus)) owner.push('withdraw');
    return owner;
  }

  if (role !== 'officer' && role !== 'admin') return [];
  if (TERMINAL_STATUSES.has(applicationStatus)) return [];

  const out: WorkflowAction[] = ['comment'];
  if (canReturn(applicationStatus, role)) out.push('return');
  if (canReject(applicationStatus, role)) out.push('reject');
  if (canAdvance(stageNumber, applicationStatus, role)) out.push('advance');
  if (canApprove(stageNumber, applicationStatus, role)) out.push('approve');
  if (role === 'admin') out.push('assign');
  return out;
}

export function canAdvance(
  stageNumber: number,
  status: AppStatus,
  role: UserRole
): boolean {
  if (role !== 'officer' && role !== 'admin') return false;
  if (!ADVANCE_SOURCE_STATUSES.has(status)) return false;
  if (stageNumber < 1 || stageNumber >= FINAL_STAGE) return false;
  // Stage 8 → 9 is admin-only.
  if (stageNumber + 1 === FINAL_STAGE && role !== 'admin') return false;
  return true;
}

export function canReturn(status: AppStatus, role: UserRole): boolean {
  if (role !== 'officer' && role !== 'admin') return false;
  return RETURN_SOURCE_STATUSES.has(status);
}

export function canReject(status: AppStatus, role: UserRole): boolean {
  if (role !== 'officer' && role !== 'admin') return false;
  return !TERMINAL_STATUSES.has(status) && status !== 'draft';
}

export function canApprove(
  stageNumber: number,
  status: AppStatus,
  role: UserRole
): boolean {
  if (role !== 'admin') return false;
  if (stageNumber !== FINAL_STAGE) return false;
  if (TERMINAL_STATUSES.has(status)) return false;
  return true;
}

export function getNextStage(current: number): number | null {
  if (current < 1 || current >= FINAL_STAGE) return null;
  return current + 1;
}
