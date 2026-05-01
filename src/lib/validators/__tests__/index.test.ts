import { describe, it, expect } from 'vitest';
import {
  registrationSchema,
  loginSchema,
  otpSchema,
  applicationDraftSchema,
  applicationSubmitSchema,
  documentUploadSchema,
  workflowActionSchema,
  profileUpdateSchema,
  preferencesSchema,
  bdPhoneRegex,
} from '../index';

const VALID_UUID = '00000000-0000-4000-8000-000000000001';

describe('bdPhoneRegex', () => {
  it.each([
    '+8801712345678',
    '8801712345678',
    '01712345678',
    '01912345678',
  ])('accepts %s', (phone) => {
    expect(bdPhoneRegex.test(phone)).toBe(true);
  });

  it.each([
    '12345',
    '01212345678',
    '+1234567890',
    'abc',
  ])('rejects %s', (phone) => {
    expect(bdPhoneRegex.test(phone)).toBe(false);
  });
});

describe('registrationSchema', () => {
  const valid = {
    fullNameEn: 'John Doe',
    fullNameBn: 'জন ডো',
    phone: '01712345678',
    email: 'foo@example.com',
    preferredLanguage: 'en' as const,
  };

  it('accepts a valid registration', () => {
    expect(registrationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects short Bangla name', () => {
    const result = registrationSchema.safeParse({ ...valid, fullNameBn: 'অ' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registrationSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown language', () => {
    const result = registrationSchema.safeParse({ ...valid, preferredLanguage: 'fr' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts a phone identifier', () => {
    expect(loginSchema.safeParse({ identifier: '01712345678' }).success).toBe(true);
  });

  it('accepts an email identifier', () => {
    expect(loginSchema.safeParse({ identifier: 'foo@bar.com' }).success).toBe(true);
  });

  it('rejects gibberish', () => {
    expect(loginSchema.safeParse({ identifier: 'abc' }).success).toBe(false);
  });
});

describe('otpSchema', () => {
  it('accepts a 6-digit code', () => {
    expect(
      otpSchema.safeParse({ identifier: 'foo', code: '123456' }).success
    ).toBe(true);
  });

  it('rejects non-numeric codes', () => {
    expect(
      otpSchema.safeParse({ identifier: 'foo', code: 'abcdef' }).success
    ).toBe(false);
  });

  it('rejects wrong-length codes', () => {
    expect(
      otpSchema.safeParse({ identifier: 'foo', code: '12345' }).success
    ).toBe(false);
  });
});

describe('applicationDraftSchema', () => {
  it('accepts an empty object (all optional)', () => {
    expect(applicationDraftSchema.safeParse({}).success).toBe(true);
  });

  it('coerces numeric strings', () => {
    const result = applicationDraftSchema.safeParse({ numFloors: '5' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.numFloors).toBe(5);
  });

  it('rejects out-of-range latitude', () => {
    expect(
      applicationDraftSchema.safeParse({ landLatitude: 100 }).success
    ).toBe(false);
  });
});

describe('applicationSubmitSchema', () => {
  const valid = {
    authorityId: VALID_UUID,
    projectNameEn: 'My Building',
    projectNameBn: 'আমার ভবন',
    buildingType: 'residential' as const,
    numFloors: 5,
    totalAreaSqft: 1500,
    estimatedCostBdt: 5000000,
    landMouza: 'Test Mouza',
    landKhatianNo: '123',
    landDagNo: '456',
    landAreaKatha: 5,
    landAddressEn: 'Dhaka, Bangladesh',
    landAddressBn: 'ঢাকা, বাংলাদেশ',
    hasSolarPanel: true,
    hasRainwaterHarvest: false,
    hasGreenRoof: false,
    hasEvCharging: false,
  };

  it('accepts a complete application', () => {
    expect(applicationSubmitSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing authority', () => {
    const { authorityId, ...rest } = valid;
    expect(applicationSubmitSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects negative cost', () => {
    expect(
      applicationSubmitSchema.safeParse({ ...valid, estimatedCostBdt: -1 }).success
    ).toBe(false);
  });

  it('rejects unknown building type', () => {
    expect(
      applicationSubmitSchema.safeParse({ ...valid, buildingType: 'foo' }).success
    ).toBe(false);
  });
});

describe('documentUploadSchema', () => {
  const valid = {
    applicationId: VALID_UUID,
    documentType: 'land_deed' as const,
    fileName: 'deed.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf' as const,
  };

  it('accepts a valid PDF upload', () => {
    expect(documentUploadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unsupported MIME types', () => {
    expect(
      documentUploadSchema.safeParse({ ...valid, mimeType: 'application/x-msdownload' }).success
    ).toBe(false);
  });

  it('rejects oversized files (>10MB)', () => {
    expect(
      documentUploadSchema.safeParse({ ...valid, fileSize: 20 * 1024 * 1024 }).success
    ).toBe(false);
  });

  it('rejects unknown document types', () => {
    expect(
      documentUploadSchema.safeParse({ ...valid, documentType: 'unknown' }).success
    ).toBe(false);
  });
});

describe('workflowActionSchema', () => {
  it('requires comment for return', () => {
    const result = workflowActionSchema.safeParse({
      applicationId: VALID_UUID,
      action: 'return',
    });
    expect(result.success).toBe(false);
  });

  it('requires comment for reject', () => {
    const result = workflowActionSchema.safeParse({
      applicationId: VALID_UUID,
      action: 'reject',
    });
    expect(result.success).toBe(false);
  });

  it('accepts return with comment', () => {
    const result = workflowActionSchema.safeParse({
      applicationId: VALID_UUID,
      action: 'return',
      comment: 'please update plans',
    });
    expect(result.success).toBe(true);
  });

  it('requires assigneeId for assign', () => {
    const result = workflowActionSchema.safeParse({
      applicationId: VALID_UUID,
      action: 'assign',
    });
    expect(result.success).toBe(false);
  });

  it('accepts advance without comment', () => {
    expect(
      workflowActionSchema.safeParse({
        applicationId: VALID_UUID,
        action: 'advance',
      }).success
    ).toBe(true);
  });
});

describe('profileUpdateSchema', () => {
  it('accepts partial updates', () => {
    expect(
      profileUpdateSchema.safeParse({ fullNameEn: 'Jane Doe' }).success
    ).toBe(true);
  });

  it('rejects invalid phone', () => {
    expect(
      profileUpdateSchema.safeParse({ phone: 'abc' }).success
    ).toBe(false);
  });
});

describe('preferencesSchema', () => {
  it('accepts known language', () => {
    expect(
      preferencesSchema.safeParse({ preferredLanguage: 'bn' }).success
    ).toBe(true);
  });

  it('rejects unknown theme', () => {
    expect(
      preferencesSchema.safeParse({ preferredTheme: 'sepia' }).success
    ).toBe(false);
  });
});
