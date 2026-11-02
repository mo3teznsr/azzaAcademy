import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  remember: z.boolean(),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  password: z.string().min(8),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotSchema = z.object({ email: z.email() });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password: z.string().min(8), confirm: z.string().min(8) })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' });
export type ResetValues = z.infer<typeof resetSchema>;
