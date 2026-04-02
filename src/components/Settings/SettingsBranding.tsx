import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthGuard';
import { updateSystemSettings } from '../../services/settingsService';
import { getSystemSettings } from '../../services/userService';
import { supabase } from '../../supabase';
import { useToast } from '../../contexts/ToastContext';
import { Palette, Mail, Save } from 'lucide-react';
import { SystemSetting } from '../../types';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export default function SettingsBranding() {
  const { company, refreshSettings } = useAuth();
  const [settings, setSettings] = useState<SystemSetting | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#5A5A40');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      if (company) {
        const settingsData = await getSystemSettings(company.id);
        if (settingsData) {
          setSettings(settingsData);
          setLogoUrl(settingsData.logo_url || '');
          setPrimaryColor(settingsData.primary_color || '#5A5A40');
        }
      }
    }
    loadData();
  }, [company]);

  const handleSaveBranding = async () => {
    if (!company) return;
    setIsSavingBranding(true);
    try {
      if (settings) {
        await updateSystemSettings(settings.id, {
          logo_url: logoUrl,
          primary_color: primaryColor
        });
      } else {
        await supabase.from('system_settings').insert({
          company_id: company.id,
          logo_url: logoUrl,
          primary_color: primaryColor,
          theme: 'light'
        });
      }
      if (refreshSettings) {
        await refreshSettings();
      }
      toast({ type: 'success', message: 'Configurações de identidade salvas!' });
    } catch (error) {
      toast({ type: 'error', message: 'Erro ao salvar configurações.' });
    } finally {
      setIsSavingBranding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 max-w-2xl"
    >
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
          <Palette size={24} />
        </div>
        <div>
          <h2 className="text-xl font-medium text-gray-900">Identidade Visual</h2>
          <p className="text-sm text-gray-500">Personalize a aparência do seu sistema</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 ml-1">URL do Logotipo</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://exemplo.com/logo.png"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 ml-1">Cor de Destaque</label>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-12 w-20 p-1 bg-white border border-gray-200 rounded-xl cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-gray-900 font-mono font-medium uppercase">{primaryColor}</span>
              <span className="text-xs text-gray-500">Usada em botões e destaques</span>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSaveBranding}
            disabled={isSavingBranding}
            className={cn(
              "w-full bg-brand text-white py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-brand/20 font-medium",
              isSavingBranding ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4A4A30]"
            )}
          >
            {isSavingBranding ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            <span>{isSavingBranding ? 'Salvando...' : 'Salvar Configurações'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
