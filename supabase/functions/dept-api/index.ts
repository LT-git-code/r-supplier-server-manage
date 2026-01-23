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

    let primaryDeptId = userDepts?.[0]?.department_id;
    
    // 如果用户未分配部门，使用系统中的第一个部门作为默认
    if (!primaryDeptId) {
      const { data: defaultDept } = await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      primaryDeptId = defaultDept?.id;
    }

    const { action, ...params } = await req.json();
    console.log('Dept API action:', action, params);

    switch (action) {
      case 'get_dashboard_stats': {
        // 获取工作台统计数据
        const [enabledRes, allSuppliersRes, productsRes] = await Promise.all([
          supabaseAdmin
            .from('department_suppliers')
            .select('supplier_id, library_type')
            .eq('library_type', 'current'),
          supabaseAdmin
            .from('suppliers')
            .select('id', { count: 'exact' })
            .eq('status', 'approved'),
          supabaseAdmin
            .from('products')
            .select('id', { count: 'exact' })
            .eq('is_active', true),
        ]);

        const enabledSupplierIds = new Set(enabledRes.data?.map(ds => ds.supplier_id) || []);
        const enabledCount = enabledSupplierIds.size;
        const totalApproved = allSuppliersRes.count || 0;
        const availableCount = totalApproved - enabledCount;
        const productCount = productsRes.count || 0;

        return new Response(
          JSON.stringify({
            enabledSuppliers: enabledCount,
            availableSuppliers: availableCount > 0 ? availableCount : 0,
            totalProducts: productCount,
            totalApprovedSuppliers: totalApproved,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_announcements': {
        const { limit = 5 } = params;
        const { data, error } = await supabaseAdmin
          .from('announcements')
          .select('id, title, content, published_at, created_at')
          .eq('is_published', true)
          .or('target_roles.is.null,target_roles.cs.{department}')
          .order('published_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_recent_enabled_suppliers': {
        const { limit = 5 } = params;
        const { data: recentEnabled, error } = await supabaseAdmin
          .from('department_suppliers')
          .select(`
            id,
            created_at,
            supplier:suppliers(id, company_name, supplier_type, main_products)
          `)
          .eq('library_type', 'current')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return new Response(
          JSON.stringify(recentEnabled),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
            JSON.stringify({ error: '系统中无可用部门' }),
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

      case 'get_projects': {
        const { data: projects, error } = await supabaseAdmin
          .from('projects')
          .select(`
            *,
            department:departments(id, name),
            project_suppliers(
              id,
              contract_amount,
              supplier:suppliers(id, company_name, supplier_type)
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(
          JSON.stringify({ projects: projects || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_project': {
        const { name, code, description, status, start_date, end_date, budget, supplier_ids } = params;
        
        const { data: project, error: projectError } = await supabaseAdmin
          .from('projects')
          .insert({
            name,
            code,
            description,
            status: status || 'active',
            start_date,
            end_date,
            budget,
            department_id: primaryDeptId,
            created_by: user.id,
          })
          .select()
          .single();

        if (projectError) throw projectError;

        // 添加供应商关联
        if (supplier_ids && supplier_ids.length > 0) {
          const projectSuppliers = supplier_ids.map((sid: string) => ({
            project_id: project.id,
            supplier_id: sid,
          }));
          await supabaseAdmin.from('project_suppliers').insert(projectSuppliers);
        }

        return new Response(
          JSON.stringify({ success: true, project }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_project': {
        const { projectId, ...updateData } = params;
        const { supplier_ids, ...projectData } = updateData;

        const { error } = await supabaseAdmin
          .from('projects')
          .update(projectData)
          .eq('id', projectId);

        if (error) throw error;

        // 更新供应商关联
        if (supplier_ids !== undefined) {
          await supabaseAdmin.from('project_suppliers').delete().eq('project_id', projectId);
          if (supplier_ids.length > 0) {
            const projectSuppliers = supplier_ids.map((sid: string) => ({
              project_id: projectId,
              supplier_id: sid,
            }));
            await supabaseAdmin.from('project_suppliers').insert(projectSuppliers);
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_project': {
        const { projectId } = params;
        const { error } = await supabaseAdmin.from('projects').delete().eq('id', projectId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_services': {
        // 获取启用供应商的服务
        const { data: enabledSuppliers } = await supabaseAdmin
          .from('department_suppliers')
          .select('supplier_id')
          .eq('library_type', 'current');
        
        const supplierIds = enabledSuppliers?.map(s => s.supplier_id) || [];
        
        if (supplierIds.length === 0) {
          return new Response(
            JSON.stringify({ services: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: services, error } = await supabaseAdmin
          .from('services')
          .select(`
            *,
            supplier:suppliers(id, company_name, supplier_type, contact_name, contact_phone)
          `)
          .in('supplier_id', supplierIds)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        return new Response(
          JSON.stringify({ services: services || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_enabled_suppliers': {
        // 获取启用的供应商列表（用于项目选择）
        const { data: enabledSuppliers } = await supabaseAdmin
          .from('department_suppliers')
          .select('supplier_id')
          .eq('library_type', 'current');
        
        const supplierIds = enabledSuppliers?.map(s => s.supplier_id) || [];
        
        if (supplierIds.length === 0) {
          return new Response(
            JSON.stringify({ suppliers: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: suppliers, error } = await supabaseAdmin
          .from('suppliers')
          .select('id, company_name, supplier_type')
          .in('id', supplierIds)
          .order('company_name');

        if (error) throw error;
        return new Response(
          JSON.stringify({ suppliers: suppliers || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'import_suppliers': {
        const { suppliers } = params;
        
        if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
          return new Response(
            JSON.stringify({ error: '无效的供应商数据' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!primaryDeptId) {
          return new Response(
            JSON.stringify({ error: '系统中无可用部门' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const successList: Array<{
          company_name: string;
          supplier_type: string;
          contact_name: string;
          contact_phone: string;
          buyer_name: string;
          cooperation_tag: string;
        }> = [];
        const failedList: Array<{
          row: number;
          company_name: string;
          reason: string;
          data: Record<string, string>;
        }> = [];

        // 供应商类型映射
        const typeMapping: Record<string, string> = {
          '国内公司': 'enterprise',
          '海外公司': 'overseas',
          '个人': 'individual',
        };

        // 合作标签映射到数据库字段
        const tagMapping: Record<string, { is_recommended: boolean; is_blacklisted: boolean }> = {
          '推荐供应商': { is_recommended: true, is_blacklisted: false },
          '良好供应商': { is_recommended: false, is_blacklisted: false },
          '异议供应商': { is_recommended: false, is_blacklisted: false },
          '拉黑供应商': { is_recommended: false, is_blacklisted: true },
        };

        for (let i = 0; i < suppliers.length; i++) {
          const row = i + 2; // 行号从2开始（跳过表头）
          const s = suppliers[i];
          
          try {
            // 验证必填字段
            if (!s.company_name || !s.company_name.trim()) {
              failedList.push({
                row,
                company_name: s.company_name || '',
                reason: '供应商名称不能为空',
                data: s,
              });
              continue;
            }

            // 验证供应商类型
            const supplierType = typeMapping[s.supplier_type];
            if (!supplierType) {
              failedList.push({
                row,
                company_name: s.company_name,
                reason: `无效的供应商类别: ${s.supplier_type}，应为 国内公司/海外公司/个人`,
                data: s,
              });
              continue;
            }

            // 验证合作标签（可选）
            let tagData = { is_recommended: false, is_blacklisted: false };
            if (s.cooperation_tag && s.cooperation_tag.trim()) {
              const mappedTag = tagMapping[s.cooperation_tag];
              if (!mappedTag) {
                failedList.push({
                  row,
                  company_name: s.company_name,
                  reason: `无效的合作标签: ${s.cooperation_tag}，应为 推荐供应商/良好供应商/异议供应商/拉黑供应商`,
                  data: s,
                });
                continue;
              }
              tagData = mappedTag;
            }

            // 检查是否已存在同名供应商
            const { data: existingSupplier } = await supabaseAdmin
              .from('suppliers')
              .select('id')
              .eq('company_name', s.company_name.trim())
              .maybeSingle();

            if (existingSupplier) {
              failedList.push({
                row,
                company_name: s.company_name,
                reason: '供应商名称已存在',
                data: s,
              });
              continue;
            }

            // ============================================
            // 预留第三方接口校验位置
            // TODO: 调用企查查或天眼查API验证公司真实性
            // const verificationResult = await verifyCompany(s.company_name, s.supplier_type);
            // if (!verificationResult.valid) {
            //   failedList.push({
            //     row,
            //     company_name: s.company_name,
            //     reason: `第三方验证失败: ${verificationResult.message}`,
            //     data: s,
            //   });
            //   continue;
            // }
            // ============================================

            // 创建供应商记录（状态直接设为已批准，因为是部门导入）
            const { data: newSupplier, error: insertError } = await supabaseAdmin
              .from('suppliers')
              .insert({
                company_name: s.company_name.trim(),
                supplier_type: supplierType,
                contact_name: s.contact_name?.trim() || null,
                contact_phone: s.contact_phone?.trim() || null,
                user_id: user.id, // 关联到当前用户
                status: 'approved',
                is_recommended: tagData.is_recommended,
                is_blacklisted: tagData.is_blacklisted,
                recommended_by: tagData.is_recommended ? user.id : null,
                recommended_at: tagData.is_recommended ? new Date().toISOString() : null,
                blacklisted_by: tagData.is_blacklisted ? user.id : null,
                blacklisted_at: tagData.is_blacklisted ? new Date().toISOString() : null,
                blacklist_reason: tagData.is_blacklisted ? '批量导入标记' : null,
              })
              .select('id')
              .single();

            if (insertError) {
              console.error('Insert supplier error:', insertError);
              failedList.push({
                row,
                company_name: s.company_name,
                reason: `数据库错误: ${insertError.message}`,
                data: s,
              });
              continue;
            }

            // 创建部门-供应商关联（默认启用）
            const libraryType = tagData.is_blacklisted ? 'disabled' : 'current';
            await supabaseAdmin
              .from('department_suppliers')
              .insert({
                department_id: primaryDeptId,
                supplier_id: newSupplier.id,
                added_by: user.id,
                library_type: libraryType,
                reason: `批量导入 - 采购员: ${s.buyer_name || '未指定'}`,
              });

            successList.push({
              company_name: s.company_name,
              supplier_type: supplierType,
              contact_name: s.contact_name || '',
              contact_phone: s.contact_phone || '',
              buyer_name: s.buyer_name || '',
              cooperation_tag: s.cooperation_tag || '',
            });

          } catch (err) {
            console.error('Process supplier error:', err);
            failedList.push({
              row,
              company_name: s.company_name || '',
              reason: '处理异常',
              data: s,
            });
          }
        }

        return new Response(
          JSON.stringify({
            success: successList,
            failed: failedList,
            total: suppliers.length,
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
