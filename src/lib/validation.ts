import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export const companySchema = z.object({
  companyName: z.string().min(3, 'O nome da empresa deve ter no mínimo 3 caracteres'),
  tradeName: z.string().min(3, 'O nome fantasia deve ter no mínimo 3 caracteres'),
  document: z.string().min(11, 'Documento inválido'),
});

export const signupSchema = loginSchema.extend({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  companyName: z.string().min(3, 'O nome da empresa deve ter no mínimo 3 caracteres').optional(),
});

export const passwordResetSchema = z.object({
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export const teamSchema = z.object({
  name: z.string().min(2, 'O nome do time deve ter no mínimo 2 caracteres'),
  manager_user_id: z.string().min(1, 'O gestor é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria deve ter no mínimo 2 caracteres'),
  type: z.enum(['income', 'expense']),
});

export const inviteUserSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'finance', 'manager', 'broker', 'partner', 'read']),
});

export const directUserSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['admin', 'finance', 'manager', 'broker', 'partner', 'read']),
  team_id: z.string().optional(),
  commission_type: z.enum(['percentage', 'fixed']).optional(),
  commission_value: z.number().min(0, 'O valor da comissão deve ser positivo').optional(),
}).refine(data => {
  if (data.role === 'broker' && !data.team_id) {
    return false;
  }
  return true;
}, {
  message: "Corretores devem pertencer a um time.",
  path: ["team_id"]
}).refine(data => {
  if (data.role === 'broker' && (data.commission_value === undefined || data.commission_value <= 0)) {
    return false;
  }
  return true;
}, {
  message: "O valor da comissão deve ser maior que zero para corretores.",
  path: ["commission_value"]
});

export const profileSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  photo_url: z.string().url('URL da foto inválida').optional().or(z.literal('')),
});
