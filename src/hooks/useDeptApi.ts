import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export function useDeptApi() {
  const callApi = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('dept-api', {
      body: { action, ...params },
    });

    if (response.error) throw response.error;
    return response.data;
  }, []);

  return {
    // Dashboard
    getDashboardStats: () => callApi('get_dashboard_stats'),
    getAnnouncements: (limit = 5) => callApi('get_announcements', { limit }),
    getRecentEnabledSuppliers: (limit = 5) => callApi('get_recent_enabled_suppliers', { limit }),

    // Suppliers
    getSuppliers: () => callApi('get_dept_suppliers'),
    enableSupplier: (supplierId: string) => callApi('enable_supplier', { supplierId }),
    disableSupplier: (supplierId: string) => callApi('disable_supplier', { supplierId }),
    getSupplierDetail: (supplierId: string) => callApi('get_supplier_detail', { supplierId }),

    // Products
    getProducts: () => callApi('get_dept_products'),
  };
}
