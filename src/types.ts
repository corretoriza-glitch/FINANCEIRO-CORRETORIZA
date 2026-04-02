export type Role = 'admin' | 'finance' | 'manager' | 'broker' | 'partner' | 'read';

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  photo_url?: string;
  role: Role;
  status: 'active' | 'inactive' | 'pending';
  team_id?: string | null;
  commission_type?: 'percentage' | 'fixed' | null;
  commission_value?: number | null;
  created_at?: string;
}

export interface Team {
  id: string;
  company_id: string;
  name: string;
  manager_user_id: string;
  status: 'active' | 'inactive';
  description?: string;
  created_at?: string;
}

export interface Company {
  id: string;
  legal_name: string;
  trade_name: string;
  document: string;
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  type: 'income' | 'expense';
  status: 'active' | 'inactive';
}

export interface Transaction {
  id: string;
  company_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  occurrence_date: string;
  competence_date: string;
  category_id: string;
  subcategory_id?: string;
  financial_account_id: string;
  cost_center_id?: string;
  status: string;
  created_at?: string;
}

export interface AccountsPayable {
  id: string;
  company_id: string;
  due_date: string;
  competence_date?: string;
  amount: number;
  amount_open?: number;
  payee: string;
  category_id: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface AccountsReceivable {
  id: string;
  company_id: string;
  due_date: string;
  competence_date?: string;
  amount: number;
  amount_open?: number;
  payer: string;
  category_id: string;
  status: 'pending' | 'received' | 'overdue' | 'cancelled';
  notes?: string;
  created_at?: string;
}

export interface Operation {
  id: string;
  company_id: string;
  code: string;
  description: string;
  gross_value: number;
  status: 'pending' | 'completed' | 'cancelled';
  predicted_payment_date?: string;
  created_at: any;
  commission_base_amount: number;
  distributed_amount: number;
  corretoriza_amount: number;
}

export interface Payout {
  id: string;
  company_id: string;
  operation_id: string;
  participant_user_id: string;
  participant_role: 'broker' | 'partner';
  calculation_type: 'percentage' | 'fixed';
  calculation_value: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: any;
}

export interface FinancialPeriod {
  id: string;
  company_id: string;
  year: number;
  month: number;
  status: 'open' | 'closed';
  closed_at?: string;
  closed_by?: string;
}

export interface SystemSetting {
  id: string;
  company_id: string;
  logo_url?: string;
  primary_color?: string;
  theme: 'light' | 'dark';
}

export interface UserInvite {
  id: string;
  company_id: string;
  email: string;
  role: Role;
  status: 'pending' | 'accepted' | 'expired';
  invited_by: string;
  team_id?: string | null;
  commission_type?: 'percentage' | 'fixed' | null;
  commission_value?: number | null;
  created_at: string;
}
