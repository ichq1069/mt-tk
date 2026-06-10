import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  permissions: string[];
  isAdmin: boolean;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null, data?: any }>;
  signUpWithUsername: (username: string, password: string, customData?: any, inviteCode?: string, email?: string, referrerId?: string) => Promise<{ error: Error | null, data?: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  openLoginDialog: (initialTab?: 'login' | 'register') => void;
  closeLoginDialog: () => void;
  isLoginDialogOpen: boolean;
  loginDialogTab: 'login' | 'register';
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
