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
    
    // 验证管理员权限
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: '无权限' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log('Supplier management action:', action, params);

    switch (action) {
      case 'list': {
        const { 
          search = '', 
          status = 'all', 
          type = 'all',
          page = 1, 
          pageSize = 20 
        } = params;
        
        let query = supabaseAdmin
          .from('suppliers')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        // 状态筛选
        if (status !== 'all') {
          query = query.eq('status', status);
        }

        // 类型筛选
        if (type !== 'all') {
          query = query.eq('supplier_type', type);
        }

        // 搜索 - 支持公司名称、联系人、统一社会信用代码
        if (search.trim()) {
          query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,unified_social_credit_code.ilike.%${search}%,contact_email.ilike.%${search}%,contact_phone.ilike.%${search}%`);
        }

        // 分页
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data: suppliers, error, count } = await query;

        if (error) throw error;

        // 获取 profiles
        const supplierUserIds = suppliers?.map(s => s.user_id).filter(Boolean) || [];
        let profilesMap: Record<string, any> = {};
        
        if (supplierUserIds.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('user_id, full_name, email, phone')
            .in('user_id', supplierUserIds);
          
          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.user_id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }

        const suppliersWithProfiles = suppliers?.map(s => ({
          ...s,
          profiles: profilesMap[s.user_id] || null
        })) || [];

        return new Response(
          JSON.stringify({ 
            suppliers: suppliersWithProfiles, 
            total: count || 0,
            page,
            pageSize
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_detail': {
        const { supplierId } = params;
        
        const { data: supplier, error } = await supabaseAdmin
          .from('suppliers')
          .select('*')
          .eq('id', supplierId)
          .single();

        if (error) throw error;

        // 获取 profile
        let profile = null;
        if (supplier?.user_id) {
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email, phone, avatar_url')
            .eq('user_id', supplier.user_id)
            .maybeSingle();
          profile = profileData;
        }

        // 获取联系人
        const { data: contacts } = await supabaseAdmin
          .from('supplier_contacts')
          .select('*')
          .eq('supplier_id', supplierId);

        // 获取资质
        const { data: qualifications } = await supabaseAdmin
          .from('qualifications')
          .select('*')
          .eq('supplier_id', supplierId);

        // 获取产品
        const { data: products } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('supplier_id', supplierId);

        // 获取关联的部门
        const { data: departments } = await supabaseAdmin
          .from('department_suppliers')
          .select(`
            id,
            department_id,
            library_type,
            created_at,
            departments (
              id,
              name,
              code
            )
          `)
          .eq('supplier_id', supplierId);

        return new Response(
          JSON.stringify({ 
            supplier: { ...supplier, profiles: profile }, 
            contacts: contacts || [], 
            qualifications: qualifications || [],
            products: products || [],
            departments: departments || []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { supplierId, data: updateData } = params;
        
        if (!supplierId || !updateData) {
          return new Response(
            JSON.stringify({ error: '缺少必要参数' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 不允许更新的字段
        const { id, user_id, created_at, ...safeData } = updateData;

        const { error: updateError } = await supabaseAdmin
          .from('suppliers')
          .update({
            ...safeData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', supplierId);

        if (updateError) throw updateError;

        // 记录操作日志
        await supabaseAdmin.from('operation_logs').insert({
          user_id: user.id,
          action: 'update_supplier',
          target_type: 'supplier',
          target_id: supplierId,
          new_data: safeData,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_status': {
        const { supplierId, status: newStatus, reason } = params;
        
        if (!supplierId || !newStatus) {
          return new Response(
            JSON.stringify({ error: '缺少必要参数' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const validStatuses = ['approved', 'suspended'];
        if (!validStatuses.includes(newStatus)) {
          return new Response(
            JSON.stringify({ error: '无效的状态' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updatePayload: any = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        if (newStatus === 'suspended') {
          updatePayload.rejection_reason = reason || '账户已被暂停';
        } else if (newStatus === 'approved') {
          updatePayload.rejection_reason = null;
        }

        const { error: updateError } = await supabaseAdmin
          .from('suppliers')
          .update(updatePayload)
          .eq('id', supplierId);

        if (updateError) throw updateError;

        // 记录操作日志
        await supabaseAdmin.from('operation_logs').insert({
          user_id: user.id,
          action: `${newStatus}_supplier`,
          target_type: 'supplier',
          target_id: supplierId,
          new_data: { status: newStatus, reason },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { supplierId } = params;
        
        if (!supplierId) {
          return new Response(
            JSON.stringify({ error: '缺少供应商ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 获取供应商信息用于记录
        const { data: supplier } = await supabaseAdmin
          .from('suppliers')
          .select('user_id, company_name, contact_name')
          .eq('id', supplierId)
          .single();

        // 删除相关数据
        await supabaseAdmin.from('department_suppliers').delete().eq('supplier_id', supplierId);
        await supabaseAdmin.from('supplier_contacts').delete().eq('supplier_id', supplierId);
        await supabaseAdmin.from('qualifications').delete().eq('supplier_id', supplierId);
        await supabaseAdmin.from('products').delete().eq('supplier_id', supplierId);
        
        // 删除供应商
        const { error: deleteError } = await supabaseAdmin
          .from('suppliers')
          .delete()
          .eq('id', supplierId);

        if (deleteError) throw deleteError;

        // 删除用户的供应商角色
        if (supplier?.user_id) {
          await supabaseAdmin
            .from('user_roles')
            .delete()
            .eq('user_id', supplier.user_id)
            .eq('role', 'supplier');
        }

        // 记录操作日志
        await supabaseAdmin.from('operation_logs').insert({
          user_id: user.id,
          action: 'delete_supplier',
          target_type: 'supplier',
          target_id: supplierId,
          old_data: supplier,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_statistics': {
        // 获取供应商统计数据
        const { data: suppliers } = await supabaseAdmin
          .from('suppliers')
          .select('id, status, supplier_type');

        const stats = {
          total: suppliers?.length || 0,
          approved: suppliers?.filter(s => s.status === 'approved').length || 0,
          pending: suppliers?.filter(s => s.status === 'pending').length || 0,
          suspended: suppliers?.filter(s => s.status === 'suspended').length || 0,
          rejected: suppliers?.filter(s => s.status === 'rejected').length || 0,
          byType: {
            enterprise: suppliers?.filter(s => s.supplier_type === 'enterprise').length || 0,
            overseas: suppliers?.filter(s => s.supplier_type === 'overseas').length || 0,
            individual: suppliers?.filter(s => s.supplier_type === 'individual').length || 0,
          }
        };

        return new Response(
          JSON.stringify(stats),
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
    console.error('Supplier management API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
