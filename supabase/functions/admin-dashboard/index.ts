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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // 检查是否为管理员
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

    // 获取统计数据
    console.log('Fetching dashboard statistics...');

    // 1. 供应商统计
    const { data: suppliers } = await supabaseAdmin
      .from('suppliers')
      .select('id, status, supplier_type, province, created_at');

    const supplierStats = {
      total: suppliers?.length || 0,
      pending: suppliers?.filter(s => s.status === 'pending').length || 0,
      approved: suppliers?.filter(s => s.status === 'approved').length || 0,
      rejected: suppliers?.filter(s => s.status === 'rejected').length || 0,
      suspended: suppliers?.filter(s => s.status === 'suspended').length || 0,
    };

    const supplierTypeStats = {
      enterprise: suppliers?.filter(s => s.supplier_type === 'enterprise').length || 0,
      overseas: suppliers?.filter(s => s.supplier_type === 'overseas').length || 0,
      individual: suppliers?.filter(s => s.supplier_type === 'individual').length || 0,
    };

    // 2. 地域分布
    const provinceMap: Record<string, number> = {};
    suppliers?.forEach(s => {
      if (s.province) {
        provinceMap[s.province] = (provinceMap[s.province] || 0) + 1;
      }
    });
    const provinceDistribution = Object.entries(provinceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // 3. 用户统计
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const { data: userRoles } = await supabaseAdmin.from('user_roles').select('role');

    const userStats = {
      total: authUsers?.users?.length || 0,
      admins: userRoles?.filter(r => r.role === 'admin').length || 0,
      departments: userRoles?.filter(r => r.role === 'department').length || 0,
      suppliers: userRoles?.filter(r => r.role === 'supplier').length || 0,
    };

    // 4. 产品统计
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, status, is_active');

    const productStats = {
      total: products?.length || 0,
      active: products?.filter(p => p.is_active && p.status === 'active').length || 0,
      suspended: products?.filter(p => p.status === 'suspended').length || 0,
    };

    // 5. 资质统计
    const { data: qualifications } = await supabaseAdmin
      .from('qualifications')
      .select('id, status, expire_date');

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const qualificationStats = {
      total: qualifications?.length || 0,
      pending: qualifications?.filter(q => q.status === 'pending').length || 0,
      approved: qualifications?.filter(q => q.status === 'approved').length || 0,
      expiringSoon: qualifications?.filter(q => 
        q.expire_date && q.expire_date >= today && q.expire_date <= thirtyDaysLater
      ).length || 0,
      expired: qualifications?.filter(q => 
        q.expire_date && q.expire_date < today
      ).length || 0,
    };

    // 6. 部门统计
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('id, is_active');

    const departmentStats = {
      total: departments?.length || 0,
      active: departments?.filter(d => d.is_active).length || 0,
    };

    // 7. 月度趋势（最近6个月新增供应商）
    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      
      const count = suppliers?.filter(s => {
        const createdDate = new Date(s.created_at);
        return createdDate.getFullYear() === year && createdDate.getMonth() + 1 === month;
      }).length || 0;

      monthlyTrend.push({
        month: `${month}月`,
        count,
      });
    }

    // 8. 待办事项
    const pendingTasks = {
      supplierAudit: supplierStats.pending,
      qualificationAudit: qualificationStats.pending,
      expiringQualifications: qualificationStats.expiringSoon,
    };

    const dashboardData = {
      supplierStats,
      supplierTypeStats,
      provinceDistribution,
      userStats,
      productStats,
      qualificationStats,
      departmentStats,
      monthlyTrend,
      pendingTasks,
    };

    console.log('Dashboard data fetched successfully');

    return new Response(
      JSON.stringify(dashboardData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dashboard API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
