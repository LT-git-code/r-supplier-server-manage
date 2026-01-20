import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export function useSupplierApi() {
  const callApi = useCallback(async (action: string, params: Record<string, unknown> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('supplier-api', {
      body: { action, ...params },
    });

    if (response.error) throw response.error;
    return response.data;
  }, []);

  return {
    // Dashboard
    getDashboardStats: () => callApi('get_dashboard_stats'),
    getAnnouncements: (limit = 5) => callApi('get_announcements', { limit }),
    getRecentProducts: (limit = 10) => callApi('get_recent_products', { limit }),
    getRecentAudits: (limit = 10) => callApi('get_recent_audits', { limit }),

    // Supplier Info
    getSupplierInfo: () => callApi('get_supplier_info'),
    updateSupplierInfo: (info: Record<string, unknown>) => callApi('update_supplier_info', { info }),

    // Contacts
    getContacts: () => callApi('get_contacts'),
    addContact: (contact: Record<string, unknown>) => callApi('add_contact', { contact }),
    updateContact: (id: string, contact: Record<string, unknown>) => callApi('update_contact', { id, contact }),
    deleteContact: (id: string) => callApi('delete_contact', { id }),

    // Products
    getProducts: (page = 1, pageSize = 10, search = '') => callApi('get_products', { page, pageSize, search }),
    getProduct: (id: string) => callApi('get_product', { id }),
    createProduct: (product: Record<string, unknown>) => callApi('create_product', { product }),
    updateProduct: (id: string, product: Record<string, unknown>) => callApi('update_product', { id, product }),
    deleteProduct: (id: string) => callApi('delete_product', { id }),
    getProductCategories: () => callApi('get_product_categories'),

    // Qualifications
    getQualifications: () => callApi('get_qualifications'),
    getQualification: (id: string) => callApi('get_qualification', { id }),
    createQualification: (qualification: Record<string, unknown>) => callApi('create_qualification', { qualification }),
    updateQualification: (id: string, qualification: Record<string, unknown>) => callApi('update_qualification', { id, qualification }),
    deleteQualification: (id: string) => callApi('delete_qualification', { id }),
    getQualificationTypes: () => callApi('get_qualification_types'),

    // Reports
    getReportTemplates: () => callApi('get_report_templates'),
    getReportSubmissions: () => callApi('get_report_submissions'),
    submitReport: (templateId: string, fileUrl: string) => callApi('submit_report', { templateId, fileUrl }),
  };
}
