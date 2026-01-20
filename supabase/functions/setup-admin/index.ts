import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // 使用服务角色密钥创建客户端，绕过RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, setupKey } = await req.json();

    // 简单的安全检查 - 确保只有知道设置密钥的人可以创建管理员
    // 这个密钥可以在首次使用后更改或禁用
    const expectedSetupKey = 'SRM_INITIAL_SETUP_2024';
    
    if (setupKey !== expectedSetupKey) {
      console.log('Invalid setup key provided');
      return new Response(
        JSON.stringify({ error: '无效的设置密钥' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: '请提供邮箱地址' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Setting up admin for email: ${email}`);

    // 查找用户
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(
        JSON.stringify({ error: '查找用户失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: '未找到该邮箱对应的用户，请先注册账号' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found user: ${user.id}`);

    // 检查是否已经有管理员角色
    const { data: existingRole, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleCheckError) {
      console.error('Error checking existing role:', roleCheckError);
    }

    if (existingRole) {
      return new Response(
        JSON.stringify({ message: '该用户已经是管理员', success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 插入管理员角色
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin'
      });

    if (insertError) {
      console.error('Error inserting admin role:', insertError);
      return new Response(
        JSON.stringify({ error: '分配管理员角色失败: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 更新用户档案
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: '系统管理员' })
      .eq('user_id', user.id);

    if (profileError) {
      console.log('Warning: Failed to update profile:', profileError);
    }

    console.log(`Successfully set up admin for user: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        message: '管理员账户设置成功！请刷新页面重新登录。', 
        success: true,
        userId: user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error:', errorMessage);
    return new Response(
      JSON.stringify({ error: '服务器错误: ' + errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
