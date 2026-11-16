import { z } from 'zod';

// Companies and schools: organizations, seat packs (corporate orders) and seat assignments.

export const ORGANIZATION_ROLES = ['LEARNER', 'MANAGER'] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const SEAT_PACK_STATUSES = ['INVOICED', 'PAID', 'CANCELLED'] as const;
export type SeatPackStatusName = (typeof SEAT_PACK_STATUSES)[number];

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const organizationInput = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().min(2).max(200),
  /** UAE TRN, 15 digits; empty when the organization is not VAT registered. */
  trn: z
    .string()
    .trim()
    .regex(/^(\d{15})?$/, 'A UAE TRN has 15 digits')
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  address: optionalText,
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.email(),
  contactPhone: optionalText,
  billingEmail: z.email(),
});
export type OrganizationInput = z.infer<typeof organizationInput>;

export const organizationMemberInput = z.object({
  email: z.email(),
  /** Needed only when the person has no account yet (they get an invite email). */
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ORGANIZATION_ROLES).default('LEARNER'),
});
export type OrganizationMemberInput = z.infer<typeof organizationMemberInput>;

export const seatPackInput = z
  .object({
    /** A live batch, or a recorded course (exactly one). */
    batchId: z.string().min(1).optional(),
    courseId: z.string().min(1).optional(),
    seats: z.number().int().min(1).max(1000),
    /** Price per seat before VAT, in fils. */
    unitPriceFils: z.number().int().min(0),
    discountFils: z.number().int().min(0).default(0),
    /** Already paid by bank transfer (with its reference), or invoiced now and paid later. */
    paid: z.boolean().default(false),
    paymentReference: z.string().trim().max(120).optional(),
    /** Recorded packs: when access ends (ISO date or date-time). */
    accessEndsAt: z.coerce.date().optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => !!v.batchId !== !!v.courseId, { message: 'Pick a class or a recorded course', path: ['batchId'] })
  .refine((v) => !v.courseId || !!v.accessEndsAt, { message: 'A recorded pack needs an access end date', path: ['accessEndsAt'] })
  .refine((v) => !v.paid || !!v.paymentReference, { message: 'A paid pack needs the bank transfer reference', path: ['paymentReference'] });
export type SeatPackInput = z.infer<typeof seatPackInput>;

export const seatPackPaidInput = z.object({ paymentReference: z.string().trim().min(1).max(120) });

export const seatAssignInput = z.object({
  email: z.email(),
  /** Needed only when the learner has no account yet (they get an invite email). */
  name: z.string().trim().min(2).max(120).optional(),
});
export type SeatAssignInput = z.infer<typeof seatAssignInput>;

export const orgReportQuery = z.object({ format: z.enum(['json', 'csv']).default('json') });
