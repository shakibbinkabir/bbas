import { sendNotification } from './service';
import { APP_URL } from '@/lib/resend/client';

/**
 * Convenience trigger functions imported by other stages (workflow, officer
 * management, etc.). All are non-throwing — failures are logged inside
 * sendNotification.
 */

export async function notifyApplicationSubmitted(
  applicationId: string,
  ownerId: string,
  applicationNumber: string
): Promise<void> {
  await sendNotification({
    userId: ownerId,
    applicationId,
    type: 'submission_confirmed',
    data: { applicationNumber },
  });
}

export async function notifyStageAdvanced(
  applicationId: string,
  ownerId: string,
  applicationNumber: string,
  stageName: string
): Promise<void> {
  await sendNotification({
    userId: ownerId,
    applicationId,
    type: 'stage_advance',
    data: { applicationNumber, stageName },
  });
}

export async function notifyInformationRequested(
  applicationId: string,
  ownerId: string,
  applicationNumber: string,
  comment: string
): Promise<void> {
  await sendNotification({
    userId: ownerId,
    applicationId,
    type: 'information_requested',
    data: { applicationNumber, comment },
  });
}

export async function notifyCorrectionsReceived(
  applicationId: string,
  officerId: string,
  applicationNumber: string
): Promise<void> {
  await sendNotification({
    userId: officerId,
    applicationId,
    type: 'corrections_reviewed',
    data: { applicationNumber },
  });
}

export async function notifyApplicationApproved(
  applicationId: string,
  ownerId: string,
  applicationNumber: string
): Promise<void> {
  await sendNotification({
    userId: ownerId,
    applicationId,
    type: 'approved',
    data: { applicationNumber },
  });
}

export async function notifyApplicationRejected(
  applicationId: string,
  ownerId: string,
  applicationNumber: string,
  reason: string
): Promise<void> {
  await sendNotification({
    userId: ownerId,
    applicationId,
    type: 'rejected',
    data: { applicationNumber, reason },
  });
}

export async function notifyOfficerWelcome(
  officerId: string,
  authorityName: string
): Promise<void> {
  await sendNotification({
    userId: officerId,
    type: 'welcome',
    data: {
      authorityName,
      loginUrl: `${APP_URL}/login`,
    },
  });
}

export async function notifyApplicationAssigned(
  officerId: string,
  applicationId: string,
  applicationNumber: string
): Promise<void> {
  await sendNotification({
    userId: officerId,
    applicationId,
    type: 'assignment',
    data: { applicationNumber },
  });
}
