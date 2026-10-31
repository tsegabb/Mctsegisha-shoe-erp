import { z } from 'zod';
import { passwordField, phoneField, roleField, uuid } from './common.validator.ts';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().min(3).max(254),
    password: z.string().min(1).max(128),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordField }),
});

export const createUserSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(100),
      email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal('').transform(() => undefined)),
      phone: phoneField.optional().or(z.literal('').transform(() => undefined)),
      password: passwordField,
      role: roleField,
      shopId: uuid.nullable().optional(),
    })
    .refine((b) => b.email || b.phone, { message: 'Either email or phone is required', path: ['email'] }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: uuid }),
  body: z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      email: z.string().trim().toLowerCase().email().max(254).optional(),
      phone: phoneField.nullable().optional(),
      role: roleField.optional(),
      shopId: uuid.nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' }),
});

export const resetPasswordSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({ newPassword: passwordField }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
