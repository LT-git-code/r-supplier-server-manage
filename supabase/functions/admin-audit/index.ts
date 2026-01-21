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
    console.log('Audit action:', action, params);

    switch (action) {
      case 'list_pending': {
        const { status = 'pending' } = params;
        
        let query = supabaseAdmin
          .from('suppliers')
          .select('*')
          .order('created_at', { ascending: false });

        if (status !== 'all') {
          query = query.eq('status', status);
        }

        const { data: suppliers, error } = await query;

        if (error) throw error;

        // Fetch profiles for each supplier
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

        // Attach profile data to suppliers
        const suppliersWithProfiles = suppliers?.map(s => ({
          ...s,
          profiles: profilesMap[s.user_id] || null
        })) || [];

        return new Response(
          JSON.stringify({ suppliers: suppliersWithProfiles }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_supplier_detail': {
        const { supplierId } = params;
        
        const { data: supplier, error } = await supabaseAdmin
          .from('suppliers')
          .select('*')
          .eq('id', supplierId)
          .single();

        if (error) throw error;

        // Fetch profile separately
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

        return new Response(
          JSON.stringify({ 
            supplier: { ...supplier, profiles: profile }, 
            contacts: contacts || [], 
            qualifications: qualifications || [],
            products: products || []
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'approve': {
        const { supplierId } = params;
        
        // 获取供应商信息
        const { data: supplier } = await supabaseAdmin
          .from('suppliers')
          .select('user_id')
          .eq('id', supplierId)
          .single();

        if (!supplier) {
          return new Response(
            JSON.stringify({ error: '供应商不存在' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 更新供应商状态
        const { error: updateError } = await supabaseAdmin
          .from('suppliers')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            rejection_reason: null,
          })
          .eq('id', supplierId);

        if (updateError) throw updateError;

        // 给用户分配供应商角色
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', supplier.user_id)
          .eq('role', 'supplier')
          .maybeSingle();

        if (!existingRole) {
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: supplier.user_id, role: 'supplier' });
        }

        // 分配供应商终端的所有菜单权限
        try {
          // 创建或获取供应商默认角色
          let supplierRoleId: string | null = null;
          
          const { data: existingSupplierRole } = await supabaseAdmin
            .from('backend_roles')
            .select('id')
            .eq('code', 'supplier_default')
            .maybeSingle();

          if (existingSupplierRole) {
            supplierRoleId = existingSupplierRole.id;
          } else {
            // 创建默认供应商角色
            const { data: newRole, error: roleError } = await supabaseAdmin
              .from('backend_roles')
              .insert({
                code: 'supplier_default',
                name: '供应商默认角色',
                description: '供应商审核通过后的默认角色，拥有所有供应商终端权限',
                is_active: true,
              })
              .select('id')
              .single();

            if (roleError) throw roleError;
            supplierRoleId = newRole.id;

            // 获取所有供应商终端菜单
            const { data: supplierMenus } = await supabaseAdmin
              .from('menu_permissions')
              .select('id')
              .eq('terminal', 'supplier')
              .eq('is_active', true);

            // 为供应商默认角色分配所有菜单权限
            if (supplierMenus && supplierMenus.length > 0) {
              const roleMenus = supplierMenus.map(m => ({
                role_id: supplierRoleId!,
                menu_id: m.id,
              }));
              await supabaseAdmin.from('role_menu_permissions').insert(roleMenus);
            }
          }

          // 将用户分配到供应商默认角色
          if (supplierRoleId) {
            const { data: existingUserRole } = await supabaseAdmin
              .from('user_backend_roles')
              .select('id')
              .eq('user_id', supplier.user_id)
              .eq('role_id', supplierRoleId)
              .maybeSingle();

            if (!existingUserRole) {
              await supabaseAdmin
                .from('user_backend_roles')
                .insert({ user_id: supplier.user_id, role_id: supplierRoleId });
            }
          }
          
          console.log('Assigned supplier default permissions to user:', supplier.user_id);
        } catch (permError) {
          console.error('Error assigning supplier permissions:', permError);
        }

        // 记录审核日志
        await supabaseAdmin.from('audit_records').insert({
          audit_type: 'registration',
          target_id: supplierId,
          target_table: 'suppliers',
          status: 'approved',
          submitted_by: supplier.user_id,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reject': {
        const { supplierId, reason } = params;
        
        if (!reason) {
          return new Response(
            JSON.stringify({ error: '请填写驳回原因' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: supplier } = await supabaseAdmin
          .from('suppliers')
          .select('user_id')
          .eq('id', supplierId)
          .single();

        const { error: updateError } = await supabaseAdmin
          .from('suppliers')
          .update({
            status: 'rejected',
            rejection_reason: reason,
          })
          .eq('id', supplierId);

        if (updateError) throw updateError;

        // 记录审核日志
        await supabaseAdmin.from('audit_records').insert({
          audit_type: 'registration',
          target_id: supplierId,
          target_table: 'suppliers',
          status: 'rejected',
          submitted_by: supplier?.user_id,
          reviewed_by: user.id,
          review_comment: reason,
          reviewed_at: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suspend': {
        const { supplierId, reason } = params;

        const { error: updateError } = await supabaseAdmin
          .from('suppliers')
          .update({
            status: 'suspended',
            rejection_reason: reason || '账户已被暂停',
          })
          .eq('id', supplierId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'restore': {
        const { supplierId } = params;

        const { error: updateError } = await supabaseAdmin
          .from('suppliers')
          .update({
            status: 'approved',
            rejection_reason: null,
          })
          .eq('id', supplierId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
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
    console.error('Audit API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
