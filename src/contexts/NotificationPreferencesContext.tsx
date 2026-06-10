import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { NotificationPreferences } from '@/lib/notification-preferences';
import { defaultNotificationPreferences } from '@/lib/notification-preferences';
import { enhancedNotification } from '@/lib/enhanced-notification';

interface NotificationPreferencesContextType {
  preferences: NotificationPreferences;
  setPreferences: (preferences: NotificationPreferences) => void;
  loading: boolean;
}

const NotificationPreferencesContext = createContext<NotificationPreferencesContextType | undefined>(undefined);

export function NotificationPreferencesProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [loading, setLoading] = useState(true);

  // 从用户 profile 加载偏好设置
  useEffect(() => {
    if (profile?.custom_fields?.notification_preferences) {
      const userPrefs = profile.custom_fields.notification_preferences;
      setPreferencesState(userPrefs);
      enhancedNotification.setPreferences(userPrefs);
    } else {
      // 使用默认设置
      enhancedNotification.setPreferences(defaultNotificationPreferences);
    }
    setLoading(false);
  }, [profile]);

  const setPreferences = (newPreferences: NotificationPreferences) => {
    setPreferencesState(newPreferences);
    enhancedNotification.setPreferences(newPreferences);
  };

  return (
    <NotificationPreferencesContext.Provider value={{ preferences, setPreferences, loading }}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
}

export function useNotificationPreferences() {
  const context = useContext(NotificationPreferencesContext);
  if (context === undefined) {
    throw new Error('useNotificationPreferences must be used within a NotificationPreferencesProvider');
  }
  return context;
}
