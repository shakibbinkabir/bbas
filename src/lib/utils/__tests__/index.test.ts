import { describe, it, expect } from 'vitest';
import {
  cn,
  toBanglaNumerals,
  toEnglishNumerals,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  getStageInfo,
  getStageNameByNumber,
  getStatusMeta,
  getStatusColor,
  truncateText,
  getInitials,
  sanitizeFileName,
  getStageProgressPercent,
} from '../index';

describe('cn', () => {
  it('merges classes', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
});

describe('toBanglaNumerals / toEnglishNumerals', () => {
  it('converts ASCII digits to Bangla', () => {
    expect(toBanglaNumerals('2025')).toBe('২০২৫');
    expect(toBanglaNumerals(123)).toBe('১২৩');
  });

  it('leaves non-digits untouched', () => {
    expect(toBanglaNumerals('Page 9')).toBe('Page ৯');
  });

  it('round-trips back to ASCII', () => {
    expect(toEnglishNumerals('২০২৫')).toBe('2025');
  });
});

describe('formatDate', () => {
  it('returns empty string for null/invalid input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });

  it('formats English locale without Bangla digits', () => {
    const out = formatDate('2026-05-01', 'en');
    expect(out).toMatch(/2026/);
    // Should not contain any Bangla digits
    expect(out).not.toMatch(/[০-৯]/);
  });

  it('formats Bangla locale with Bangla digits', () => {
    const out = formatDate('2026-05-01', 'bn');
    expect(out).toMatch(/[০-৯]/);
  });
});

describe('formatDateTime', () => {
  it('includes time component', () => {
    const out = formatDateTime('2026-05-01T10:30:00Z', 'en');
    expect(out).toMatch(/\d/);
  });
});

describe('formatCurrency', () => {
  it('returns empty string for null/undefined/NaN', () => {
    expect(formatCurrency(null)).toBe('');
    expect(formatCurrency(undefined)).toBe('');
    expect(formatCurrency(Number.NaN)).toBe('');
  });

  it('prefixes the BDT symbol', () => {
    expect(formatCurrency(1000, 'en')).toContain('৳');
  });

  it('uses Bangla numerals when locale is bn', () => {
    expect(formatCurrency(1000, 'bn')).toMatch(/[০-৯]/);
  });
});

describe('formatNumber', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(undefined)).toBe('');
  });

  it('renders large numbers with grouping', () => {
    expect(formatNumber(100000, 'en')).toMatch(/[,]/);
  });
});

describe('getStageInfo / getStageNameByNumber', () => {
  it('returns stage 1 metadata', () => {
    const stage = getStageInfo(1);
    expect(stage.number).toBe(1);
    expect(stage.nameEn).toBeTruthy();
    expect(stage.nameBn).toBeTruthy();
  });

  it('returns a fallback for unknown stage numbers', () => {
    const stage = getStageInfo(99);
    expect(stage.number).toBe(99);
    expect(stage.nameEn).toContain('Stage 99');
  });

  it('returns localized name based on locale', () => {
    const en = getStageNameByNumber(1, 'en');
    const bn = getStageNameByNumber(1, 'bn');
    expect(en).toBeTruthy();
    expect(bn).toBeTruthy();
    expect(en).not.toBe(bn);
  });
});

describe('getStatusMeta / getStatusColor', () => {
  it('returns metadata for known statuses', () => {
    const meta = getStatusMeta('approved');
    expect(meta.value).toBe('approved');
  });

  it('returns a Tailwind color string', () => {
    expect(getStatusColor('approved')).toContain('green');
    expect(getStatusColor('rejected')).toContain('red');
  });
});

describe('truncateText', () => {
  it('returns empty string for null', () => {
    expect(truncateText(null, 10)).toBe('');
  });

  it('returns the original text if shorter than max', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis', () => {
    const out = truncateText('abcdefghijklmnopqrstuvwxyz', 5);
    expect(out.length).toBe(5);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('getInitials', () => {
  it('returns empty string for null/empty', () => {
    expect(getInitials(null)).toBe('');
    expect(getInitials('')).toBe('');
  });

  it('returns up to two initials in uppercase', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('John Quincy Adams')).toBe('JQ');
    expect(getInitials('cher')).toBe('C');
  });
});

describe('sanitizeFileName (utils)', () => {
  it('replaces special characters', () => {
    const out = sanitizeFileName('hello world!@#.pdf');
    expect(out).not.toMatch(/[!@#]/);
    expect(out).toMatch(/\.pdf$/);
  });

  it('prepends a timestamp', () => {
    const out = sanitizeFileName('file.pdf');
    expect(out).toMatch(/^\d+_/);
  });
});

describe('getStageProgressPercent', () => {
  it('clamps below 1 to 0', () => {
    expect(getStageProgressPercent(0)).toBe(0);
    expect(getStageProgressPercent(-5)).toBe(0);
  });

  it('clamps above 9 to 100', () => {
    expect(getStageProgressPercent(10)).toBe(100);
    expect(getStageProgressPercent(99)).toBe(100);
  });

  it('scales 1..9 linearly', () => {
    expect(getStageProgressPercent(1)).toBe(11);
    expect(getStageProgressPercent(5)).toBe(56);
    expect(getStageProgressPercent(9)).toBe(100);
  });
});
