import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export function useAdminDashboardApi() {
  const getDashboardStats = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('admin-dashboard');

    if (response.error) throw response.error;
    return response.data;
  }, []);

  const getAnnouncements = useCallback(async (limit = 5) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('admin-api', {
      body: { action: 'get_announcements', limit },
    });

    if (response.error) throw response.error;
    return response.data;
  }, []);

  const getRecentAudits = useCallback(async (limit = 5) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('admin-api', {
      body: { action: 'get_recent_audits', limit },
    });

    if (response.error) throw response.error;
    return response.data;
  }, []);

  return {
    getDashboardStats,
    getAnnouncements,
    getRecentAudits,
  };
}
