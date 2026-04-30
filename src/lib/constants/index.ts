/**
 * Bilingual constants — labels, enums, and configuration values used across
 * the application UI and API routes.
 */
import type {
  AppStatus,
  BuildingType,
  DocumentType,
  StageInfo,
} from '@/types';
import { STAGES } from '@/types';

export { STAGES };
export type { StageInfo };

// =============================================================================
// AUTHORITIES
// =============================================================================
export interface AuthorityMeta {
  code: 'RAJUK' | 'CDA' | 'KDA' | 'RDA';
  nameEn: string;
  nameBn: string;
  jurisdictionEn: string;
  jurisdictionBn: string;
}

export const AUTHORITIES: AuthorityMeta[] = [
  {
    code: 'RAJUK',
    nameEn: 'Rajdhani Unnayan Kartripakkha',
    nameBn: 'রাজধানী উন্নয়ন কর্তৃপক্ষ',
    jurisdictionEn:
      'Greater Dhaka Metropolitan Area, including Dhaka, Narayanganj, Gazipur, and parts of Munshiganj',
    jurisdictionBn:
      'বৃহত্তর ঢাকা মহানগর এলাকা — ঢাকা, নারায়ণগঞ্জ, গাজীপুর এবং মুন্সিগঞ্জের অংশবিশেষ সহ',
  },
  {
    code: 'CDA',
    nameEn: 'Chattogram Development Authority',
    nameBn: 'চট্টগ্রাম উন্নয়ন কর্তৃপক্ষ',
    jurisdictionEn: 'Chattogram Metropolitan Area and surrounding areas',
    jurisdictionBn: 'চট্টগ্রাম মহানগর এলাকা এবং আশেপাশের এলাকা',
  },
  {
    code: 'KDA',
    nameEn: 'Khulna Development Authority',
    nameBn: 'খুলনা উন্নয়ন কর্তৃপক্ষ',
    jurisdictionEn: 'Khulna Metropolitan Area and surrounding municipalities',
    jurisdictionBn: 'খুলনা মহানগর এলাকা এবং সংলগ্ন পৌরসভা',
  },
  {
    code: 'RDA',
    nameEn: 'Rajshahi Development Authority',
    nameBn: 'রাজশাহী উন্নয়ন কর্তৃপক্ষ',
    jurisdictionEn: 'Rajshahi Metropolitan Area and surrounding upazilas',
    jurisdictionBn: 'রাজশাহী মহানগর এলাকা এবং সংলগ্ন উপজেলা',
  },
];

// =============================================================================
// BUILDING TYPES
// =============================================================================
export interface BuildingTypeMeta {
  value: BuildingType;
  labelEn: string;
  labelBn: string;
}

export const BUILDING_TYPES: BuildingTypeMeta[] = [
  { value: 'residential', labelEn: 'Residential', labelBn: 'আবাসিক' },
  { value: 'commercial', labelEn: 'Commercial', labelBn: 'বাণিজ্যিক' },
  { value: 'industrial', labelEn: 'Industrial', labelBn: 'শিল্প' },
  { value: 'mixed', labelEn: 'Mixed Use', labelBn: 'মিশ্র ব্যবহার' },
  { value: 'institutional', labelEn: 'Institutional', labelBn: 'প্রাতিষ্ঠানিক' },
];

// =============================================================================
// DOCUMENT TYPES (PRD Appendix C — required-for matrix)
// =============================================================================
export interface DocumentTypeMeta {
  value: DocumentType;
  labelEn: string;
  labelBn: string;
  /** Building types for which this document is REQUIRED */
  requiredFor: BuildingType[];
  /** Building types for which this document is OPTIONAL but accepted */
  optionalFor: BuildingType[];
}

const ALL_BUILDINGS: BuildingType[] = [
  'residential',
  'commercial',
  'industrial',
  'mixed',
  'institutional',
];
const NON_RESIDENTIAL: BuildingType[] = [
  'commercial',
  'industrial',
  'mixed',
  'institutional',
];

export const DOCUMENT_TYPES: DocumentTypeMeta[] = [
  {
    value: 'applicant_nid',
    labelEn: 'Applicant NID',
    labelBn: 'আবেদনকারীর জাতীয় পরিচয়পত্র',
    requiredFor: ALL_BUILDINGS,
    optionalFor: [],
  },
  {
    value: 'land_deed',
    labelEn: 'Land Deed',
    labelBn: 'জমির দলিল',
    requiredFor: ALL_BUILDINGS,
    optionalFor: [],
  },
  {
    value: 'khatian_certificate',
    labelEn: 'Khatian Certificate',
    labelBn: 'খতিয়ান সনদ',
    requiredFor: ALL_BUILDINGS,
    optionalFor: [],
  },
  {
    value: 'architectural_plan',
    labelEn: 'Architectural Plan',
    labelBn: 'স্থাপত্য নকশা',
    requiredFor: ALL_BUILDINGS,
    optionalFor: [],
  },
  {
    value: 'site_photo',
    labelEn: 'Site Photo',
    labelBn: 'সাইটের ছবি',
    requiredFor: ALL_BUILDINGS,
    optionalFor: [],
  },
  {
    value: 'structural_plan',
    labelEn: 'Structural Plan',
    labelBn: 'কাঠামোগত নকশা',
    requiredFor: NON_RESIDENTIAL,
    optionalFor: ['residential'],
  },
  {
    value: 'soil_test_report',
    labelEn: 'Soil Test Report',
    labelBn: 'মাটি পরীক্ষার প্রতিবেদন',
    requiredFor: NON_RESIDENTIAL,
    optionalFor: ['residential'],
  },
  {
    value: 'mutation_certificate',
    labelEn: 'Mutation Certificate',
    labelBn: 'নামজারি সনদ',
    requiredFor: [],
    optionalFor: ALL_BUILDINGS,
  },
  {
    value: 'tax_clearance',
    labelEn: 'Tax Clearance',
    labelBn: 'কর পরিশোধ সনদ',
    requiredFor: [],
    optionalFor: ALL_BUILDINGS,
  },
  {
    value: 'eia_report',
    labelEn: 'Environmental Impact Assessment',
    labelBn: 'পরিবেশগত প্রভাব মূল্যায়ন',
    requiredFor: ['industrial'],
    optionalFor: ['residential', 'commercial', 'mixed', 'institutional'],
  },
  {
    value: 'fire_noc',
    labelEn: 'Fire NOC',
    labelBn: 'অগ্নি নিরাপত্তা ছাড়পত্র',
    requiredFor: NON_RESIDENTIAL,
    optionalFor: ['residential'],
  },
  {
    value: 'owner_photo',
    labelEn: 'Owner Photo',
    labelBn: 'মালিকের ছবি',
    requiredFor: [],
    optionalFor: ALL_BUILDINGS,
  },
  {
    value: 'other',
    labelEn: 'Other',
    labelBn: 'অন্যান্য',
    requiredFor: [],
    optionalFor: ALL_BUILDINGS,
  },
];

export function getRequiredDocuments(buildingType: BuildingType): DocumentTypeMeta[] {
  return DOCUMENT_TYPES.filter((d) => d.requiredFor.includes(buildingType));
}

export function getOptionalDocuments(buildingType: BuildingType): DocumentTypeMeta[] {
  return DOCUMENT_TYPES.filter((d) => d.optionalFor.includes(buildingType));
}

// =============================================================================
// STATUS LIST
// =============================================================================
export interface StatusMeta {
  value: AppStatus;
  labelEn: string;
  labelBn: string;
  /** Tailwind color name, used by getStatusColor() */
  color: 'gray' | 'blue' | 'amber' | 'orange' | 'green' | 'red';
}

export const STATUS_LIST: StatusMeta[] = [
  { value: 'draft', labelEn: 'Draft', labelBn: 'খসড়া', color: 'gray' },
  { value: 'submitted', labelEn: 'Submitted', labelBn: 'জমাকৃত', color: 'blue' },
  { value: 'under_review', labelEn: 'Under Review', labelBn: 'পর্যালোচনাধীন', color: 'amber' },
  {
    value: 'information_requested',
    labelEn: 'Information Requested',
    labelBn: 'তথ্য চাওয়া হয়েছে',
    color: 'orange',
  },
  {
    value: 'corrections_submitted',
    labelEn: 'Corrections Submitted',
    labelBn: 'সংশোধনী জমাকৃত',
    color: 'blue',
  },
  { value: 'approved', labelEn: 'Approved', labelBn: 'অনুমোদিত', color: 'green' },
  { value: 'rejected', labelEn: 'Rejected', labelBn: 'প্রত্যাখ্যাত', color: 'red' },
  { value: 'withdrawn', labelEn: 'Withdrawn', labelBn: 'প্রত্যাহার', color: 'gray' },
];

// =============================================================================
// FILE / UPLOAD CONSTRAINTS
// =============================================================================
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;
export type AcceptedMimeType = (typeof ACCEPTED_FILE_TYPES)[number];

export const MAX_FILES_PER_APPLICATION = 20;
export const MAX_TOTAL_STORAGE_PER_APPLICATION = 100 * 1024 * 1024; // 100 MB

// =============================================================================
// PAGINATION
// =============================================================================
export const ITEMS_PER_PAGE = 20;

// =============================================================================
// COOKIES
// =============================================================================
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const THEME_COOKIE = 'theme';

// =============================================================================
// PUBLIC ROUTES (used by middleware)
// =============================================================================
export const PUBLIC_ROUTES = ['/', '/login', '/register', '/verify-otp'] as const;
