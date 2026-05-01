import { z } from 'zod';

/**
 * Wizard-side schema. Each field uses the per-step validation rules from PRD
 * Section 8.2. The same useForm instance backs all 5 steps; per-step `Next`
 * buttons only `trigger()` that step's slice.
 *
 * Numeric fields accept '' (empty input) so a freshly opened wizard doesn't
 * eagerly fail. Empty values become null at draft-save time via
 * `toDraftPayload`.
 */
const buildingTypeEnum = z.enum([
  'residential',
  'commercial',
  'industrial',
  'mixed',
  'institutional',
]);

const numericRequired = (opts: { min?: number; max?: number; integer?: boolean }) =>
  z
    .union([z.number(), z.string(), z.literal('')])
    .refine((v) => v !== '' && v !== null && v !== undefined, { message: 'required' })
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .refine((v) => typeof v === 'number' && !Number.isNaN(v), { message: 'invalid' })
    .refine((v) => !opts.integer || Number.isInteger(v), { message: 'integer' })
    .refine((v) => opts.min === undefined || v >= opts.min!, {
      message: opts.min !== undefined && opts.min > 0 ? 'positive' : 'min',
    })
    .refine((v) => opts.max === undefined || v <= opts.max!, { message: 'max' });

const numericOptional = (opts: { min?: number; max?: number }) =>
  z
    .union([z.number(), z.string(), z.literal(''), z.null(), z.undefined()])
    .transform((v) =>
      v === '' || v === null || v === undefined ? null : typeof v === 'string' ? Number(v) : v
    )
    .refine((v) => v === null || (typeof v === 'number' && !Number.isNaN(v)), {
      message: 'invalid',
    })
    .refine((v) => v === null || opts.min === undefined || v >= opts.min!, { message: 'min' })
    .refine((v) => v === null || opts.max === undefined || v <= opts.max!, { message: 'max' });

export const applicationFormSchema = z.object({
  // Step 1 — Project info
  projectNameEn: z
    .string()
    .trim()
    .min(3, { message: 'tooShort' })
    .max(255, { message: 'tooLong' }),
  projectNameBn: z
    .string()
    .trim()
    .min(3, { message: 'tooShort' })
    .max(255, { message: 'tooLong' }),
  buildingType: buildingTypeEnum,
  numFloors: numericRequired({ min: 1, max: 40, integer: true }),
  totalAreaSqft: numericRequired({ min: 0.01, max: 10_000_000 }),
  estimatedCostBdt: numericRequired({ min: 0.01 }),
  projectDescription: z
    .string()
    .trim()
    .max(2000, { message: 'tooLong' })
    .optional()
    .or(z.literal('')),

  // Step 2 — Land info
  authorityId: z.string().min(1, { message: 'required' }),
  landMouza: z.string().trim().min(1, { message: 'required' }).max(255),
  landKhatianNo: z.string().trim().min(1, { message: 'required' }).max(100),
  landDagNo: z.string().trim().min(1, { message: 'required' }).max(100),
  landAreaKatha: numericRequired({ min: 0.01 }),
  landAddressEn: z.string().trim().min(5, { message: 'tooShort' }).max(2000),
  landAddressBn: z.string().trim().min(5, { message: 'tooShort' }).max(2000),
  landLatitude: numericOptional({ min: -90, max: 90 }),
  landLongitude: numericOptional({ min: -180, max: 180 }),

  // Step 3 — Green initiatives
  hasSolarPanel: z.boolean(),
  hasRainwaterHarvest: z.boolean(),
  hasGreenRoof: z.boolean(),
  hasEvCharging: z.boolean(),
  greenDescription: z
    .string()
    .trim()
    .max(1000, { message: 'tooLong' })
    .optional()
    .or(z.literal('')),
});

export type ApplicationFormValues = z.input<typeof applicationFormSchema>;
export type ApplicationFormOutput = z.output<typeof applicationFormSchema>;

export const DEFAULT_FORM_VALUES: ApplicationFormValues = {
  projectNameEn: '',
  projectNameBn: '',
  buildingType: 'residential',
  numFloors: '',
  totalAreaSqft: '',
  estimatedCostBdt: '',
  projectDescription: '',

  authorityId: '',
  landMouza: '',
  landKhatianNo: '',
  landDagNo: '',
  landAreaKatha: '',
  landAddressEn: '',
  landAddressBn: '',
  landLatitude: '',
  landLongitude: '',

  hasSolarPanel: false,
  hasRainwaterHarvest: false,
  hasGreenRoof: false,
  hasEvCharging: false,
  greenDescription: '',
};

/** Convert form values into the camelCase payload for `applicationDraftSchema`. */
export function toDraftPayload(values: Partial<ApplicationFormValues>) {
  const numOrNull = (v: unknown) => {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isNaN(v) ? null : v;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const strOrNull = (v: unknown) => {
    if (typeof v !== 'string') return v ?? null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };

  const payload: Record<string, unknown> = {
    authorityId: strOrNull(values.authorityId) ?? undefined,
    projectNameEn: strOrNull(values.projectNameEn),
    projectNameBn: strOrNull(values.projectNameBn),
    buildingType: values.buildingType,
    numFloors: numOrNull(values.numFloors),
    totalAreaSqft: numOrNull(values.totalAreaSqft),
    estimatedCostBdt: numOrNull(values.estimatedCostBdt),
    landMouza: strOrNull(values.landMouza),
    landKhatianNo: strOrNull(values.landKhatianNo),
    landDagNo: strOrNull(values.landDagNo),
    landAreaKatha: numOrNull(values.landAreaKatha),
    landAddressEn: strOrNull(values.landAddressEn),
    landAddressBn: strOrNull(values.landAddressBn),
    landLatitude: numOrNull(values.landLatitude),
    landLongitude: numOrNull(values.landLongitude),
    hasSolarPanel: !!values.hasSolarPanel,
    hasRainwaterHarvest: !!values.hasRainwaterHarvest,
    hasGreenRoof: !!values.hasGreenRoof,
    hasEvCharging: !!values.hasEvCharging,
    greenDescription: strOrNull(values.greenDescription),
  };

  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }
  return payload;
}
