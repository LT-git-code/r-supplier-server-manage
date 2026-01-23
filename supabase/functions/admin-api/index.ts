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

      case 'get_announcements': {
        const { limit = 5 } = params;
        const { data, error } = await supabaseAdmin
          .from('announcements')
          .select('id, title, content, published_at, created_at')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list_announcements': {
        const { data, error } = await supabaseAdmin
          .from('announcements')
          .select('id, title, content, target_roles, is_published, published_at, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_announcement': {
        const { title, content, target_roles } = params;
        const { data, error } = await supabaseAdmin
          .from('announcements')
          .insert({
            title,
            content,
            target_roles,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, announcement: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_announcement': {
        const { id, title, content, target_roles } = params;
        const { data, error } = await supabaseAdmin
          .from('announcements')
          .update({
            title,
            content,
            target_roles,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, announcement: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle_announcement_publish': {
        const { id, is_published } = params;
        const updateData: Record<string, unknown> = {
          is_published,
          updated_at: new Date().toISOString(),
        };
        
        if (is_published) {
          updateData.published_at = new Date().toISOString();
        }

        const { data, error } = await supabaseAdmin
          .from('announcements')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, announcement: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_announcement': {
        const { id } = params;
        const { error } = await supabaseAdmin
          .from('announcements')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_recent_audits': {
        const { limit = 5 } = params;
        const { data, error } = await supabaseAdmin
          .from('audit_records')
          .select(`
            id,
            audit_type,
            target_table,
            status,
            review_comment,
            created_at,
            reviewed_at
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ========== 项目管理 ==========
      case 'get_projects': {
        const { data: projects, error } = await supabaseAdmin
          .from('projects')
          .select(`
            *,
            departments (id, name),
            project_suppliers (
              id,
              contract_amount,
              suppliers (id, company_name, supplier_type)
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedProjects = projects?.map(p => ({
          ...p,
          department: p.departments,
          project_suppliers: p.project_suppliers?.map((ps: any) => ({
            id: ps.id,
            contract_amount: ps.contract_amount,
            supplier: ps.suppliers,
          })) || [],
          departments: undefined,
        })) || [];

        return new Response(
          JSON.stringify({ projects: formattedProjects }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_approved_suppliers': {
        const { data: suppliers, error } = await supabaseAdmin
          .from('suppliers')
          .select('id, company_name, supplier_type')
          .eq('status', 'approved')
          .eq('is_blacklisted', false)
          .order('company_name');

        if (error) throw error;

        return new Response(
          JSON.stringify({ suppliers: suppliers || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_project': {
        const { name, code, description, status: projectStatus, start_date, end_date, budget, department_id, supplier_ids } = params;

        const { data: project, error: createError } = await supabaseAdmin
          .from('projects')
          .insert({
            name,
            code,
            description,
            status: projectStatus || 'active',
            start_date,
            end_date,
            budget,
            department_id,
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) throw createError;

        // 关联供应商
        if (supplier_ids && supplier_ids.length > 0) {
          const supplierInserts = supplier_ids.map((supplierId: string) => ({
            project_id: project.id,
            supplier_id: supplierId,
          }));
          await supabaseAdmin.from('project_suppliers').insert(supplierInserts);
        }

        return new Response(
          JSON.stringify({ success: true, project }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_project': {
        const { projectId, name, code, description, status: projectStatus, start_date, end_date, budget, department_id, supplier_ids } = params;

        const { error: updateError } = await supabaseAdmin
          .from('projects')
          .update({
            name,
            code,
            description,
            status: projectStatus,
            start_date,
            end_date,
            budget,
            department_id,
          })
          .eq('id', projectId);

        if (updateError) throw updateError;

        // 更新供应商关联
        if (supplier_ids !== undefined) {
          await supabaseAdmin
            .from('project_suppliers')
            .delete()
            .eq('project_id', projectId);

          if (supplier_ids.length > 0) {
            const supplierInserts = supplier_ids.map((supplierId: string) => ({
              project_id: projectId,
              supplier_id: supplierId,
            }));
            await supabaseAdmin.from('project_suppliers').insert(supplierInserts);
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_project': {
        const { projectId } = params;

        // 先删除关联
        await supabaseAdmin
          .from('project_suppliers')
          .delete()
          .eq('project_id', projectId);

        const { error: deleteError } = await supabaseAdmin
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ========== 服务管理 ==========
      case 'get_services': {
        const { data: services, error } = await supabaseAdmin
          .from('services')
          .select(`
            *,
            suppliers (
              id,
              company_name,
              supplier_type,
              contact_name,
              contact_phone,
              status
            )
          `)
          .eq('suppliers.status', 'approved')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedServices = services?.map(s => ({
          ...s,
          supplier: s.suppliers,
          suppliers: undefined,
        })) || [];

        return new Response(
          JSON.stringify({ services: formattedServices }),
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
          .select('id, name, code, unit, price, specifications')
          .eq('supplier_id', supplierId)
          .eq('is_active', true);

        const { data: qualifications } = await supabaseAdmin
          .from('qualifications')
          .select('id, name, certificate_number, issuing_authority, expire_date, status')
          .eq('supplier_id', supplierId);

        return new Response(
          JSON.stringify({
            supplier,
            products: products || [],
            qualifications: qualifications || [],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_service_status': {
        const { serviceId, isActive } = params;

        const { error: updateError } = await supabaseAdmin
          .from('services')
          .update({ is_active: isActive })
          .eq('id', serviceId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ========== 报表管理 ==========
      case 'get_report_statistics': {
        // 获取报表统计数据
        const { data: templates } = await supabaseAdmin
          .from('report_templates')
          .select('id, name, is_active, created_at');

        const { data: submissions } = await supabaseAdmin
          .from('report_submissions')
          .select('id, status, template_id, submitted_at, reviewed_at');

        const { data: suppliers } = await supabaseAdmin
          .from('suppliers')
          .select('id')
          .eq('status', 'approved');

        const templateCount = templates?.length || 0;
        const activeTemplateCount = templates?.filter(t => t.is_active).length || 0;
        const submissionCount = submissions?.length || 0;
        const pendingCount = submissions?.filter(s => s.status === 'pending').length || 0;
        const approvedCount = submissions?.filter(s => s.status === 'approved').length || 0;
        const rejectedCount = submissions?.filter(s => s.status === 'rejected').length || 0;
        const supplierCount = suppliers?.length || 0;

        // 计算提交率
        const submissionRate = supplierCount > 0 && templateCount > 0 
          ? Math.round((submissionCount / (supplierCount * activeTemplateCount)) * 100) 
          : 0;

        // 按模板统计提交情况
        const templateStats = templates?.map(t => {
          const templateSubmissions = submissions?.filter(s => s.template_id === t.id) || [];
          return {
            id: t.id,
            name: t.name,
            total: templateSubmissions.length,
            pending: templateSubmissions.filter(s => s.status === 'pending').length,
            approved: templateSubmissions.filter(s => s.status === 'approved').length,
            rejected: templateSubmissions.filter(s => s.status === 'rejected').length,
          };
        }) || [];

        // 月度趋势
        const now = new Date();
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthSubmissions = submissions?.filter(s => {
            if (!s.submitted_at) return false;
            const submitDate = new Date(s.submitted_at);
            return submitDate.getFullYear() === date.getFullYear() && 
                   submitDate.getMonth() === date.getMonth();
          }) || [];
          monthlyTrend.push({
            month: monthKey,
            submissions: monthSubmissions.length,
            approved: monthSubmissions.filter(s => s.status === 'approved').length,
          });
        }

        return new Response(
          JSON.stringify({
            templateCount,
            activeTemplateCount,
            submissionCount,
            pendingCount,
            approvedCount,
            rejectedCount,
            supplierCount,
            submissionRate,
            templateStats,
            monthlyTrend,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_report_templates': {
        const { data: templates, error } = await supabaseAdmin
          .from('report_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ templates: templates || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_report_template': {
        const { name, description, file_url, deadline, target_roles, supplier_selection_type, target_supplier_ids } = params;

        const { data: template, error } = await supabaseAdmin
          .from('report_templates')
          .insert({
            name,
            description,
            file_url,
            deadline,
            target_roles: target_roles || ['supplier'],
            supplier_selection_type: supplier_selection_type || 'all',
            target_supplier_ids: target_supplier_ids || null,
            is_active: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, template }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_report_template': {
        const { templateId, name, description, file_url, deadline, target_roles, supplier_selection_type, target_supplier_ids, is_active } = params;

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (file_url !== undefined) updateData.file_url = file_url;
        if (deadline !== undefined) updateData.deadline = deadline;
        if (target_roles !== undefined) updateData.target_roles = target_roles;
        if (supplier_selection_type !== undefined) updateData.supplier_selection_type = supplier_selection_type;
        if (target_supplier_ids !== undefined) updateData.target_supplier_ids = target_supplier_ids;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { error } = await supabaseAdmin
          .from('report_templates')
          .update(updateData)
          .eq('id', templateId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_report_template': {
        const { templateId } = params;

        // 先删除相关提交记录
        await supabaseAdmin
          .from('report_submissions')
          .delete()
          .eq('template_id', templateId);

        const { error } = await supabaseAdmin
          .from('report_templates')
          .delete()
          .eq('id', templateId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_report_submissions': {
        const { templateId, status: submissionStatus } = params;

        let query = supabaseAdmin
          .from('report_submissions')
          .select(`
            *,
            report_templates (id, name, deadline),
            suppliers:supplier_id (id, company_name, supplier_type, contact_name)
          `)
          .order('created_at', { ascending: false });

        if (templateId) {
          query = query.eq('template_id', templateId);
        }
        if (submissionStatus) {
          query = query.eq('status', submissionStatus);
        }

        const { data: submissions, error } = await query;
        if (error) throw error;

        const formattedSubmissions = submissions?.map(s => ({
          ...s,
          template: s.report_templates,
          supplier: s.suppliers,
          report_templates: undefined,
          suppliers: undefined,
        })) || [];

        return new Response(
          JSON.stringify({ submissions: formattedSubmissions }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'review_report_submission': {
        const { submissionId, status: reviewStatus, review_comment } = params;

        const { error } = await supabaseAdmin
          .from('report_submissions')
          .update({
            status: reviewStatus,
            review_comment,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', submissionId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_all_approved_suppliers': {
        // 获取所有审核通过的供应商（用于Excel导入匹配）
        const { data: suppliers, error } = await supabaseAdmin
          .from('suppliers')
          .select('id, company_name, unified_social_credit_code, supplier_type, contact_name, contact_phone')
          .eq('status', 'approved')
          .eq('is_blacklisted', false)
          .order('company_name');

        if (error) throw error;

        return new Response(
          JSON.stringify({ suppliers: suppliers || [] }),
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
