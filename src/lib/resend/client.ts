import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('RESEND_API_KEY not set — emails will be logged but not sent');
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const EMAIL_FROM = 'BBAS <noreply@bbas.vercel.app>';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://bbas.vercel.app';
