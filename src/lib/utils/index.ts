import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  STAGES,
  STATUS_LIST,
  type StageInfo,
  type StatusMeta,
} from '@/lib/constants';
import type { AppStatus, LanguagePref } from '@/types';

/** shadcn helper — merges class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =============================================================================
// NUMERAL CONVERSION
// =============================================================================
const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaNumerals(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)]);
}

export function toEnglishNumerals(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

// =============================================================================
// DATE / CURRENCY
// =============================================================================
export function formatDate(
  date: Date | string | null | undefined,
  locale: LanguagePref = 'bn',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const formatted = new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-GB', options).format(d);
  return locale === 'bn' ? toBanglaNumerals(formatted) : formatted;
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale: LanguagePref = 'bn'
): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(
  amount: number | null | undefined,
  locale: LanguagePref = 'bn'
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '';
  // Use en-IN/bn-BD groupings (lakh/crore) which match BDT conventions.
  const formatted = new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-IN', {
    maximumFractionDigits: 2,
  }).format(amount);
  const numerals = locale === 'bn' ? toBanglaNumerals(formatted) : formatted;
  return `৳ ${numerals}`;
}

export function formatNumber(value: number | null | undefined, locale: LanguagePref = 'bn'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const formatted = new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-IN').format(value);
  return locale === 'bn' ? toBanglaNumerals(formatted) : formatted;
}

// =============================================================================
// STAGE / STATUS HELPERS
// =============================================================================
export function getStageInfo(stageNumber: number): StageInfo {
  const stage = STAGES.find((s) => s.number === stageNumber);
  if (!stage) {
    return {
      number: stageNumber,
      nameEn: `Stage ${stageNumber}`,
      nameBn: `পর্যায় ${toBanglaNumerals(stageNumber)}`,
      descriptionEn: '',
      descriptionBn: '',
    };
  }
  return stage;
}

export function getStageNameByNumber(
  stageNumber: number,
  locale: LanguagePref = 'bn'
): string {
  const stage = getStageInfo(stageNumber);
  return locale === 'bn' ? stage.nameBn : stage.nameEn;
}

export function getStatusMeta(status: AppStatus): StatusMeta {
  const meta = STATUS_LIST.find((s) => s.value === status);
  return (
    meta ?? {
      value: status,
      labelEn: status,
      labelBn: status,
      color: 'gray',
    }
  );
}

/** Maps a status to a Tailwind color-class set for badges/pills. */
export function getStatusColor(status: AppStatus): string {
  const colors: Record<StatusMeta['color'], string> = {
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  };
  return colors[getStatusMeta(status).color];
}

// =============================================================================
// MISC STRING HELPERS
// =============================================================================
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

/** Sanitises a filename for safe storage (strips special chars, prepends timestamp). */
export function sanitizeFileName(filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${Date.now()}_${safe}`;
}

/** Stage 1–9 → 0–100 percentage. */
export function getStageProgressPercent(stage: number): number {
  if (stage < 1) return 0;
  if (stage > 9) return 100;
  return Math.round((stage / 9) * 100);
}
