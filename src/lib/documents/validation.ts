/**
 * Document validation utilities (PRD Section 11.3, Stage 4 / Task 4.9).
 *
 * Both client- and server-side code can import these helpers — they have no
 * runtime dependencies on `next/headers` or browser-only APIs.
 */
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  type AcceptedMimeType,
} from '@/lib/constants';

const ACCEPTED_TYPES = ACCEPTED_FILE_TYPES as readonly string[];

/** Check that `file.type` is one of the accepted MIME types. */
export function validateFileType(file: { type: string }): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

/** Check that `file.size` is positive and within MAX_FILE_SIZE. */
export function validateFileSize(file: { size: number }): boolean {
  return Number.isFinite(file.size) && file.size > 0 && file.size <= MAX_FILE_SIZE;
}

/**
 * Sanitises an uploaded file name for safe storage.
 *
 * - Strips directory components (handles both `/` and `\`).
 * - Replaces any character outside `[a-zA-Z0-9._-]` with `_`.
 * - Collapses runs of `_` and trims leading/trailing `_` and `.`.
 * - Caps the total length at 200 chars to fit comfortably in storage paths.
 *
 * Note: the storage path convention prepends `${Date.now()}_` to the result —
 * this function does NOT add the timestamp itself.
 */
export function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[\\/]/, '');
  const lastDot = base.lastIndexOf('.');
  const stem = lastDot > 0 ? base.slice(0, lastDot) : base;
  const ext = lastDot > 0 ? base.slice(lastDot) : '';

  const safeStem =
    stem
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_.]+|[_.]+$/g, '') || 'file';
  const safeExt = ext.replace(/[^a-zA-Z0-9.]+/g, '').toLowerCase();

  return `${safeStem}${safeExt}`.slice(0, 200);
}

/** Lucide icon name appropriate for a given MIME type. */
export function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'FileText';
  if (mimeType.startsWith('image/')) return 'Image';
  return 'File';
}

/** Render a byte count as `2.4 MB`-style string. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let unit = 0;
  let size = bytes;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  const fixed = unit === 0 ? 0 : size >= 10 ? 1 : 2;
  const formatted = size.toFixed(fixed);
  // Strip trailing zeros after the decimal point only (e.g. "1.50" → "1.5",
  // "1.00" → "1"), but never trim digits from integer values like "500".
  const trimmed = formatted.includes('.')
    ? formatted.replace(/\.?0+$/, '')
    : formatted;
  return `${trimmed} ${units[unit]}`;
}

export const ACCEPTED_MIME_TYPES = ACCEPTED_FILE_TYPES;
export type { AcceptedMimeType };
