import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const UserSettingsContext = createContext();

export function UserSettingsProvider({ userId, children }) {
  const [settings, setSettings] = useState({
    smartSuggestions: true,
    autoCategorization: true,
  });

  const fetchUserSettings = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) {
      setSettings({
        smartSuggestions: data.smart_suggestions,
        autoCategorization: data.auto_categorization,
      });
    }
  }, [userId]);

  useEffect(() => {
    fetchUserSettings();
  }, [fetchUserSettings]);

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        smart_suggestions: newSettings.smartSuggestions,
        auto_categorization: newSettings.autoCategorization,
      });
  };

  return (
    <UserSettingsContext.Provider value={{ settings, updateSetting, fetchUserSettings }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  return useContext(UserSettingsContext);
} 