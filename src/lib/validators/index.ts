import { z } from 'zod';
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/constants';

// =============================================================================
// PRIMITIVES
// =============================================================================

/** Bangladeshi phone numbers — accepts +880XXXXXXXXXX or 01XXXXXXXXX */
export const bdPhoneRegex = /^(?:\+?880|0)1[3-9]\d{8}$/;

const phoneSchema = z
  .string()
  .trim()
  .regex(bdPhoneRegex, 'Phone must be a valid Bangladesh number (+880 or 01...)');

const emailSchema = z.string().trim().toLowerCase().email('Invalid email');

const uuidSchema = z.string().uuid('Invalid identifier');

// =============================================================================
// AUTH
// =============================================================================
export const registrationSchema = z.object({
  fullNameEn: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters')
    .max(255, 'Full name must be at most 255 characters'),
  fullNameBn: z
    .string()
    .trim()
    .min(3, 'নাম কমপক্ষে ৩ অক্ষরের হতে হবে')
    .max(255, 'নাম সর্বোচ্চ ২৫৫ অক্ষরের হতে পারে'),
  phone: phoneSchema,
  email: emailSchema,
  preferredLanguage: z.enum(['bn', 'en']),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Phone or email is required')
    .refine(
      (val) => bdPhoneRegex.test(val) || z.string().email().safeParse(val).success,
      { message: 'Enter a valid phone number or email' }
    ),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const otpSchema = z.object({
  identifier: z.string().min(1),
  code: z
    .string()
    .trim()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});
export type OtpInput = z.infer<typeof otpSchema>;

// =============================================================================
// APPLICATION
// =============================================================================
const buildingTypeEnum = z.enum([
  'residential',
  'commercial',
  'industrial',
  'mixed',
  'institutional',
]);

const baseApplicationFields = {
  authorityId: uuidSchema.optional(),
  projectNameEn: z.string().trim().max(255).optional().nullable(),
  projectNameBn: z.string().trim().max(255).optional().nullable(),
  buildingType: buildingTypeEnum.optional(),
  numFloors: z.coerce.number().int().min(1).max(200).optional().nullable(),
  totalAreaSqft: z.coerce.number().min(0).optional().nullable(),
  estimatedCostBdt: z.coerce.number().min(0).optional().nullable(),
  landMouza: z.string().trim().max(255).optional().nullable(),
  landKhatianNo: z.string().trim().max(100).optional().nullable(),
  landDagNo: z.string().trim().max(100).optional().nullable(),
  landAreaKatha: z.coerce.number().min(0).optional().nullable(),
  landAddressEn: z.string().trim().max(2000).optional().nullable(),
  landAddressBn: z.string().trim().max(2000).optional().nullable(),
  landLatitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  landLongitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  hasSolarPanel: z.boolean().optional(),
  hasRainwaterHarvest: z.boolean().optional(),
  hasGreenRoof: z.boolean().optional(),
  hasEvCharging: z.boolean().optional(),
  greenDescription: z.string().trim().max(2000).optional().nullable(),
};

/** Lenient schema — used for draft saves where most fields can be empty. */
export const applicationDraftSchema = z.object(baseApplicationFields);
export type ApplicationDraftInput = z.infer<typeof applicationDraftSchema>;

/** Strict schema — used at submission time, requires the core fields. */
export const applicationSubmitSchema = z.object({
  authorityId: uuidSchema,
  projectNameEn: z.string().trim().min(1, 'Project name is required').max(255),
  projectNameBn: z.string().trim().min(1, 'প্রকল্পের নাম প্রয়োজন').max(255),
  buildingType: buildingTypeEnum,
  numFloors: z.coerce.number().int().min(1).max(200),
  totalAreaSqft: z.coerce.number().positive('Total area must be positive'),
  estimatedCostBdt: z.coerce.number().positive('Estimated cost must be positive'),
  landMouza: z.string().trim().min(1).max(255),
  landKhatianNo: z.string().trim().min(1).max(100),
  landDagNo: z.string().trim().min(1).max(100),
  landAreaKatha: z.coerce.number().positive(),
  landAddressEn: z.string().trim().min(5).max(2000),
  landAddressBn: z.string().trim().min(5).max(2000),
  landLatitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  landLongitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  hasSolarPanel: z.boolean().default(false),
  hasRainwaterHarvest: z.boolean().default(false),
  hasGreenRoof: z.boolean().default(false),
  hasEvCharging: z.boolean().default(false),
  greenDescription: z.string().trim().max(2000).optional().nullable(),
});
export type ApplicationSubmitInput = z.infer<typeof applicationSubmitSchema>;

// =============================================================================
// DOCUMENTS
// =============================================================================
const acceptedMimeEnum = z.enum(ACCEPTED_FILE_TYPES);

export const documentUploadSchema = z.object({
  applicationId: uuidSchema,
  documentType: z.enum([
    'land_deed',
    'khatian_certificate',
    'mutation_certificate',
    'tax_clearance',
    'architectural_plan',
    'structural_plan',
    'soil_test_report',
    'eia_report',
    'fire_noc',
    'applicant_nid',
    'owner_photo',
    'site_photo',
    'other',
  ]),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, `File size must be at most ${MAX_FILE_SIZE / 1024 / 1024}MB`),
  mimeType: acceptedMimeEnum,
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

// =============================================================================
// WORKFLOW
// =============================================================================
export const workflowActionSchema = z
  .object({
    applicationId: uuidSchema,
    action: z.enum([
      'submit',
      'advance',
      'return',
      'reject',
      'approve',
      'withdraw',
      'comment',
      'assign',
    ]),
    comment: z.string().trim().max(5000).optional(),
    assigneeId: uuidSchema.optional(),
  })
  .refine(
    (val) => !(val.action === 'return' || val.action === 'reject') || (val.comment && val.comment.length > 0),
    { message: 'Comment is required when returning or rejecting an application', path: ['comment'] }
  )
  .refine(
    (val) => val.action !== 'assign' || !!val.assigneeId,
    { message: 'assigneeId is required when assigning', path: ['assigneeId'] }
  );
export type WorkflowActionInput = z.infer<typeof workflowActionSchema>;

// =============================================================================
// PROFILE
// =============================================================================
export const profileUpdateSchema = z.object({
  fullNameEn: z.string().trim().min(3).max(255).optional(),
  fullNameBn: z.string().trim().min(3).max(255).optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const preferencesSchema = z.object({
  preferredLanguage: z.enum(['bn', 'en']).optional(),
  preferredTheme: z.enum(['light', 'dark']).optional(),
});
export type PreferencesInput = z.infer<typeof preferencesSchema>;
