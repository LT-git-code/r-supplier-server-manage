export type AppRole = 'supplier' | 'department' | 'admin';

export type SupplierType = 'enterprise' | 'overseas' | 'individual';

export type SupplierStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
  roles: AppRole[];
  currentRole: AppRole | null;
  isSupplier: boolean;
  isDepartment: boolean;
  isAdmin: boolean;
}

export interface Supplier {
  id: string;
  user_id: string;
  supplier_type: SupplierType;
  status: SupplierStatus;
  company_name: string | null;
  unified_social_credit_code: string | null;
  legal_representative: string | null;
  registered_capital: number | null;
  establishment_date: string | null;
  business_scope: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  province: string | null;
  city: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  id_card_number: string | null;
  id_card_front_url: string | null;
  id_card_back_url: string | null;
  business_license_url: string | null;
  country: string | null;
  registration_number: string | null;
  production_capacity: string | null;
  main_products: string | null;
  annual_revenue: number | null;
  employee_count: number | null;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
