import { z } from "zod";
import { isCommonPassword } from "@/lib/password";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  // bcrypt silently ignores everything past 72 bytes - refuse rather than surprise people.
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .refine((value) => !isCommonPassword(value), {
    message: "This password is too common - choose something less guessable",
  });

// E-mail addresses are compared case-insensitively: "Ada@X.com" and "ada@x.com" are the same mailbox, and
// treating them as different accounts allowed duplicate registrations.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email address is too long")
  .pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
