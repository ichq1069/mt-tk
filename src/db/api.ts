import { supabase } from './supabase';
import { coreUserApi } from './core_user_api';
import { coreSystemApi } from './core_system_api';
import { mediaContentApi } from './media_content_api';
import { mediaSocialApi } from './media_social_api';
import { adsApi } from './ads_api';
import { analyticsApi } from './analytics_api';

export const api = {
  supabase,
  ...coreUserApi,
  ...coreSystemApi,
  ...mediaContentApi,
  ...mediaSocialApi,
  ...adsApi,
  ...analyticsApi,
} as any;
