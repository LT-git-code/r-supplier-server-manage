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
    
    // 验证调用者是管理员
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

    // 使用服务角色检查是否为管理员
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      return new Response(
        JSON.stringify({ error: '无权限执行此操作' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log('Admin action:', action, params);

    switch (action) {
      case 'list_users': {
        // 获取所有用户
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        // 获取所有profiles
        const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
        
        // 获取所有角色
        const { data: roles } = await supabaseAdmin.from('user_roles').select('*');
        
        // 获取所有部门关联
        const { data: userDepts } = await supabaseAdmin.from('user_departments').select('*, departments(name)');

        // 组合数据
        const users = authUsers.users.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          profile: profiles?.find(p => p.user_id === u.id) || null,
          roles: roles?.filter(r => r.user_id === u.id).map(r => r.role) || [],
          departments: userDepts?.filter(d => d.user_id === u.id).map(d => ({
            id: d.department_id,
            name: d.departments?.name,
            is_manager: d.is_manager
          })) || []
        }));

        return new Response(
          JSON.stringify({ users }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_user': {
        const { email, password, fullName, roles: newRoles, departmentId } = params;
        
        // 创建用户
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 更新profile
        if (fullName) {
          await supabaseAdmin
            .from('profiles')
            .update({ full_name: fullName })
            .eq('user_id', newUser.user.id);
        }

        // 分配角色
        if (newRoles && newRoles.length > 0) {
          const roleInserts = newRoles.map((role: string) => ({
            user_id: newUser.user.id,
            role
          }));
          await supabaseAdmin.from('user_roles').insert(roleInserts);
        }

        // 分配部门
        if (departmentId) {
          await supabaseAdmin.from('user_departments').insert({
            user_id: newUser.user.id,
            department_id: departmentId
          });
        }

        return new Response(
          JSON.stringify({ success: true, userId: newUser.user.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_user_roles': {
        const { userId, roles: targetRoles } = params;
        
        // 删除现有角色
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // 添加新角色
        if (targetRoles && targetRoles.length > 0) {
          const roleInserts = targetRoles.map((role: string) => ({
            user_id: userId,
            role
          }));
          await supabaseAdmin.from('user_roles').insert(roleInserts);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_user': {
        const { userId, fullName, roles: targetRoles, departmentId } = params;
        
        // 更新profile
        if (fullName !== undefined) {
          await supabaseAdmin
            .from('profiles')
            .update({ full_name: fullName })
            .eq('user_id', userId);
        }

        // 更新角色
        if (targetRoles !== undefined) {
          await supabaseAdmin
            .from('user_roles')
            .delete()
            .eq('user_id', userId);

          if (targetRoles && targetRoles.length > 0) {
            const roleInserts = targetRoles.map((role: string) => ({
              user_id: userId,
              role
            }));
            await supabaseAdmin.from('user_roles').insert(roleInserts);
          }
        }

        // 更新部门
        if (departmentId !== undefined) {
          await supabaseAdmin
            .from('user_departments')
            .delete()
            .eq('user_id', userId);

          if (departmentId) {
            await supabaseAdmin.from('user_departments').insert({
              user_id: userId,
              department_id: departmentId
            });
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_user_roles': {
        const { userId, roles: targetRoles } = params;
        
        // 删除现有角色
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // 添加新角色
        if (targetRoles && targetRoles.length > 0) {
          const roleInserts = targetRoles.map((role: string) => ({
            user_id: userId,
            role
          }));
          await supabaseAdmin.from('user_roles').insert(roleInserts);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_user_department': {
        const { userId, departmentId, isManager } = params;
        
        // 删除现有部门关联
        await supabaseAdmin
          .from('user_departments')
          .delete()
          .eq('user_id', userId);

        // 添加新部门关联
        if (departmentId) {
          await supabaseAdmin.from('user_departments').insert({
            user_id: userId,
            department_id: departmentId,
            is_manager: isManager || false
          });
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_user': {
        const { userId } = params;
        
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_departments': {
        const { data: departments, error } = await supabaseAdmin
          .from('departments')
          .select('*')
          .order('name');

        if (error) throw error;

        return new Response(
          JSON.stringify({ departments }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_department': {
        const { name, code, description } = params;
        
        const { data, error } = await supabaseAdmin
          .from('departments')
          .insert({ name, code, description })
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, department: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_products': {
        const { status } = params;
        
        // 获取审核通过供应商的产品
        let query = supabaseAdmin
          .from('products')
          .select(`
            *,
            suppliers!inner (
              id,
              company_name,
              contact_name,
              supplier_type,
              status
            ),
            product_categories (
              id,
              name
            )
          `)
          .eq('suppliers.status', 'approved')
          .order('created_at', { ascending: false });

        if (status) {
          query = query.eq('status', status);
        }

        const { data: products, error } = await query;
        if (error) throw error;

        // 格式化数据
        const formattedProducts = products?.map(p => ({
          ...p,
          supplier: p.suppliers,
          category: p.product_categories,
          suppliers: undefined,
          product_categories: undefined,
        })) || [];

        return new Response(
          JSON.stringify({ products: formattedProducts }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_product_status': {
        const { productId, status: newStatus } = params;
        
        const { error: updateError } = await supabaseAdmin
          .from('products')
          .update({ status: newStatus })
          .eq('id', productId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_qualifications': {
        const { status } = params;
        
        let query = supabaseAdmin
          .from('qualifications')
          .select(`
            *,
            suppliers (
              id,
              company_name,
              contact_name,
              supplier_type
            ),
            qualification_types (
              id,
              name,
              code
            )
          `)
          .order('created_at', { ascending: false });

        if (status) {
          query = query.eq('status', status);
        }

        const { data: qualifications, error } = await query;
        if (error) throw error;

        // 格式化数据
        const formattedQualifications = qualifications?.map(q => ({
          ...q,
          supplier: q.suppliers,
          qualification_type: q.qualification_types,
          suppliers: undefined,
          qualification_types: undefined,
        })) || [];

        return new Response(
          JSON.stringify({ qualifications: formattedQualifications }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'approve_qualification': {
        const { qualificationId } = params;
        
        const { error: updateError } = await supabaseAdmin
          .from('qualifications')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            rejection_reason: null,
          })
          .eq('id', qualificationId);

        if (updateError) throw updateError;

        // 记录审核日志
        await supabaseAdmin.from('audit_records').insert({
          audit_type: 'qualification',
          target_id: qualificationId,
          target_table: 'qualifications',
          status: 'approved',
          submitted_by: null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reject_qualification': {
        const { qualificationId, reason } = params;
        
        if (!reason) {
          return new Response(
            JSON.stringify({ error: '请填写驳回原因' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from('qualifications')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            rejection_reason: reason,
          })
          .eq('id', qualificationId);

        if (updateError) throw updateError;

        // 记录审核日志
        await supabaseAdmin.from('audit_records').insert({
          audit_type: 'qualification',
          target_id: qualificationId,
          target_table: 'qualifications',
          status: 'rejected',
          submitted_by: null,
          reviewed_by: user.id,
          review_comment: reason,
          reviewed_at: new Date().toISOString(),
        });

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
    console.error('Admin API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
