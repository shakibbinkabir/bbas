import type { ReactElement } from 'react';
import { resend, EMAIL_FROM, APP_URL } from '@/lib/resend/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { SubmissionConfirmedEmail } from '@/lib/resend/templates/submission-confirmed';
import { StageAdvancedEmail } from '@/lib/resend/templates/stage-advanced';
import { InformationRequestedEmail } from '@/lib/resend/templates/information-requested';
import { CorrectionsReviewedEmail } from '@/lib/resend/templates/corrections-reviewed';
import { ApplicationApprovedEmail } from '@/lib/resend/templates/application-approved';
import { ApplicationRejectedEmail } from '@/lib/resend/templates/application-rejected';
import { WelcomeOfficerEmail } from '@/lib/resend/templates/welcome-officer';
import { ApplicationAssignedEmail } from '@/lib/resend/templates/application-assigned';
import type { LanguagePref, NotificationType } from '@/types';

export interface NotificationPayload {
  userId: string;
  applicationId?: string;
  type: NotificationType;
  /** Template variables: applicationNumber, stageName, comment, reason, authorityName, loginUrl. */
  data: Record<string, string>;
}

interface EmailContent {
  subject: string;
  /** Short summary stored in the notifications table — full HTML lives in Resend. */
  body: string;
}

function applicationUrl(applicationId: string | undefined, role: 'owner' | 'officer'): string {
  if (!applicationId) return APP_URL;
  const path =
    role === 'owner'
      ? `/owner/applications/${applicationId}`
      : `/officer/applications/${applicationId}`;
  return `${APP_URL}${path}`;
}

/**
 * Build subject + plain-text body for a given notification type and locale.
 * Used for both the outgoing email subject and the persisted `notifications` row.
 */
function buildEmailContent(
  type: NotificationType,
  locale: LanguagePref,
  data: Record<string, string>
): EmailContent {
  const isBn = locale === 'bn';
  const num = data.applicationNumber ?? '';
  const stage = data.stageName ?? '';
  const comment = data.comment ?? '';
  const reason = data.reason ?? '';
  const authority = data.authorityName ?? '';

  switch (type) {
    case 'submission_confirmed':
      return isBn
        ? {
            subject: `আবেদন ${num} গৃহীত হয়েছে`,
            body: `আপনার আবেদন ${num} সফলভাবে গৃহীত হয়েছে।`,
          }
        : {
            subject: `Application ${num} received`,
            body: `Your application ${num} has been received.`,
          };
    case 'stage_advance':
      return isBn
        ? {
            subject: `আবেদন ${num} এখন ${stage} পর্যায়ে`,
            body: `আপনার আবেদন ${num} ${stage} পর্যায়ে চলে গেছে।`,
          }
        : {
            subject: `Application ${num} moved to ${stage}`,
            body: `Your application ${num} has moved to ${stage}.`,
          };
    case 'information_requested':
      return isBn
        ? {
            subject: `পদক্ষেপ প্রয়োজন: আবেদন ${num}-এ সংশোধন প্রয়োজন`,
            body: `আপনার আবেদন ${num}-এ সংশোধন প্রয়োজন। কর্মকর্তার মন্তব্য: ${comment}`,
          }
        : {
            subject: `Action required: Application ${num} needs corrections`,
            body: `Your application ${num} needs corrections. Officer's comment: ${comment}`,
          };
    case 'corrections_reviewed':
      return isBn
        ? {
            subject: `আবেদন ${num}-এর সংশোধন জমা হয়েছে`,
            body: `আবেদনকারী আবেদন ${num}-এর জন্য সংশোধনসহ জবাব দিয়েছেন।`,
          }
        : {
            subject: `Corrections submitted for ${num}`,
            body: `Applicant has responded with corrections for application ${num}.`,
          };
    case 'approved':
      return isBn
        ? {
            subject: `অভিনন্দন! আবেদন ${num} অনুমোদিত হয়েছে`,
            body: `অভিনন্দন! আপনার আবেদন ${num} অনুমোদিত হয়েছে।`,
          }
        : {
            subject: `Congratulations! Application ${num} approved`,
            body: `Congratulations! Your application ${num} has been approved.`,
          };
    case 'rejected':
      return isBn
        ? {
            subject: `আবেদন ${num}-এর সিদ্ধান্ত`,
            body: `আবেদন ${num} আপডেট: ${reason}`,
          }
        : {
            subject: `Update on application ${num}`,
            body: `Application ${num} update: ${reason}`,
          };
    case 'welcome':
      return isBn
        ? {
            subject: `BBAS-এ স্বাগতম`,
            body: `${authority}-এর জন্য আপনার অফিসার অ্যাকাউন্ট তৈরি করা হয়েছে।`,
          }
        : {
            subject: `Welcome to BBAS`,
            body: `Your officer account has been created for ${authority}.`,
          };
    case 'assignment':
      return isBn
        ? {
            subject: `আবেদন ${num} আপনাকে নিয়োগ করা হয়েছে`,
            body: `আপনাকে আবেদন ${num} পর্যালোচনার জন্য নিয়োগ করা হয়েছে।`,
          }
        : {
            subject: `You have been assigned application ${num}`,
            body: `You have been assigned application ${num}.`,
          };
    case 'reminder':
      return isBn
        ? {
            subject: `আবেদন ${num} সংক্রান্ত স্মারক`,
            body: `আবেদন ${num} সম্পর্কিত একটি অনুস্মারক।`,
          }
        : {
            subject: `Reminder for application ${num}`,
            body: `This is a reminder regarding application ${num}.`,
          };
    default: {
      // Exhaustiveness check
      const _exhaustive: never = type;
      void _exhaustive;
      return { subject: 'BBAS notification', body: 'You have a new notification.' };
    }
  }
}

/**
 * Build the React email component for a notification type. Returns null for
 * notification types that do not have a template (e.g. plain `reminder`).
 */
function getTemplate(
  type: NotificationType,
  locale: LanguagePref,
  applicationId: string | undefined,
  data: Record<string, string> & { name: string }
): ReactElement | null {
  const authorityName = data.authorityName || undefined;

  // Owner-targeted vs officer-targeted determines the deep link path.
  const ownerUrl = applicationUrl(applicationId, 'owner');
  const officerUrl = applicationUrl(applicationId, 'officer');

  switch (type) {
    case 'submission_confirmed':
      return SubmissionConfirmedEmail({
        locale,
        name: data.name,
        applicationNumber: data.applicationNumber ?? '',
        applicationUrl: ownerUrl,
        authorityName,
      });
    case 'stage_advance':
      return StageAdvancedEmail({
        locale,
        name: data.name,
        applicationNumber: data.applicationNumber ?? '',
        stageName: data.stageName ?? '',
        applicationUrl: ownerUrl,
        authorityName,
      });
    case 'information_requested':
      return InformationRequestedEmail({
        locale,
        name: data.name,
        applicationNumber: data.applicationNumber ?? '',
        comment: data.comment ?? '',
        applicationUrl: ownerUrl,
        authorityName,
      });
    case 'corrections_reviewed':
      return CorrectionsReviewedEmail({
        locale,
        name: data.name,
        applicationNumber: data.applicationNumber ?? '',
        applicationUrl: officerUrl,
        authorityName,
      });
    case 'approved':
      return ApplicationApprovedEmail({
        locale,
        name: data.name,
        applicationNumber: data.applicationNumber ?? '',
        applicationUrl: ownerUrl,
        authorityName,
      });
    case 'rejected':
      return ApplicationRejectedEmail({
        locale,
        name: data.name,
        applicationNumber: data.applicationNumber ?? '',
        reason: data.reason ?? '',
        applicationUrl: ownerUrl,
        authorityName,
      });
    case 'welcome':
      return WelcomeOfficerEmail({
        locale,
        name: data.name,
        authorityName: data.authorityName ?? 'BBAS',
        loginUrl: data.loginUrl ?? `${APP_URL}/login`,
      });
    case 'assignment':
      return ApplicationAssignedEmail({
        locale,
        name: data.name,
        applicationNumber: data.applicationNumber ?? '',
        applicationUrl: officerUrl,
        authorityName,
      });
    case 'reminder':
      return null;
    default:
      return null;
  }
}

/**
 * sendNotification — fan-out for in-app + email delivery.
 *
 * Guarantees:
 *   - Never throws. All errors are swallowed and logged so calling workflows
 *     don't break.
 *   - Logs every attempt to the `notifications` table (pending → sent | failed).
 *   - Respects the recipient's preferred_language (defaults to 'bn').
 *   - In dev without RESEND_API_KEY, marks rows as 'sent' for end-to-end testing.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    const supabase = createAdminClient();

    // 1. Fetch user's profile
    const { data: user, error: userErr } = await supabase
      .from('user_profiles')
      .select('full_name_en, full_name_bn, email, preferred_language')
      .eq('id', payload.userId)
      .maybeSingle();

    if (userErr) {
      console.error('[notifications] failed to load user', payload.userId, userErr.message);
      return;
    }
    if (!user) {
      console.error(`[notifications] user ${payload.userId} not found`);
      return;
    }
    if (!user.email) {
      console.error(`[notifications] user ${payload.userId} has no email`);
      return;
    }

    const locale: LanguagePref = (user.preferred_language as LanguagePref) || 'bn';
    const name =
      (locale === 'bn' ? user.full_name_bn : user.full_name_en) ||
      user.full_name_en ||
      user.full_name_bn ||
      user.email;

    const { subject } = buildEmailContent(payload.type, locale, payload.data);
    const enContent = buildEmailContent(payload.type, 'en', payload.data);
    const bnContent = buildEmailContent(payload.type, 'bn', payload.data);

    // 2. Persist a pending notification row before sending so failures are tracked.
    const { data: notification, error: insertErr } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.userId,
        application_id: payload.applicationId ?? null,
        type: payload.type,
        channel: 'email',
        subject_en: enContent.subject,
        subject_bn: bnContent.subject,
        body_en: enContent.body,
        body_bn: bnContent.body,
        delivery_status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[notifications] failed to insert row', insertErr.message);
      // Continue — try to send the email anyway.
    }

    const reactTemplate = getTemplate(payload.type, locale, payload.applicationId, {
      ...payload.data,
      name,
    });

    // 3. Send via Resend, or stub in dev.
    if (resend && reactTemplate) {
      try {
        const { error: sendErr } = await resend.emails.send({
          from: EMAIL_FROM,
          to: user.email,
          subject,
          react: reactTemplate,
        });

        if (sendErr) {
          console.error('[notifications] Resend error', sendErr);
          if (notification) {
            await supabase
              .from('notifications')
              .update({
                delivery_status: 'failed',
                error_message: sendErr.message ?? 'Unknown Resend error',
              })
              .eq('id', notification.id);
          }
          return;
        }

        if (notification) {
          await supabase
            .from('notifications')
            .update({
              delivery_status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[notifications] Resend threw', message);
        if (notification) {
          await supabase
            .from('notifications')
            .update({ delivery_status: 'failed', error_message: message })
            .eq('id', notification.id);
        }
      }
    } else {
      // Dev mode without an API key (or no template available) — log + mark sent.
      // eslint-disable-next-line no-console
      console.log(
        `[notifications:DEV] would send to ${user.email} (${locale}): ${subject}`
      );
      if (notification) {
        await supabase
          .from('notifications')
          .update({
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
      }
    }
  } catch (err) {
    // Top-level safety net — sendNotification must never throw.
    const message = err instanceof Error ? err.message : String(err);
    console.error('[notifications] unexpected error', message);
  }
}
