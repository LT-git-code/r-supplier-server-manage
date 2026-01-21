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

    const results = {
      departments: [] as any[],
      departmentUsers: [] as any[],
      supplierUsers: [] as any[],
      products: [] as any[],
      qualifications: [] as any[],
    };

    // 1. 创建3个部门
    const departmentData = [
      { name: '采购部', code: 'DEPT-CG', description: '负责公司物资采购和供应商管理' },
      { name: '技术部', code: 'DEPT-JS', description: '负责技术产品审核和技术服务管理' },
      { name: '财务部', code: 'DEPT-CW', description: '负责财务结算和供应商账务管理' },
    ];

    const { data: departments, error: deptError } = await supabaseAdmin
      .from('departments')
      .insert(departmentData)
      .select();
    
    if (deptError) {
      console.error('创建部门失败:', deptError);
    } else {
      results.departments = departments || [];
    }

    // 2. 创建3个部门用户账号
    const deptUserData = [
      { email: 'caigou@test.com', password: 'Test123456', fullName: '张采购', deptIndex: 0 },
      { email: 'jishu@test.com', password: 'Test123456', fullName: '李技术', deptIndex: 1 },
      { email: 'caiwu@test.com', password: 'Test123456', fullName: '王财务', deptIndex: 2 },
    ];

    for (const userData of deptUserData) {
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
        });

        if (createError) {
          console.error('创建部门用户失败:', createError);
          continue;
        }

        // 更新profile
        await supabaseAdmin
          .from('profiles')
          .update({ full_name: userData.fullName })
          .eq('user_id', newUser.user.id);

        // 分配department角色
        await supabaseAdmin.from('user_roles').insert({
          user_id: newUser.user.id,
          role: 'department'
        });

        // 关联部门
        if (results.departments[userData.deptIndex]) {
          await supabaseAdmin.from('user_departments').insert({
            user_id: newUser.user.id,
            department_id: results.departments[userData.deptIndex].id,
            is_manager: true
          });
        }

        results.departmentUsers.push({
          email: userData.email,
          password: userData.password,
          fullName: userData.fullName,
          department: departmentData[userData.deptIndex]?.name
        });
      } catch (e) {
        console.error('创建部门用户异常:', e);
      }
    }

    // 3. 创建5个供应商用户账号
    const supplierData = [
      { 
        email: 'supplier1@test.com', 
        password: 'Test123456', 
        fullName: '赵供应商', 
        supplierType: 'enterprise',
        companyName: '北京华创科技有限公司',
        creditCode: '91110105MA00FAKE001',
        legalRep: '赵伟',
        capital: 1000,
        contactName: '赵经理',
        contactPhone: '13800138001',
        address: '北京市朝阳区建国路88号',
        province: '北京市',
        city: '朝阳区',
        mainProducts: '办公设备、电子产品、IT耗材',
        bankName: '中国工商银行北京分行',
        bankAccount: '1234567890123456789',
      },
      { 
        email: 'supplier2@test.com', 
        password: 'Test123456', 
        fullName: '钱供应商', 
        supplierType: 'enterprise',
        companyName: '上海智联软件股份有限公司',
        creditCode: '91310115MA00FAKE002',
        legalRep: '钱强',
        capital: 5000,
        contactName: '钱总',
        contactPhone: '13800138002',
        address: '上海市浦东新区张江高科技园区',
        province: '上海市',
        city: '浦东新区',
        mainProducts: '企业软件、系统集成、云服务',
        bankName: '招商银行上海分行',
        bankAccount: '2345678901234567890',
      },
      { 
        email: 'supplier3@test.com', 
        password: 'Test123456', 
        fullName: '孙供应商', 
        supplierType: 'enterprise',
        companyName: '深圳创新电子科技有限公司',
        creditCode: '91440300MA00FAKE003',
        legalRep: '孙明',
        capital: 800,
        contactName: '孙经理',
        contactPhone: '13800138003',
        address: '深圳市南山区科技园南区',
        province: '广东省',
        city: '深圳市',
        mainProducts: '智能硬件、物联网设备、传感器',
        bankName: '中国建设银行深圳分行',
        bankAccount: '3456789012345678901',
      },
      { 
        email: 'supplier4@test.com', 
        password: 'Test123456', 
        fullName: '李个体', 
        supplierType: 'individual',
        companyName: '李明办公用品店',
        contactName: '李明',
        contactPhone: '13800138004',
        address: '杭州市西湖区文三路199号',
        province: '浙江省',
        city: '杭州市',
        mainProducts: '办公用品、文具、打印耗材',
        idCardNumber: '330102199001011234',
      },
      { 
        email: 'supplier5@test.com', 
        password: 'Test123456', 
        fullName: 'John Smith', 
        supplierType: 'overseas',
        companyName: 'Global Tech Solutions Inc.',
        registrationNumber: 'US-2024-001234',
        contactName: 'John Smith',
        contactPhone: '+1-555-123-4567',
        address: '123 Innovation Drive, Silicon Valley, CA 94025',
        country: 'United States',
        mainProducts: 'Cloud Services, AI Solutions, Data Analytics',
      },
    ];

    // 获取产品类别
    const { data: categories } = await supabaseAdmin
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .limit(5);

    // 获取资质类型
    const { data: qualTypes } = await supabaseAdmin
      .from('qualification_types')
      .select('id, name')
      .eq('is_active', true)
      .limit(5);

    for (let i = 0; i < supplierData.length; i++) {
      const data = supplierData[i];
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
        });

        if (createError) {
          console.error('创建供应商用户失败:', createError);
          continue;
        }

        // 更新profile
        await supabaseAdmin
          .from('profiles')
          .update({ full_name: data.fullName, phone: data.contactPhone })
          .eq('user_id', newUser.user.id);

        // 分配supplier角色
        await supabaseAdmin.from('user_roles').insert({
          user_id: newUser.user.id,
          role: 'supplier'
        });

        // 创建供应商记录 - 设置不同的审核状态
        const statuses = ['approved', 'approved', 'pending', 'approved', 'pending'];
        const { data: supplier, error: supplierError } = await supabaseAdmin
          .from('suppliers')
          .insert({
            user_id: newUser.user.id,
            supplier_type: data.supplierType,
            status: statuses[i],
            company_name: data.companyName,
            unified_social_credit_code: data.creditCode,
            legal_representative: data.legalRep,
            registered_capital: data.capital,
            registration_number: data.registrationNumber,
            contact_name: data.contactName,
            contact_phone: data.contactPhone,
            contact_email: data.email,
            address: data.address,
            province: data.province,
            city: data.city,
            country: data.country,
            main_products: data.mainProducts,
            bank_name: data.bankName,
            bank_account: data.bankAccount,
            id_card_number: data.idCardNumber,
            employee_count: data.supplierType === 'enterprise' ? Math.floor(Math.random() * 500) + 50 : null,
            annual_revenue: data.supplierType === 'enterprise' ? Math.floor(Math.random() * 10000) + 1000 : null,
          })
          .select()
          .single();

        if (supplierError) {
          console.error('创建供应商记录失败:', supplierError);
        }

        results.supplierUsers.push({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          companyName: data.companyName,
          supplierType: data.supplierType,
          status: statuses[i]
        });

        // 为已批准的供应商创建产品
        if (supplier && statuses[i] === 'approved') {
          const productNames = [
            ['HP激光打印机', 'Dell商用笔记本', '联想ThinkPad电脑'],
            ['企业ERP系统', '云存储服务', 'AI客服解决方案'],
            ['智能温控器', '工业传感器套件', '物联网网关'],
            ['A4复印纸', '中性笔套装', '文件夹'],
          ];

          const supplierProducts = productNames[Math.min(i, 3)];
          for (let j = 0; j < supplierProducts.length; j++) {
            const { data: product, error: prodError } = await supabaseAdmin
              .from('products')
              .insert({
                supplier_id: supplier.id,
                name: supplierProducts[j],
                code: `PROD-${i + 1}-${j + 1}`,
                description: `${data.companyName}提供的${supplierProducts[j]}`,
                price: Math.floor(Math.random() * 10000) + 100,
                unit: j === 0 ? '台' : j === 1 ? '套' : '个',
                category_id: categories?.[j % (categories?.length || 1)]?.id,
                status: 'active',
                min_order_quantity: Math.floor(Math.random() * 10) + 1,
                lead_time_days: Math.floor(Math.random() * 14) + 3,
              })
              .select()
              .single();

            if (!prodError && product) {
              results.products.push(product);
            }
          }

          // 创建资质记录
          if (qualTypes && qualTypes.length > 0) {
            const qualStatuses = ['approved', 'pending', 'approved'];
            for (let k = 0; k < Math.min(2, qualTypes.length); k++) {
              const { data: qual, error: qualError } = await supabaseAdmin
                .from('qualifications')
                .insert({
                  supplier_id: supplier.id,
                  name: qualTypes[k].name,
                  qualification_type_id: qualTypes[k].id,
                  certificate_number: `CERT-${Date.now()}-${i}-${k}`,
                  issuing_authority: '国家认证认可监督管理委员会',
                  issue_date: '2023-01-15',
                  expire_date: '2026-01-14',
                  status: qualStatuses[k % 3],
                })
                .select()
                .single();

              if (!qualError && qual) {
                results.qualifications.push(qual);
              }
            }
          }

          // 关联供应商到部门
          if (results.departments.length > 0) {
            const deptIndex = i % results.departments.length;
            await supabaseAdmin.from('department_suppliers').insert({
              department_id: results.departments[deptIndex].id,
              supplier_id: supplier.id,
              library_type: i % 2 === 0 ? 'current' : 'potential',
              added_by: user.id,
            });
          }
        }
      } catch (e) {
        console.error('创建供应商用户异常:', e);
      }
    }

    // 4. 创建一些公告
    await supabaseAdmin.from('announcements').insert([
      {
        title: '关于供应商年度评审的通知',
        content: '各供应商注意：2024年度供应商评审工作将于本月底启动，请各供应商提前准备好相关资质文件和业绩证明材料。',
        is_published: true,
        published_at: new Date().toISOString(),
        target_roles: ['supplier'],
        created_by: user.id,
      },
      {
        title: '系统维护公告',
        content: '系统将于本周六凌晨2:00-6:00进行维护升级，届时系统将暂停服务，请各用户提前做好工作安排。',
        is_published: true,
        published_at: new Date().toISOString(),
        target_roles: ['supplier', 'department', 'admin'],
        created_by: user.id,
      },
      {
        title: '新增供应商入库流程优化说明',
        content: '为提高供应商入库效率，现对入库审核流程进行优化：1. 简化资料提交要求；2. 缩短审核周期；3. 增加在线沟通渠道。',
        is_published: true,
        published_at: new Date().toISOString(),
        target_roles: ['department', 'admin'],
        created_by: user.id,
      },
    ]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '测试数据创建成功',
        summary: {
          departments: results.departments.length,
          departmentUsers: results.departmentUsers.length,
          supplierUsers: results.supplierUsers.length,
          products: results.products.length,
          qualifications: results.qualifications.length,
        },
        accounts: {
          departmentUsers: results.departmentUsers,
          supplierUsers: results.supplierUsers,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
