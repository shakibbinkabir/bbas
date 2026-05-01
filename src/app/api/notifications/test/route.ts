import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sendNotification } from '@/lib/notifications/service';
import {
  ErrorCode,
  HttpError,
  handleRoute,
  requireAuth,
} from '@/lib/utils/api';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { NotificationType } from '@/types';

const NOTIFICATION_TYPES: [NotificationType, ...NotificationType[]] = [
  'submission_confirmed',
  'stage_advance',
  'information_requested',
  'corrections_reviewed',
  'approved',
  'rejected',
  'welcome',
  'assignment',
  'reminder',
];

const testSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  userId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  data: z.record(z.string(), z.string()).optional(),
});

/**
 * POST /api/notifications/test — DEV-only endpoint for triggering each
 * notification type without going through the full workflow.
 *
 * If `userId` is omitted, the notification is sent to the calling user.
 * Disabled outside of NODE_ENV=development.
 */
export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    if (process.env.NODE_ENV !== 'development') {
      throw new HttpError(404, 'Not found', ErrorCode.NOT_FOUND);
    }

    const supabase = await createServerSupabaseClient();
    const { profile } = await requireAuth(supabase);

    const json = await req.json().catch(() => null);
    const parsed = testSchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpError(
        400,
        'Invalid payload',
        ErrorCode.VALIDATION_ERROR,
        parsed.error.flatten()
      );
    }

    const targetUserId = parsed.data.userId ?? profile.id;
    const data: Record<string, string> = {
      applicationNumber: parsed.data.data?.applicationNumber ?? 'TEST-0001',
      stageName: parsed.data.data?.stageName ?? 'Document Verification',
      comment:
        parsed.data.data?.comment ??
        'Please re-upload the architectural plan with clearer dimensions.',
      reason:
        parsed.data.data?.reason ??
        'Submitted documents do not meet zoning compliance.',
      authorityName: parsed.data.data?.authorityName ?? 'BBAS Test Authority',
      ...(parsed.data.data ?? {}),
    };

    await sendNotification({
      userId: targetUserId,
      applicationId: parsed.data.applicationId,
      type: parsed.data.type,
      data,
    });

    return {
      ok: true,
      message: `Notification of type "${parsed.data.type}" dispatched to user ${targetUserId}`,
    };
  });
}
