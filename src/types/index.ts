/**
 * Application-level types — extend raw database rows with computed fields
 * and join shapes used in the UI.
 */
import type {
  ApplicationDocumentRow,
  ApplicationRow,
  AuthorityRow,
  AIScoringResultRow,
  NotificationRow,
  UserProfileRow,
  WorkflowHistoryRow,
} from './database';

export type {
  AppStatus,
  BuildingType,
  DocumentType,
  LanguagePref,
  NotificationType,
  ThemePref,
  UploadStatus,
  UserRole,
  WorkflowAction,
} from './database';

// =============================================================================
// CORE
// =============================================================================
export type Authority = AuthorityRow;

export type UserProfile = UserProfileRow & {
  authority?: Authority | null;
};

export type Application = ApplicationRow & {
  authority?: Authority;
  owner?: UserProfile;
  assigned_officer?: UserProfile | null;
  documents?: DocumentMeta[];
};

export type DocumentMeta = ApplicationDocumentRow;

export type WorkflowEntry = WorkflowHistoryRow & {
  performed_by_profile?: Pick<UserProfile, 'id' | 'full_name_en' | 'full_name_bn' | 'role'> | null;
};

export type AIScore = AIScoringResultRow;

export type Notification = NotificationRow;

// =============================================================================
// STAGE METADATA
// =============================================================================
export interface StageInfo {
  number: number;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
}

/** All 9 workflow stages, ordered (PRD Section 10.1). */
export const STAGES: StageInfo[] = [
  {
    number: 1,
    nameEn: 'Application Registration',
    nameBn: 'আবেদন নিবন্ধন',
    descriptionEn: 'Application received by system',
    descriptionBn: 'আবেদন সিস্টেমে গ্রহণ করা হয়েছে',
  },
  {
    number: 2,
    nameEn: 'Document Verification',
    nameBn: 'নথি যাচাই',
    descriptionEn: 'Land and ownership documents verified',
    descriptionBn: 'জমি এবং মালিকানা সংক্রান্ত নথি যাচাইকরণ',
  },
  {
    number: 3,
    nameEn: 'Planning Check',
    nameBn: 'পরিকল্পনা যাচাই',
    descriptionEn: 'Zoning and land use compliance',
    descriptionBn: 'অঞ্চলবিভাগ ও ভূমি ব্যবহার সম্মতি',
  },
  {
    number: 4,
    nameEn: 'Technical Review',
    nameBn: 'কারিগরি পর্যালোচনা',
    descriptionEn: 'Building design technical review',
    descriptionBn: 'ভবন নকশার কারিগরি পর্যালোচনা',
  },
  {
    number: 5,
    nameEn: 'External Clearances',
    nameBn: 'বহিঃস্থ অনুমোদন',
    descriptionEn: 'Fire NOC, Environment clearance, etc.',
    descriptionBn: 'ফায়ার এনওসি, পরিবেশ ছাড়পত্র ইত্যাদি',
  },
  {
    number: 6,
    nameEn: 'Field Inspection',
    nameBn: 'মাঠ পরিদর্শন',
    descriptionEn: 'Physical site inspection if needed',
    descriptionBn: 'প্রয়োজনে সরেজমিন পরিদর্শন',
  },
  {
    number: 7,
    nameEn: 'Objection Cycle',
    nameBn: 'আপত্তি চক্র',
    descriptionEn: 'Owner addresses any raised issues',
    descriptionBn: 'আবেদনকারী উত্থাপিত বিষয়গুলির সমাধান করেন',
  },
  {
    number: 8,
    nameEn: 'Final Approval',
    nameBn: 'চূড়ান্ত অনুমোদন',
    descriptionEn: 'Senior officer / admin gives final go-ahead',
    descriptionBn: 'প্রবীণ কর্মকর্তা / প্রশাসক চূড়ান্ত সম্মতি প্রদান করেন',
  },
  {
    number: 9,
    nameEn: 'Sanction',
    nameBn: 'অনুমোদনপত্র',
    descriptionEn: 'Approval letter issued',
    descriptionBn: 'অনুমোদনপত্র ইস্যু',
  },
];

// =============================================================================
// API RESPONSE / HELPER SHAPES
// =============================================================================
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SignedUploadUrl {
  url: string;
  path: string;
  token: string;
  expiresAt: string;
}

export interface CurrentUserResponse {
  user: UserProfile;
  authority: Authority | null;
}
