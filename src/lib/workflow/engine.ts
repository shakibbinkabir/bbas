/**
 * 9-Stage Workflow Engine — PRD Section 10.2.
 *
 * This module is the single source of truth for workflow state transitions.
 * Routes under /api/workflow/* and /api/applications/[id]/{withdraw,submit-corrections}
 * delegate to this class so the rules below are enforced uniformly.
 *
 * Methods never throw — they return TransitionResult so callers can map
 * errorCode to an appropriate HTTP status. Internal validation failures
 * are reported via { success: false, error, errorCode }.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  AppStatus,
  UserRole,
  WorkflowAction,
} from '@/types/database';

export const MIN_COMMENT_LENGTH = 20;
export const FINAL_STAGE = 9;

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

export type WorkflowErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface ApplicationSnapshot {
  id: string;
  application_number: string | null;
  owner_id: string;
  authority_id: string;
  assigned_officer_id: string | null;
  status: AppStatus;
  current_stage: number;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

export interface PerformerProfile {
  id: string;
  role: UserRole;
  authority_id: string | null;
  full_name_en: string | null;
  full_name_bn: string | null;
  is_active: boolean;
}

export interface TransitionResult {
  success: boolean;
  application?: ApplicationSnapshot;
  error?: string;
  errorCode?: WorkflowErrorCode;
}

export interface TransitionInput {
  applicationId: string;
  performedBy: string;
  performerRole: UserRole;
  comment?: string;
}

export class WorkflowEngine {
  constructor(private supabase: SupabaseClient<Database>) {}

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------

  async advance(input: TransitionInput): Promise<TransitionResult> {
    const ctx = await this.loadOfficerContext(input);
    if (!ctx.success) return ctx;
    const { app, performer } = ctx;

    if (!ADVANCE_SOURCE_STATUSES.has(app.status)) {
      return fail(
        'VALIDATION_ERROR',
        `Cannot advance an application in status '${app.status}'`
      );
    }
    if (app.current_stage >= FINAL_STAGE) {
      return fail(
        'VALIDATION_ERROR',
        'Application is already at the final stage'
      );
    }

    const nextStage = app.current_stage + 1;

    // Stage 8 → 9 is gated to admin only (final-approval entry).
    if (nextStage === FINAL_STAGE && performer.role !== 'admin') {
      return fail(
        'FORBIDDEN',
        'Only an admin may advance an application to the final stage'
      );
    }

    const fromStage = app.current_stage;
    const fromStatus = app.status;
    const nextStatus: AppStatus = 'under_review';

    const updated = await this.updateApplication(app.id, {
      current_stage: nextStage,
      status: nextStatus,
    });
    if (!updated.success) return updated;

    const histErr = await this.logHistory({
      applicationId: app.id,
      fromStage,
      toStage: nextStage,
      fromStatus,
      toStatus: nextStatus,
      action: 'advance',
      performedBy: performer.id,
      comments: input.comment ?? null,
    });
    if (histErr) return histErr;

    return { success: true, application: updated.application };
  }

  async return(
    input: TransitionInput & { comment: string }
  ): Promise<TransitionResult> {
    const commentErr = validateRequiredComment(input.comment, 'Comment');
    if (commentErr) return commentErr;

    const ctx = await this.loadOfficerContext(input);
    if (!ctx.success) return ctx;
    const { app, performer } = ctx;

    if (!RETURN_SOURCE_STATUSES.has(app.status)) {
      return fail(
        'VALIDATION_ERROR',
        `Cannot return an application in status '${app.status}'`
      );
    }

    const fromStatus = app.status;
    const nextStatus: AppStatus = 'information_requested';

    const updated = await this.updateApplication(app.id, {
      status: nextStatus,
    });
    if (!updated.success) return updated;

    const histErr = await this.logHistory({
      applicationId: app.id,
      fromStage: app.current_stage,
      toStage: app.current_stage,
      fromStatus,
      toStatus: nextStatus,
      action: 'return',
      performedBy: performer.id,
      comments: input.comment.trim(),
    });
    if (histErr) return histErr;

    return { success: true, application: updated.application };
  }

  async reject(
    input: TransitionInput & { reason: string }
  ): Promise<TransitionResult> {
    const reasonErr = validateRequiredComment(input.reason, 'Rejection reason');
    if (reasonErr) return reasonErr;

    const ctx = await this.loadOfficerContext(input);
    if (!ctx.success) return ctx;
    const { app, performer } = ctx;

    if (TERMINAL_STATUSES.has(app.status)) {
      return fail(
        'CONFLICT',
        `Application is already in terminal status '${app.status}'`
      );
    }

    const fromStatus = app.status;
    const nextStatus: AppStatus = 'rejected';
    const now = new Date().toISOString();
    const reason = input.reason.trim();

    const updated = await this.updateApplication(app.id, {
      status: nextStatus,
      rejected_at: now,
      rejection_reason: reason,
    });
    if (!updated.success) return updated;

    const histErr = await this.logHistory({
      applicationId: app.id,
      fromStage: app.current_stage,
      toStage: app.current_stage,
      fromStatus,
      toStatus: nextStatus,
      action: 'reject',
      performedBy: performer.id,
      comments: reason,
    });
    if (histErr) return histErr;

    return { success: true, application: updated.application };
  }

  async approve(input: TransitionInput): Promise<TransitionResult> {
    const ctx = await this.loadOfficerContext(input);
    if (!ctx.success) return ctx;
    const { app, performer } = ctx;

    if (performer.role !== 'admin') {
      return fail('FORBIDDEN', 'Only an admin may issue final approval');
    }
    if (app.current_stage !== FINAL_STAGE) {
      return fail(
        'VALIDATION_ERROR',
        `Approval is only available at Stage ${FINAL_STAGE}`
      );
    }
    if (TERMINAL_STATUSES.has(app.status)) {
      return fail(
        'CONFLICT',
        `Application is already in terminal status '${app.status}'`
      );
    }

    const fromStatus = app.status;
    const nextStatus: AppStatus = 'approved';
    const now = new Date().toISOString();

    const updated = await this.updateApplication(app.id, {
      status: nextStatus,
      approved_at: now,
    });
    if (!updated.success) return updated;

    const histErr = await this.logHistory({
      applicationId: app.id,
      fromStage: app.current_stage,
      toStage: app.current_stage,
      fromStatus,
      toStatus: nextStatus,
      action: 'approve',
      performedBy: performer.id,
      comments: input.comment ?? null,
    });
    if (histErr) return histErr;

    return { success: true, application: updated.application };
  }

  async submitCorrections(input: TransitionInput): Promise<TransitionResult> {
    const app = await this.loadApplication(input.applicationId);
    if (!app.success) return app;

    if (input.performerRole !== 'owner') {
      return fail('FORBIDDEN', 'Only the application owner may submit corrections');
    }
    if (app.application.owner_id !== input.performedBy) {
      return fail('FORBIDDEN', 'You can only modify your own application');
    }
    if (app.application.status !== 'information_requested') {
      return fail(
        'VALIDATION_ERROR',
        `Corrections can only be submitted from 'information_requested' (current: '${app.application.status}')`
      );
    }

    const fromStatus = app.application.status;
    const nextStatus: AppStatus = 'corrections_submitted';

    const updated = await this.updateApplication(app.application.id, {
      status: nextStatus,
    });
    if (!updated.success) return updated;

    const histErr = await this.logHistory({
      applicationId: app.application.id,
      fromStage: app.application.current_stage,
      toStage: app.application.current_stage,
      fromStatus,
      toStatus: nextStatus,
      action: 'submit',
      performedBy: input.performedBy,
      comments: input.comment ?? null,
    });
    if (histErr) return histErr;

    return { success: true, application: updated.application };
  }

  async withdraw(input: TransitionInput): Promise<TransitionResult> {
    const app = await this.loadApplication(input.applicationId);
    if (!app.success) return app;

    if (input.performerRole !== 'owner') {
      return fail('FORBIDDEN', 'Only the application owner may withdraw');
    }
    if (app.application.owner_id !== input.performedBy) {
      return fail('FORBIDDEN', 'You can only modify your own application');
    }
    if (TERMINAL_STATUSES.has(app.application.status)) {
      return fail(
        'CONFLICT',
        `Application is already in terminal status '${app.application.status}'`
      );
    }

    const fromStatus = app.application.status;
    const nextStatus: AppStatus = 'withdrawn';

    const updated = await this.updateApplication(app.application.id, {
      status: nextStatus,
    });
    if (!updated.success) return updated;

    const histErr = await this.logHistory({
      applicationId: app.application.id,
      fromStage: app.application.current_stage,
      toStage: app.application.current_stage,
      fromStatus,
      toStatus: nextStatus,
      action: 'withdraw',
      performedBy: input.performedBy,
      comments: input.comment ?? null,
    });
    if (histErr) return histErr;

    return { success: true, application: updated.application };
  }

  async addComment(
    input: TransitionInput & { comment: string }
  ): Promise<TransitionResult> {
    const trimmed = (input.comment ?? '').trim();
    if (!trimmed) {
      return fail('VALIDATION_ERROR', 'Comment cannot be empty');
    }

    const ctx = await this.loadOfficerContext(input);
    if (!ctx.success) return ctx;
    const { app, performer } = ctx;

    const histErr = await this.logHistory({
      applicationId: app.id,
      fromStage: app.current_stage,
      toStage: app.current_stage,
      fromStatus: app.status,
      toStatus: app.status,
      action: 'comment',
      performedBy: performer.id,
      comments: trimmed,
    });
    if (histErr) return histErr;

    return { success: true, application: app };
  }

  async assign(
    input: TransitionInput & { officerId: string }
  ): Promise<TransitionResult> {
    if (input.performerRole !== 'admin') {
      return fail('FORBIDDEN', 'Only an admin may assign officers');
    }

    const app = await this.loadApplication(input.applicationId);
    if (!app.success) return app;

    const performer = await this.loadProfile(input.performedBy);
    if (!performer) {
      return fail('FORBIDDEN', 'Performer profile not found');
    }
    if (performer.role !== 'admin') {
      return fail('FORBIDDEN', 'Only an admin may assign officers');
    }
    if (
      performer.authority_id &&
      performer.authority_id !== app.application.authority_id
    ) {
      return fail(
        'FORBIDDEN',
        'You can only assign within your own authority'
      );
    }

    const officer = await this.loadProfile(input.officerId);
    if (!officer) {
      return fail('NOT_FOUND', 'Target officer not found');
    }
    if (!officer.is_active) {
      return fail('VALIDATION_ERROR', 'Target officer is not active');
    }
    if (officer.role !== 'officer' && officer.role !== 'admin') {
      return fail('VALIDATION_ERROR', 'Target user is not an officer');
    }
    if (officer.authority_id !== app.application.authority_id) {
      return fail(
        'VALIDATION_ERROR',
        'Officer must belong to the same authority as the application'
      );
    }

    const previousOfficerId = app.application.assigned_officer_id;

    const updated = await this.updateApplication(app.application.id, {
      assigned_officer_id: input.officerId,
    });
    if (!updated.success) return updated;

    const officerName = officer.full_name_en ?? officer.full_name_bn ?? officer.id;
    const histErr = await this.logHistory({
      applicationId: app.application.id,
      fromStage: app.application.current_stage,
      toStage: app.application.current_stage,
      fromStatus: app.application.status,
      toStatus: app.application.status,
      action: 'assign',
      performedBy: performer.id,
      comments: input.comment ?? null,
      metadata: {
        previous_officer_id: previousOfficerId,
        officer_id: input.officerId,
        officer_name: officerName,
      },
    });
    if (histErr) return histErr;

    return { success: true, application: updated.application };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async loadOfficerContext(
    input: TransitionInput
  ): Promise<
    | { success: true; app: ApplicationSnapshot; performer: PerformerProfile }
    | { success: false; error: string; errorCode: WorkflowErrorCode }
  > {
    if (input.performerRole !== 'officer' && input.performerRole !== 'admin') {
      return fail('FORBIDDEN', 'Officer or admin role required');
    }

    const appResult = await this.loadApplication(input.applicationId);
    if (!appResult.success) return appResult;

    const performer = await this.loadProfile(input.performedBy);
    if (!performer) {
      return fail('FORBIDDEN', 'Performer profile not found');
    }
    if (!performer.is_active) {
      return fail('FORBIDDEN', 'Performer account is inactive');
    }
    if (performer.role !== 'officer' && performer.role !== 'admin') {
      return fail('FORBIDDEN', 'Officer or admin role required');
    }
    if (performer.authority_id !== appResult.application.authority_id) {
      return fail(
        'FORBIDDEN',
        'You can only act on applications in your own authority'
      );
    }

    if (
      performer.role === 'officer' &&
      appResult.application.assigned_officer_id !== performer.id
    ) {
      return fail(
        'FORBIDDEN',
        'Only the assigned officer (or an admin) may act on this application'
      );
    }

    return { success: true, app: appResult.application, performer };
  }

  private async loadApplication(
    applicationId: string
  ): Promise<LoadAppResult> {
    if (!applicationId) {
      return fail('VALIDATION_ERROR', 'applicationId is required');
    }
    const { data, error } = await this.supabase
      .from('applications')
      .select(
        'id, application_number, owner_id, authority_id, assigned_officer_id, status, current_stage, approved_at, rejected_at, rejection_reason'
      )
      .eq('id', applicationId)
      .maybeSingle();

    if (error) {
      return fail('INTERNAL_ERROR', error.message);
    }
    if (!data) {
      return fail('NOT_FOUND', 'Application not found');
    }
    return { success: true, application: data as ApplicationSnapshot };
  }

  private async loadProfile(userId: string): Promise<PerformerProfile | null> {
    if (!userId) return null;
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id, role, authority_id, full_name_en, full_name_bn, is_active')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as PerformerProfile;
  }

  private async updateApplication(
    applicationId: string,
    updates: Partial<{
      current_stage: number;
      status: AppStatus;
      approved_at: string;
      rejected_at: string;
      rejection_reason: string;
      assigned_officer_id: string | null;
    }>
  ): Promise<LoadAppResult> {
    const { data, error } = await this.supabase
      .from('applications')
      .update(updates)
      .eq('id', applicationId)
      .select(
        'id, application_number, owner_id, authority_id, assigned_officer_id, status, current_stage, approved_at, rejected_at, rejection_reason'
      )
      .single();

    if (error) {
      return fail('INTERNAL_ERROR', error.message);
    }
    return { success: true, application: data as ApplicationSnapshot };
  }

  private async logHistory(params: {
    applicationId: string;
    fromStage?: number | null;
    toStage: number;
    fromStatus?: string | null;
    toStatus: string;
    action: WorkflowAction;
    performedBy: string;
    comments?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<TransitionResult | null> {
    // workflow_history is append-only — never UPDATE or DELETE.
    const { error } = await this.supabase.from('workflow_history').insert({
      application_id: params.applicationId,
      from_stage: params.fromStage ?? null,
      to_stage: params.toStage,
      from_status: params.fromStatus ?? null,
      to_status: params.toStatus,
      action: params.action,
      performed_by: params.performedBy,
      comments: params.comments ?? null,
      metadata: (params.metadata as never) ?? null,
    });
    if (error) {
      return fail('INTERNAL_ERROR', `Failed to log history: ${error.message}`);
    }
    return null;
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

type LoadAppResult =
  | { success: true; application: ApplicationSnapshot }
  | { success: false; error: string; errorCode: WorkflowErrorCode };

function fail(
  errorCode: WorkflowErrorCode,
  error: string
): { success: false; error: string; errorCode: WorkflowErrorCode } {
  return { success: false, error, errorCode };
}

function validateRequiredComment(
  value: string | null | undefined,
  label: string
): TransitionResult | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return fail('VALIDATION_ERROR', `${label} is required`);
  }
  if (trimmed.length < MIN_COMMENT_LENGTH) {
    return fail(
      'VALIDATION_ERROR',
      `${label} must be at least ${MIN_COMMENT_LENGTH} characters`
    );
  }
  return null;
}
