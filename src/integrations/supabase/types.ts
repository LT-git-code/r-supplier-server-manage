export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_records: {
        Row: {
          audit_type: Database["public"]["Enums"]["audit_type"]
          created_at: string
          id: string
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_by: string | null
          target_id: string
          target_table: string
        }
        Insert: {
          audit_type: Database["public"]["Enums"]["audit_type"]
          created_at?: string
          id?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_by?: string | null
          target_id: string
          target_table: string
        }
        Update: {
          audit_type?: Database["public"]["Enums"]["audit_type"]
          created_at?: string
          id?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_by?: string | null
          target_id?: string
          target_table?: string
        }
        Relationships: []
      }
      backend_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string | null
          subject: string
          submitted_by: string | null
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string | null
          subject: string
          submitted_by?: string | null
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string | null
          subject?: string
          submitted_by?: string | null
        }
        Relationships: []
      }
      department_suppliers: {
        Row: {
          added_by: string | null
          created_at: string
          department_id: string
          id: string
          library_type: string | null
          reason: string | null
          supplier_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          department_id: string
          id?: string
          library_type?: string | null
          reason?: string | null
          supplier_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          department_id?: string
          id?: string
          library_type?: string | null
          reason?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_suppliers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_permissions: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          menu_key: string
          menu_name: string
          menu_path: string
          parent_key: string | null
          sort_order: number | null
          terminal: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          menu_key: string
          menu_name: string
          menu_path: string
          parent_key?: string | null
          sort_order?: number | null
          terminal: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          menu_key?: string
          menu_name?: string
          menu_path?: string
          parent_key?: string | null
          sort_order?: number | null
          terminal?: string
        }
        Relationships: []
      }
      operation_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          lead_time_days: number | null
          min_order_quantity: number | null
          name: string
          price: number | null
          specifications: string | null
          status: string | null
          supplier_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          name: string
          price?: number | null
          specifications?: string | null
          status?: string | null
          supplier_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          name?: string
          price?: number | null
          specifications?: string | null
          status?: string | null
          supplier_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      qualification_types: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
        }
        Relationships: []
      }
      qualifications: {
        Row: {
          certificate_number: string | null
          created_at: string
          expire_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          name: string
          qualification_type_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["audit_status"] | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          certificate_number?: string | null
          created_at?: string
          expire_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          name: string
          qualification_type_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["audit_status"] | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          certificate_number?: string | null
          created_at?: string
          expire_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          name?: string
          qualification_type_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["audit_status"] | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_qualification_type_id_fkey"
            columns: ["qualification_type_id"]
            isOneToOne: false
            referencedRelation: "qualification_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_submissions: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          supplier_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_submissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          name: string
          target_roles: Database["public"]["Enums"]["app_role"][] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
        }
        Relationships: []
      }
      role_menu_permissions: {
        Row: {
          created_at: string
          id: string
          menu_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_menu_permissions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_menu_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "backend_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          position: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          position?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          position?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          annual_revenue: number | null
          approved_at: string | null
          approved_by: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_name: string | null
          business_license_url: string | null
          business_scope: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          employee_count: number | null
          establishment_date: string | null
          id: string
          id_card_back_url: string | null
          id_card_front_url: string | null
          id_card_number: string | null
          legal_representative: string | null
          main_products: string | null
          production_capacity: string | null
          province: string | null
          registered_capital: number | null
          registration_number: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["supplier_status"]
          supplier_type: Database["public"]["Enums"]["supplier_type"]
          unified_social_credit_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          annual_revenue?: number | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          business_license_url?: string | null
          business_scope?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          employee_count?: number | null
          establishment_date?: string | null
          id?: string
          id_card_back_url?: string | null
          id_card_front_url?: string | null
          id_card_number?: string | null
          legal_representative?: string | null
          main_products?: string | null
          production_capacity?: string | null
          province?: string | null
          registered_capital?: number | null
          registration_number?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_type: Database["public"]["Enums"]["supplier_type"]
          unified_social_credit_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          annual_revenue?: number | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          business_license_url?: string | null
          business_scope?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          employee_count?: number | null
          establishment_date?: string | null
          id?: string
          id_card_back_url?: string | null
          id_card_front_url?: string | null
          id_card_number?: string | null
          legal_representative?: string | null
          main_products?: string | null
          production_capacity?: string | null
          province?: string | null
          registered_capital?: number | null
          registration_number?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_type?: Database["public"]["Enums"]["supplier_type"]
          unified_social_credit_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_backend_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_backend_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "backend_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_departments: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_manager: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_manager?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_manager?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_department_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_menus: {
        Args: { _terminal: string; _user_id: string }
        Returns: {
          icon: string
          menu_key: string
          menu_name: string
          menu_path: string
          parent_key: string
          sort_order: number
        }[]
      }
      get_user_supplier_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_department_user: { Args: { _user_id: string }; Returns: boolean }
      is_supplier: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "supplier" | "department" | "admin"
      audit_status: "pending" | "approved" | "rejected"
      audit_type: "registration" | "qualification" | "product" | "info_change"
      supplier_status: "pending" | "approved" | "rejected" | "suspended"
      supplier_type: "enterprise" | "overseas" | "individual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["supplier", "department", "admin"],
      audit_status: ["pending", "approved", "rejected"],
      audit_type: ["registration", "qualification", "product", "info_change"],
      supplier_status: ["pending", "approved", "rejected", "suspended"],
      supplier_type: ["enterprise", "overseas", "individual"],
    },
  },
} as const
