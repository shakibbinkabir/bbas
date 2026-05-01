import { describe, it, expect } from 'vitest';
import {
  validateFileType,
  validateFileSize,
  sanitizeFileName,
  formatFileSize,
  getFileIcon,
} from '../validation';
import { MAX_FILE_SIZE } from '@/lib/constants';

describe('validateFileType', () => {
  it.each([
    'application/pdf',
    'image/jpeg',
    'image/png',
  ])('accepts %s', (type) => {
    expect(validateFileType({ type })).toBe(true);
  });

  it.each([
    'application/x-msdownload',
    'application/zip',
    'text/html',
    '',
  ])('rejects %s', (type) => {
    expect(validateFileType({ type })).toBe(false);
  });
});

describe('validateFileSize', () => {
  it('accepts a small file', () => {
    expect(validateFileSize({ size: 1024 })).toBe(true);
  });

  it('rejects zero/negative', () => {
    expect(validateFileSize({ size: 0 })).toBe(false);
    expect(validateFileSize({ size: -1 })).toBe(false);
  });

  it('rejects files larger than MAX_FILE_SIZE', () => {
    expect(validateFileSize({ size: MAX_FILE_SIZE + 1 })).toBe(false);
  });

  it('accepts files at exactly MAX_FILE_SIZE', () => {
    expect(validateFileSize({ size: MAX_FILE_SIZE })).toBe(true);
  });

  it('rejects non-finite values', () => {
    expect(validateFileSize({ size: Number.POSITIVE_INFINITY })).toBe(false);
    expect(validateFileSize({ size: Number.NaN })).toBe(false);
  });
});

describe('sanitizeFileName', () => {
  it('strips path components', () => {
    expect(sanitizeFileName('/etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('C:\\Users\\evil\\file.pdf')).toBe('file.pdf');
  });

  it('replaces special characters with underscores', () => {
    const out = sanitizeFileName('hello world!@#$.pdf');
    expect(out).toBe('hello_world.pdf');
  });

  it('lowercases the extension', () => {
    expect(sanitizeFileName('FILE.PDF')).toBe('FILE.pdf');
  });

  it('returns "file" for empty/special-only input', () => {
    expect(sanitizeFileName('!!!.pdf')).toBe('file.pdf');
  });

  it('caps total length at 200 chars', () => {
    const long = 'a'.repeat(300) + '.pdf';
    const out = sanitizeFileName(long);
    expect(out.length).toBeLessThanOrEqual(200);
  });

  it('does not prepend a timestamp (callers do that)', () => {
    expect(sanitizeFileName('plain.pdf')).toBe('plain.pdf');
  });
});

describe('formatFileSize', () => {
  it('returns 0 B for null/undefined/zero/negative', () => {
    expect(formatFileSize(null)).toBe('0 B');
    expect(formatFileSize(undefined)).toBe('0 B');
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(-1)).toBe('0 B');
  });

  it('renders bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('renders KB', () => {
    expect(formatFileSize(1500)).toBe('1.46 KB');
  });

  it('renders MB', () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toMatch(/MB/);
  });

  it('renders GB', () => {
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toMatch(/GB/);
  });
});

describe('getFileIcon', () => {
  it('returns FileText for PDF', () => {
    expect(getFileIcon('application/pdf')).toBe('FileText');
  });

  it('returns Image for image types', () => {
    expect(getFileIcon('image/png')).toBe('Image');
    expect(getFileIcon('image/jpeg')).toBe('Image');
  });

  it('falls back to File', () => {
    expect(getFileIcon('text/plain')).toBe('File');
  });
});
