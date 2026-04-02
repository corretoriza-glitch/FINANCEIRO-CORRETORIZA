import { supabase } from '../supabase';
import { AccountsPayable } from '../types';

export const getAccountsPayable = async (companyId: string, filters?: any) => {
  let query = supabase
    .from('accounts_payable')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date', { ascending: true });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('due_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('due_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map((item: any) => ({ ...item, amount: item.amount_total })) as AccountsPayable[];
};

export const createAccountsPayable = async (payable: Partial<AccountsPayable>) => {
  const payload: any = { 
    ...payable, 
    amount_total: payable.amount,
    amount_open: payable.status === 'paid' ? 0 : payable.amount,
    competence_date: payable.competence_date || payable.due_date
  };
  delete payload.amount;
  const { error } = await supabase
    .from('accounts_payable')
    .insert(payload);
  
  if (error) throw error;
};

export const updateAccountsPayable = async (payableId: string, updates: Partial<AccountsPayable>) => {
  const payload: any = { ...updates };
  if (payload.amount !== undefined) {
    payload.amount_total = payload.amount;
    delete payload.amount;
  }
  if (payload.status === 'paid') {
    payload.amount_open = 0;
  }
  const { error } = await supabase
    .from('accounts_payable')
    .update(payload)
    .eq('id', payableId);
  
  if (error) throw error;
};

export const deleteAccountsPayable = async (payableId: string) => {
  const { error } = await supabase
    .from('accounts_payable')
    .delete()
    .eq('id', payableId);
  
  if (error) throw error;
};
