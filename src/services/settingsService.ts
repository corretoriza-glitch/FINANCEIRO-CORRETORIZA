import { supabase } from '../supabase';
import { User, Team, Category, SystemSetting, UserInvite } from '../types';

export const getCompanyUsers = async (companyId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  
  if (error) throw error;
  return data as User[];
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
  
  if (error) throw error;
};

export const getCompanyTeams = async (companyId: string) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  
  if (error) throw error;
  return data as Team[];
};

export const createTeam = async (team: Partial<Team>) => {
  const { error } = await supabase
    .from('teams')
    .insert(team);
  
  if (error) throw error;
};

export const updateTeam = async (teamId: string, updates: Partial<Team>) => {
  const { error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId);
  
  if (error) throw error;
};

export const getCompanyCategories = async (companyId: string) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  
  if (error) throw error;
  return data as Category[];
};

export const createCategory = async (category: Partial<Category>) => {
  const { error } = await supabase
    .from('categories')
    .insert(category);
  
  if (error) throw error;
};

export const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
  const { error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId);
  
  if (error) throw error;
};

export const deleteCategory = async (categoryId: string) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);
  
  if (error) throw error;
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
  
  if (error) throw error;
};

export const updateSystemSettings = async (settingsId: string, updates: Partial<SystemSetting>) => {
  const { error } = await supabase
    .from('system_settings')
    .update(updates)
    .eq('id', settingsId);
  
  if (error) throw error;
};

export const getCompanyInvites = async (companyId: string) => {
  const { data, error } = await supabase
    .from('user_invites')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as UserInvite[];
};

export const createInvite = async (invite: Partial<UserInvite>) => {
  const { error } = await supabase
    .from('user_invites')
    .insert(invite);
  
  if (error) throw error;
};

export const deleteInvite = async (inviteId: string) => {
  const { error } = await supabase
    .from('user_invites')
    .delete()
    .eq('id', inviteId);
  
  if (error) throw error;
};
