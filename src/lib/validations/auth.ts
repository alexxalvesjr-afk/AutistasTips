import { z } from "zod";
import { sanitizeText } from "@/lib/sanitize";

/**
 * Política de senha forte: mínimo 10 caracteres com letra maiúscula,
 * minúscula, número e símbolo.
 */
export const passwordSchema = z
  .string()
  .min(10, "A senha deve ter no mínimo 10 caracteres")
  .max(128, "A senha deve ter no máximo 128 caracteres")
  .regex(/[a-z]/, "Inclua ao menos uma letra minúscula")
  .regex(/[A-Z]/, "Inclua ao menos uma letra maiúscula")
  .regex(/[0-9]/, "Inclua ao menos um número")
  .regex(/[^a-zA-Z0-9]/, "Inclua ao menos um símbolo");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("E-mail inválido")
  .max(254);

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome")
    .max(120)
    .transform(sanitizeText),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha").max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual").max(128),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
