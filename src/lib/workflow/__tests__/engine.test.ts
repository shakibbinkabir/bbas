/**
 * WorkflowEngine unit tests — mocks the Supabase client so we can drive
 * the state machine end-to-end without a database.
 *
 * Covers all 25 scenarios from PRD Stage 6 task 6.4.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { WorkflowEngine, MIN_COMMENT_LENGTH } from '../engine';
import type { AppStatus, UserRole } from '@/types/database';

// -----------------------------------------------------------------------------
// Tiny in-memory fake of the bits of the Supabase client we use.
// -----------------------------------------------------------------------------

interface AppRow {
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

interface ProfileRow {
  id: string;
  role: UserRole;
  authority_id: string | null;
  full_name_en: string | null;
  full_name_bn: string | null;
  is_active: boolean;
}

interface HistoryRow {
  application_id: string;
  from_stage: number | null;
  to_stage: number;
  from_status: string | null;
  to_status: string;
  action: string;
  performed_by: string | null;
  comments: string | null;
  metadata: unknown;
  created_at: string;
}

interface FakeState {
  applications: Map<string, AppRow>;
  profiles: Map<string, ProfileRow>;
  history: HistoryRow[];
  /** Track every table name an UPDATE or DELETE was issued against. */
  mutations: { table: string; op: 'update' | 'delete' }[];
}

function createFakeSupabase(state: FakeState) {
  function from(table: string) {
    return {
      select(_cols: string) {
        return new SelectQuery(state, table);
      },
      update(payload: Record<string, unknown>) {
        state.mutations.push({ table, op: 'update' });
        if (table === 'workflow_history') {
          throw new Error('workflow_history is append-only — update not allowed');
        }
        return new UpdateQuery(state, table, payload);
      },
      delete() {
        state.mutations.push({ table, op: 'delete' });
        if (table === 'workflow_history') {
          throw new Error('workflow_history is append-only — delete not allowed');
        }
        return Promise.resolve({ error: null });
      },
      insert(payload: Record<string, unknown>) {
        if (table === 'workflow_history') {
          state.history.push({
            application_id: payload.application_id as string,
            from_stage: (payload.from_stage as number | null) ?? null,
            to_stage: payload.to_stage as number,
            from_status: (payload.from_status as string | null) ?? null,
            to_status: payload.to_status as string,
            action: payload.action as string,
            performed_by: (payload.performed_by as string | null) ?? null,
            comments: (payload.comments as string | null) ?? null,
            metadata: payload.metadata,
            created_at: new Date().toISOString(),
          });
        }
        return Promise.resolve({ error: null, data: null });
      },
    };
  }
  return { from } as unknown as import('@supabase/supabase-js').SupabaseClient<
    import('@/types/database').Database
  >;
}

class SelectQuery {
  private filterCol: string | null = null;
  private filterVal: unknown = null;
  constructor(private state: FakeState, private table: string) {}

  eq(col: string, val: unknown) {
    this.filterCol = col;
    this.filterVal = val;
    return this;
  }

  async maybeSingle() {
    return this.run();
  }

  async single() {
    const r = await this.run();
    if (!r.data) return { data: null, error: { message: 'No row found' } };
    return r;
  }

  private async run() {
    if (this.table === 'applications') {
      if (this.filterCol === 'id') {
        const row = this.state.applications.get(this.filterVal as string);
        return { data: row ?? null, error: null };
      }
    }
    if (this.table === 'user_profiles') {
      if (this.filterCol === 'id') {
        const row = this.state.profiles.get(this.filterVal as string);
        return { data: row ?? null, error: null };
      }
    }
    return { data: null, error: null };
  }
}

class UpdateQuery {
  private filterCol: string | null = null;
  private filterVal: unknown = null;
  constructor(
    private state: FakeState,
    private table: string,
    private payload: Record<string, unknown>
  ) {}

  eq(col: string, val: unknown) {
    this.filterCol = col;
    this.filterVal = val;
    return this;
  }

  select(_cols: string) {
    return this;
  }

  async single() {
    if (this.table === 'applications' && this.filterCol === 'id') {
      const existing = this.state.applications.get(this.filterVal as string);
      if (!existing) return { data: null, error: { message: 'No row found' } };
      const merged = { ...existing, ...(this.payload as Partial<AppRow>) };
      this.state.applications.set(merged.id, merged);
      return { data: merged, error: null };
    }
    return { data: null, error: { message: 'Unsupported update' } };
  }

  async maybeSingle() {
    return this.single();
  }
}

// -----------------------------------------------------------------------------
// Test fixture builders
// -----------------------------------------------------------------------------

const AUTH_A = 'auth-A';
const AUTH_B = 'auth-B';

const OFFICER_ASSIGNED = 'officer-1';
const OFFICER_OTHER = 'officer-2';
const ADMIN = 'admin-1';
const ADMIN_OTHER_AUTH = 'admin-2';
const OWNER = 'owner-1';
const OWNER_OTHER = 'owner-2';

function buildState(): FakeState {
  const profiles = new Map<string, ProfileRow>([
    [
      OFFICER_ASSIGNED,
      {
        id: OFFICER_ASSIGNED,
        role: 'officer',
        authority_id: AUTH_A,
        full_name_en: 'Officer One',
        full_name_bn: null,
        is_active: true,
      },
    ],
    [
      OFFICER_OTHER,
      {
        id: OFFICER_OTHER,
        role: 'officer',
        authority_id: AUTH_A,
        full_name_en: 'Officer Two',
        full_name_bn: null,
        is_active: true,
      },
    ],
    [
      ADMIN,
      {
        id: ADMIN,
        role: 'admin',
        authority_id: AUTH_A,
        full_name_en: 'Admin One',
        full_name_bn: null,
        is_active: true,
      },
    ],
    [
      ADMIN_OTHER_AUTH,
      {
        id: ADMIN_OTHER_AUTH,
        role: 'admin',
        authority_id: AUTH_B,
        full_name_en: 'Admin Two',
        full_name_bn: null,
        is_active: true,
      },
    ],
    [
      OWNER,
      {
        id: OWNER,
        role: 'owner',
        authority_id: null,
        full_name_en: 'Owner One',
        full_name_bn: null,
        is_active: true,
      },
    ],
    [
      OWNER_OTHER,
      {
        id: OWNER_OTHER,
        role: 'owner',
        authority_id: null,
        full_name_en: 'Owner Two',
        full_name_bn: null,
        is_active: true,
      },
    ],
  ]);

  return {
    applications: new Map(),
    profiles,
    history: [],
    mutations: [],
  };
}

interface SeedAppOpts {
  id?: string;
  status?: AppStatus;
  current_stage?: number;
  authority_id?: string;
  assigned_officer_id?: string | null;
  owner_id?: string;
}

function seedApp(state: FakeState, opts: SeedAppOpts = {}): AppRow {
  const row: AppRow = {
    id: opts.id ?? 'app-1',
    application_number: 'RAJUK/2026/0001',
    owner_id: opts.owner_id ?? OWNER,
    authority_id: opts.authority_id ?? AUTH_A,
    assigned_officer_id:
      opts.assigned_officer_id === undefined
        ? OFFICER_ASSIGNED
        : opts.assigned_officer_id,
    status: opts.status ?? 'submitted',
    current_stage: opts.current_stage ?? 1,
    approved_at: null,
    rejected_at: null,
    rejection_reason: null,
  };
  state.applications.set(row.id, row);
  return row;
}

const LONG_COMMENT =
  'This comment is intentionally well over twenty characters long.';

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('WorkflowEngine.advance', () => {
  let state: FakeState;
  let engine: WorkflowEngine;

  beforeEach(() => {
    state = buildState();
    engine = new WorkflowEngine(createFakeSupabase(state));
  });

  it('1. advances 1 → 2 for the assigned officer', async () => {
    seedApp(state);
    const result = await engine.advance({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
    });
    expect(result.success).toBe(true);
    expect(result.application?.current_stage).toBe(2);
    expect(result.application?.status).toBe('under_review');
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toMatchObject({
      from_stage: 1,
      to_stage: 2,
      action: 'advance',
      performed_by: OFFICER_ASSIGNED,
    });
  });

  it('2. fails for an unassigned officer (non-admin)', async () => {
    seedApp(state, { assigned_officer_id: OFFICER_ASSIGNED });
    const result = await engine.advance({
      applicationId: 'app-1',
      performedBy: OFFICER_OTHER,
      performerRole: 'officer',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
    expect(state.history).toHaveLength(0);
  });

  it('3. allows admin to advance even when not assigned', async () => {
    seedApp(state, { assigned_officer_id: OFFICER_ASSIGNED });
    const result = await engine.advance({
      applicationId: 'app-1',
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(result.success).toBe(true);
    expect(result.application?.current_stage).toBe(2);
  });

  it('4. requires admin to advance from 8 → 9', async () => {
    seedApp(state, { current_stage: 8, status: 'under_review' });
    const officerResult = await engine.advance({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
    });
    expect(officerResult.success).toBe(false);
    expect(officerResult.errorCode).toBe('FORBIDDEN');

    const adminResult = await engine.advance({
      applicationId: 'app-1',
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(adminResult.success).toBe(true);
    expect(adminResult.application?.current_stage).toBe(9);
  });

  it('5. cannot advance beyond stage 9', async () => {
    seedApp(state, { current_stage: 9, status: 'under_review' });
    const result = await engine.advance({
      applicationId: 'app-1',
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_ERROR');
  });

  it('6. fails when status is draft / rejected / approved / withdrawn', async () => {
    const cases: AppStatus[] = ['draft', 'rejected', 'approved', 'withdrawn'];
    for (const status of cases) {
      const fresh = buildState();
      fresh.applications.set('app-1', {
        id: 'app-1',
        application_number: null,
        owner_id: OWNER,
        authority_id: AUTH_A,
        assigned_officer_id: OFFICER_ASSIGNED,
        status,
        current_stage: status === 'draft' ? 0 : 3,
        approved_at: null,
        rejected_at: null,
        rejection_reason: null,
      });
      const e = new WorkflowEngine(createFakeSupabase(fresh));
      const r = await e.advance({
        applicationId: 'app-1',
        performedBy: OFFICER_ASSIGNED,
        performerRole: 'officer',
      });
      expect(r.success, `status=${status}`).toBe(false);
      expect(r.errorCode).toBe('VALIDATION_ERROR');
    }
  });
});

describe('WorkflowEngine.return', () => {
  let state: FakeState;
  let engine: WorkflowEngine;

  beforeEach(() => {
    state = buildState();
    engine = new WorkflowEngine(createFakeSupabase(state));
    seedApp(state, { current_stage: 3, status: 'under_review' });
  });

  it('7. sets status to information_requested without changing stage', async () => {
    const result = await engine.return({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
      comment: LONG_COMMENT,
    });
    expect(result.success).toBe(true);
    expect(result.application?.status).toBe('information_requested');
    expect(result.application?.current_stage).toBe(3);
    expect(state.history[0]).toMatchObject({
      from_stage: 3,
      to_stage: 3,
      action: 'return',
    });
  });

  it('8. fails when no comment is provided', async () => {
    const result = await engine.return({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
      comment: '',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_ERROR');
    expect(state.history).toHaveLength(0);
  });

  it(`9. fails when the comment is shorter than ${MIN_COMMENT_LENGTH} chars`, async () => {
    const result = await engine.return({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
      comment: 'too short',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_ERROR');
  });
});

describe('WorkflowEngine.reject', () => {
  let state: FakeState;
  let engine: WorkflowEngine;

  beforeEach(() => {
    state = buildState();
    engine = new WorkflowEngine(createFakeSupabase(state));
  });

  it('10. sets status to rejected and stamps rejected_at', async () => {
    seedApp(state, { current_stage: 4, status: 'under_review' });
    const result = await engine.reject({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
      reason: 'Incomplete plans — please resubmit with stamped drawings.',
    });
    expect(result.success).toBe(true);
    expect(result.application?.status).toBe('rejected');
    expect(result.application?.rejected_at).toBeTruthy();
    expect(result.application?.rejection_reason).toContain('Incomplete plans');
    expect(state.history[0]).toMatchObject({ action: 'reject' });
  });

  it('11. fails when no reason is provided', async () => {
    seedApp(state);
    const result = await engine.reject({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
      reason: '   ',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_ERROR');
  });

  it('12. fails on already terminal applications', async () => {
    for (const status of ['rejected', 'approved', 'withdrawn'] as AppStatus[]) {
      const fresh = buildState();
      fresh.applications.set('app-1', {
        id: 'app-1',
        application_number: 'X',
        owner_id: OWNER,
        authority_id: AUTH_A,
        assigned_officer_id: OFFICER_ASSIGNED,
        status,
        current_stage: 5,
        approved_at: null,
        rejected_at: null,
        rejection_reason: null,
      });
      const e = new WorkflowEngine(createFakeSupabase(fresh));
      const r = await e.reject({
        applicationId: 'app-1',
        performedBy: OFFICER_ASSIGNED,
        performerRole: 'officer',
        reason: 'Trying to reject an already-terminal application here.',
      });
      expect(r.success, `status=${status}`).toBe(false);
      expect(r.errorCode).toBe('CONFLICT');
    }
  });
});

describe('WorkflowEngine.approve', () => {
  let state: FakeState;
  let engine: WorkflowEngine;

  beforeEach(() => {
    state = buildState();
    engine = new WorkflowEngine(createFakeSupabase(state));
  });

  it('13. only succeeds at stage 9 when invoked by an admin', async () => {
    seedApp(state, { current_stage: 9, status: 'under_review' });
    const result = await engine.approve({
      applicationId: 'app-1',
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(result.success).toBe(true);
    expect(result.application?.status).toBe('approved');
    expect(result.application?.approved_at).toBeTruthy();
  });

  it('14. fails at stage 8', async () => {
    seedApp(state, { current_stage: 8, status: 'under_review' });
    const result = await engine.approve({
      applicationId: 'app-1',
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_ERROR');
  });

  it('15. fails for non-admin officers', async () => {
    seedApp(state, { current_stage: 9, status: 'under_review' });
    const result = await engine.approve({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
  });
});

describe('WorkflowEngine.submitCorrections', () => {
  let state: FakeState;
  let engine: WorkflowEngine;

  beforeEach(() => {
    state = buildState();
    engine = new WorkflowEngine(createFakeSupabase(state));
  });

  it('16. succeeds when status is information_requested', async () => {
    seedApp(state, { status: 'information_requested', current_stage: 3 });
    const result = await engine.submitCorrections({
      applicationId: 'app-1',
      performedBy: OWNER,
      performerRole: 'owner',
    });
    expect(result.success).toBe(true);
    expect(result.application?.status).toBe('corrections_submitted');
    expect(result.application?.current_stage).toBe(3);
    expect(state.history[0]).toMatchObject({ action: 'submit' });
  });

  it('17. fails when status is anything else', async () => {
    const cases: AppStatus[] = [
      'draft',
      'submitted',
      'under_review',
      'corrections_submitted',
      'approved',
      'rejected',
      'withdrawn',
    ];
    for (const status of cases) {
      const fresh = buildState();
      fresh.applications.set('app-1', {
        id: 'app-1',
        application_number: null,
        owner_id: OWNER,
        authority_id: AUTH_A,
        assigned_officer_id: OFFICER_ASSIGNED,
        status,
        current_stage: 3,
        approved_at: null,
        rejected_at: null,
        rejection_reason: null,
      });
      const e = new WorkflowEngine(createFakeSupabase(fresh));
      const r = await e.submitCorrections({
        applicationId: 'app-1',
        performedBy: OWNER,
        performerRole: 'owner',
      });
      expect(r.success, `status=${status}`).toBe(false);
      expect(r.errorCode).toBe('VALIDATION_ERROR');
    }
  });
});

describe('WorkflowEngine.withdraw', () => {
  let state: FakeState;
  let engine: WorkflowEngine;

  beforeEach(() => {
    state = buildState();
    engine = new WorkflowEngine(createFakeSupabase(state));
  });

  it('18. succeeds for the owner on a non-terminal application', async () => {
    seedApp(state, { status: 'under_review', current_stage: 4 });
    const result = await engine.withdraw({
      applicationId: 'app-1',
      performedBy: OWNER,
      performerRole: 'owner',
    });
    expect(result.success).toBe(true);
    expect(result.application?.status).toBe('withdrawn');
    expect(state.history[0]).toMatchObject({ action: 'withdraw' });
  });

  it('19. fails on already terminal applications', async () => {
    for (const status of ['approved', 'rejected', 'withdrawn'] as AppStatus[]) {
      const fresh = buildState();
      fresh.applications.set('app-1', {
        id: 'app-1',
        application_number: 'X',
        owner_id: OWNER,
        authority_id: AUTH_A,
        assigned_officer_id: OFFICER_ASSIGNED,
        status,
        current_stage: 5,
        approved_at: null,
        rejected_at: null,
        rejection_reason: null,
      });
      const e = new WorkflowEngine(createFakeSupabase(fresh));
      const r = await e.withdraw({
        applicationId: 'app-1',
        performedBy: OWNER,
        performerRole: 'owner',
      });
      expect(r.success, `status=${status}`).toBe(false);
      expect(r.errorCode).toBe('CONFLICT');
    }
  });

  it('also fails when a non-owner tries to withdraw', async () => {
    seedApp(state, { status: 'under_review', current_stage: 4 });
    const r = await engine.withdraw({
      applicationId: 'app-1',
      performedBy: OWNER_OTHER,
      performerRole: 'owner',
    });
    expect(r.success).toBe(false);
    expect(r.errorCode).toBe('FORBIDDEN');
  });
});

describe('WorkflowEngine.addComment', () => {
  it('20. records a history entry without touching stage or status', async () => {
    const state = buildState();
    const engine = new WorkflowEngine(createFakeSupabase(state));
    seedApp(state, { current_stage: 4, status: 'under_review' });

    const result = await engine.addComment({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
      comment: 'Saw the soil report — looks fine.',
    });

    expect(result.success).toBe(true);
    const after = state.applications.get('app-1');
    expect(after?.current_stage).toBe(4);
    expect(after?.status).toBe('under_review');
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toMatchObject({
      action: 'comment',
      from_stage: 4,
      to_stage: 4,
      from_status: 'under_review',
      to_status: 'under_review',
    });
    // No application UPDATE was issued for a comment.
    expect(state.mutations.some((m) => m.table === 'applications')).toBe(false);
  });
});

describe('WorkflowEngine.assign', () => {
  let state: FakeState;
  let engine: WorkflowEngine;

  beforeEach(() => {
    state = buildState();
    engine = new WorkflowEngine(createFakeSupabase(state));
    seedApp(state, { assigned_officer_id: null });
  });

  it('21. only succeeds when invoked by an admin', async () => {
    const result = await engine.assign({
      applicationId: 'app-1',
      officerId: OFFICER_OTHER,
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(result.success).toBe(true);
    expect(result.application?.assigned_officer_id).toBe(OFFICER_OTHER);
    expect(state.history[0]).toMatchObject({ action: 'assign' });
    const meta = state.history[0].metadata as Record<string, unknown>;
    expect(meta.officer_id).toBe(OFFICER_OTHER);
  });

  it('22. fails for a non-admin officer', async () => {
    const result = await engine.assign({
      applicationId: 'app-1',
      officerId: OFFICER_OTHER,
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
  });

  it('23. fails when the target officer is in a different authority', async () => {
    state.profiles.set('officer-3', {
      id: 'officer-3',
      role: 'officer',
      authority_id: AUTH_B,
      full_name_en: 'Officer Three',
      full_name_bn: null,
      is_active: true,
    });
    const result = await engine.assign({
      applicationId: 'app-1',
      officerId: 'officer-3',
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_ERROR');
  });
});

describe('WorkflowEngine — full happy path', () => {
  it('24. submit → advance × 8 → approve walks Stage 1 to Stage 9', async () => {
    const state = buildState();
    const engine = new WorkflowEngine(createFakeSupabase(state));
    seedApp(state, { status: 'submitted', current_stage: 1 });

    // Stages 1 → 7 advanced by the assigned officer.
    for (let stage = 1; stage <= 7; stage++) {
      const r = await engine.advance({
        applicationId: 'app-1',
        performedBy: OFFICER_ASSIGNED,
        performerRole: 'officer',
      });
      expect(r.success, `stage ${stage} → ${stage + 1}`).toBe(true);
      expect(r.application?.current_stage).toBe(stage + 1);
    }

    // Stage 8 → 9 must be the admin.
    const toNine = await engine.advance({
      applicationId: 'app-1',
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(toNine.success).toBe(true);
    expect(toNine.application?.current_stage).toBe(9);

    // Final approval (admin only).
    const approval = await engine.approve({
      applicationId: 'app-1',
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    expect(approval.success).toBe(true);
    expect(approval.application?.status).toBe('approved');

    // 8 advances + 1 approve = 9 history entries.
    expect(state.history).toHaveLength(9);
    expect(state.history.map((h) => h.action)).toEqual([
      'advance',
      'advance',
      'advance',
      'advance',
      'advance',
      'advance',
      'advance',
      'advance',
      'approve',
    ]);
  });
});

describe('workflow_history immutability', () => {
  it('25. the engine never issues UPDATE or DELETE against workflow_history', async () => {
    const state = buildState();
    const engine = new WorkflowEngine(createFakeSupabase(state));
    seedApp(state, { status: 'submitted', current_stage: 1 });

    // Exercise every mutating method.
    await engine.advance({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
    });
    await engine.return({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
      comment: LONG_COMMENT,
    });
    await engine.submitCorrections({
      applicationId: 'app-1',
      performedBy: OWNER,
      performerRole: 'owner',
    });
    await engine.addComment({
      applicationId: 'app-1',
      performedBy: OFFICER_ASSIGNED,
      performerRole: 'officer',
      comment: 'inline comment',
    });
    await engine.assign({
      applicationId: 'app-1',
      officerId: OFFICER_OTHER,
      performedBy: ADMIN,
      performerRole: 'admin',
    });
    await engine.withdraw({
      applicationId: 'app-1',
      performedBy: OWNER,
      performerRole: 'owner',
    });

    // No UPDATE or DELETE was issued against workflow_history.
    const offenders = state.mutations.filter(
      (m) => m.table === 'workflow_history'
    );
    expect(offenders).toEqual([]);

    // History was actually written.
    expect(state.history.length).toBeGreaterThan(0);
  });
});
