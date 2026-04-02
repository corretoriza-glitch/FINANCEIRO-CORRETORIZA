import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthGuard';
import { updateUserProfile } from '../../services/settingsService';
import { supabase } from '../../supabase';
import { useToast } from '../../contexts/ToastContext';
import { Camera, Save } from 'lucide-react';
import { profileSchema } from '../../lib/validation';
import { z } from 'zod';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export default function SettingsProfile() {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.photo_url || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhoto(user.photo_url || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      profileSchema.parse({ name: profileName, photo_url: profilePhoto });

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: profileName, avatar_url: profilePhoto }
      });
      if (authError) throw authError;

      await updateUserProfile(user.id, {
        name: profileName,
        photo_url: profilePhoto
      });

      toast({ type: 'success', message: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        toast({ type: 'error', message: error.errors[0]?.message || 'Erro de validação' });
      } else {
        toast({ type: 'error', message: 'Erro ao atualizar perfil.' });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 max-w-2xl"
    >
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="flex items-center space-x-6">
          <div className="relative group cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-brand/10 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {profilePhoto ? (
                <img src={profilePhoto} alt={profileName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-serif text-brand">{profileName?.charAt(0)}</span>
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">URL da Foto</label>
            <input
              type="url"
              value={profilePhoto}
              onChange={(e) => setProfilePhoto(e.target.value)}
              placeholder="https://exemplo.com/foto.png"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 ml-1">Nome de Exibição</label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all"
            required
          />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSavingProfile}
            className={cn(
              "w-full bg-brand text-white py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-brand/20 font-medium",
              isSavingProfile ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4A4A30]"
            )}
          >
            {isSavingProfile ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            <span>{isSavingProfile ? 'Salvando...' : 'Salvar Perfil'}</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
