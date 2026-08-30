import { z } from 'zod';

const trimmedString = z.string().trim().min(1);
const trimmedStringList = z.array(trimmedString).min(1);

export const verticalProfileSchema = z.object({
  name: trimmedString,
  offer: trimmedString,
  targetRoles: trimmedStringList,
  targetIndustries: trimmedStringList,
  companySize: z
    .object({
      min: z.number().int().positive().optional(),
      max: z.number().int().positive().optional(),
    })
    .refine(
      ({ min, max }) => min === undefined || max === undefined || min <= max,
      'Company size minimum must be less than or equal to maximum.',
    )
    .optional(),
  targetRegions: trimmedStringList,
  positiveSignals: trimmedStringList,
  negativeSignals: trimmedStringList,
  outreachGoal: z.literal('BOOK_CALL'),
  outreachTone: trimmedString,
});

export const updateVerticalProfileRequestSchema = verticalProfileSchema;

export type VerticalProfileInput = z.infer<typeof verticalProfileSchema>;
export type UpdateVerticalProfileRequest = z.infer<typeof updateVerticalProfileRequestSchema>;
