import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '未授权' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '认证失败' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 验证用户是部门用户
    const { data: deptRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'department')
      .maybeSingle();

    if (!deptRole) {
      return new Response(
        JSON.stringify({ error: '无权限执行此操作' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取用户所属部门（仅用于插入记录时的外键）
    const { data: userDepts } = await supabaseAdmin
      .from('user_departments')
      .select('department_id')
      .eq('user_id', user.id);

    const primaryDeptId = userDepts?.[0]?.department_id;

    const { action, ...params } = await req.json();
    console.log('Dept API action:', action, params);

    switch (action) {
      case 'get_dept_suppliers': {
        // 获取所有已批准的供应商
        const { data: allSuppliers, error: suppliersError } = await supabaseAdmin
          .from('suppliers')
          .select('id, company_name, supplier_type, contact_name, contact_phone, status, main_products')
          .eq('status', 'approved')
          .order('company_name');

        if (suppliersError) throw suppliersError;

        // 获取全局启用状态（任意部门启用即视为启用）
        const { data: allDeptSuppliers } = await supabaseAdmin
          .from('department_suppliers')
          .select('supplier_id, library_type')
          .eq('library_type', 'current');

        const enabledSupplierIds = new Set(allDeptSuppliers?.map(ds => ds.supplier_id) || []);

        // 合并供应商数据与启用状态
        const suppliers = allSuppliers?.map(s => ({
          ...s,
          library_type: enabledSupplierIds.has(s.id) ? 'current' : 'disabled',
        })) || [];

        return new Response(
          JSON.stringify({ suppliers }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enable_supplier': {
        const { supplierId } = params;
        
        if (!primaryDeptId) {
          return new Response(
            JSON.stringify({ error: '用户未分配部门' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 检查是否已存在任何部门的记录
        const { data: existing } = await supabaseAdmin
          .from('department_suppliers')
          .select('id, department_id')
          .eq('supplier_id', supplierId)
          .limit(1)
          .maybeSingle();

        if (existing) {
          // 更新现有记录为启用
          const { error } = await supabaseAdmin
            .from('department_suppliers')
            .update({ library_type: 'current' })
            .eq('supplier_id', supplierId);
          if (error) throw error;
        } else {
          // 创建新记录
          const { error } = await supabaseAdmin
            .from('department_suppliers')
            .insert({
              department_id: primaryDeptId,
              supplier_id: supplierId,
              added_by: user.id,
              library_type: 'current',
            });
          if (error) throw error;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disable_supplier': {
        const { supplierId } = params;

        // 更新所有该供应商的记录为停用
        const { error } = await supabaseAdmin
          .from('department_suppliers')
          .update({ library_type: 'disabled' })
          .eq('supplier_id', supplierId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_dept_products': {
        // 获取全局启用的供应商ID列表
        const { data: enabledSuppliers } = await supabaseAdmin
          .from('department_suppliers')
          .select('supplier_id')
          .eq('library_type', 'current');
        
        const supplierIds = enabledSuppliers?.map(s => s.supplier_id) || [];
        
        if (supplierIds.length === 0) {
          return new Response(
            JSON.stringify({ products: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: products, error } = await supabaseAdmin
          .from('products')
          .select(`
            *,
            supplier:suppliers(id, company_name, supplier_type, contact_name, contact_phone, contact_email, address, main_products)
          `)
          .in('supplier_id', supplierIds)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        return new Response(
          JSON.stringify({ products }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_supplier_detail': {
        const { supplierId } = params;
        
        const { data: supplier, error: supplierError } = await supabaseAdmin
          .from('suppliers')
          .select('*')
          .eq('id', supplierId)
          .single();

        if (supplierError) throw supplierError;

        const { data: products } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('supplier_id', supplierId)
          .eq('is_active', true)
          .order('name');

        const { data: qualifications } = await supabaseAdmin
          .from('qualifications')
          .select('*')
          .eq('supplier_id', supplierId)
          .order('name');

        return new Response(
          JSON.stringify({ 
            supplier, 
            products: products || [], 
            qualifications: qualifications || [] 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: '未知操作' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dept API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
