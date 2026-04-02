import { supabase } from '../supabase';
import { User, Company, SystemSetting, UserInvite, Category } from '../types';

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return data as User | null;
};

export const getCompany = async (companyId: string) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  
  if (error) throw error;
  return data as Company;
};

export const getSystemSettings = async (companyId: string) => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as SystemSetting | null;
};

export const findInviteByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('user_invites')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data as UserInvite | null;
};

export const acceptInvite = async (inviteId: string) => {
  const { error } = await supabase
    .from('user_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);
  
  if (error) throw error;
};

export const createUserProfile = async (user: User) => {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();
  
  if (error) throw error;
  return data as User;
};

export const createCompany = async (company: Omit<Company, 'id'>) => {
  const { data, error } = await supabase
    .from('companies')
    .insert(company)
    .select()
    .single();
  
  if (error) throw error;
  return data as Company;
};

export const createSystemSettings = async (settings: Omit<SystemSetting, 'id'>) => {
  const { data, error } = await supabase
    .from('system_settings')
    .insert(settings)
    .select()
    .single();
  
  if (error) throw error;
  return data as SystemSetting;
};

export const createDefaultCategories = async (companyId: string) => {
  const defaultCategories: Partial<Category>[] = [
    { company_id: companyId, name: 'Vendas', type: 'income', status: 'active' },
    { company_id: companyId, name: 'Serviços', type: 'income', status: 'active' },
    { company_id: companyId, name: 'Aluguel', type: 'expense', status: 'active' },
    { company_id: companyId, name: 'Salários', type: 'expense', status: 'active' },
    { company_id: companyId, name: 'Marketing', type: 'expense', status: 'active' },
    { company_id: companyId, name: 'Impostos', type: 'expense', status: 'active' },
    { company_id: companyId, name: 'Comissões', type: 'expense', status: 'active' },
  ];

  const { error } = await supabase
    .from('categories')
    .insert(defaultCategories);
  
  if (error) throw error;
};
