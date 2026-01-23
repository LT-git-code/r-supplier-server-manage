import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 存储验证码（实际生产环境应使用 Redis 等）
const verificationCodes = new Map<string, { code: string; expiresAt: number; type: 'email' | 'phone' }>();

// 生成6位数字验证码
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 验证手机号格式
function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log('Auth API action:', action, 'params:', JSON.stringify(params));

    switch (action) {
      // ========== 手机验证码登录 ==========
      case 'send_login_phone_code': {
        const { phone } = params;
        if (!phone || !isValidPhone(phone)) {
          return new Response(
            JSON.stringify({ error: '请输入有效的手机号' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 查找该手机号对应的用户
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .maybeSingle();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: '该手机号未注册' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 检查是否是供应商
        const { data: supplierRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.user_id)
          .eq('role', 'supplier')
          .maybeSingle();

        if (!supplierRole) {
          return new Response(
            JSON.stringify({ error: '手机验证码登录仅限供应商使用' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const code = generateCode();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10分钟有效期
        verificationCodes.set(`login_phone_${phone}`, { code, expiresAt, type: 'phone' });

        // 实际生产环境应该通过短信服务发送验证码
        console.log(`Login phone verification code for ${phone}: ${code}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '验证码已发送',
            // 开发环境返回验证码
            code: code
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'phone_login': {
        const { phone, code } = params;
        if (!phone || !code) {
          return new Response(
            JSON.stringify({ error: '请提供手机号和验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证验证码
        const stored = verificationCodes.get(`login_phone_${phone}`);
        if (!stored) {
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期，请重新获取' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (Date.now() > stored.expiresAt) {
          verificationCodes.delete(`login_phone_${phone}`);
          return new Response(
            JSON.stringify({ error: '验证码已过期，请重新获取' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (stored.code !== code) {
          return new Response(
            JSON.stringify({ error: '验证码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证成功，获取用户信息
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .single();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: '用户不存在' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 获取用户邮箱
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        if (!user || !user.email) {
          return new Response(
            JSON.stringify({ error: '无法获取用户信息' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 生成一个临时密码用于登录
        const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // 更新用户密码为临时密码
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          profile.user_id,
          { password: tempPassword }
        );

        if (updateError) {
          console.error('Update password error:', updateError);
          return new Response(
            JSON.stringify({ error: '登录失败，请稍后重试' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 删除验证码
        verificationCodes.delete(`login_phone_${phone}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            email: user.email,
            tempPassword
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ========== 找回密码 - 发送验证码 ==========
      case 'send_reset_phone_code': {
        const { phone } = params;
        if (!phone || !isValidPhone(phone)) {
          return new Response(
            JSON.stringify({ error: '请输入有效的手机号' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 查找该手机号对应的用户
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .maybeSingle();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: '该手机号未注册' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const code = generateCode();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        verificationCodes.set(`reset_phone_${phone}`, { code, expiresAt, type: 'phone' });

        console.log(`Reset password phone code for ${phone}: ${code}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '验证码已发送',
            code: code
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_reset_email_code': {
        const { email } = params;
        if (!email || !isValidEmail(email)) {
          return new Response(
            JSON.stringify({ error: '请输入有效的邮箱地址' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 查找该邮箱对应的用户
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);

        if (!user) {
          return new Response(
            JSON.stringify({ error: '该邮箱未注册' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const code = generateCode();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        verificationCodes.set(`reset_email_${email}`, { code, expiresAt, type: 'email' });

        console.log(`Reset password email code for ${email}: ${code}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '验证码已发送',
            code: code
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ========== 找回密码 - 验证并重置 ==========
      case 'reset_password_by_phone': {
        const { phone, code, newPassword } = params;
        if (!phone || !code || !newPassword) {
          return new Response(
            JSON.stringify({ error: '请提供完整信息' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (newPassword.length < 6) {
          return new Response(
            JSON.stringify({ error: '密码至少需要6个字符' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证验证码
        const stored = verificationCodes.get(`reset_phone_${phone}`);
        if (!stored || Date.now() > stored.expiresAt) {
          verificationCodes.delete(`reset_phone_${phone}`);
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (stored.code !== code) {
          return new Response(
            JSON.stringify({ error: '验证码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 获取用户ID
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .single();

        if (!profile) {
          return new Response(
            JSON.stringify({ error: '用户不存在' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 更新密码
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          profile.user_id,
          { password: newPassword }
        );

        if (updateError) throw updateError;

        verificationCodes.delete(`reset_phone_${phone}`);

        return new Response(
          JSON.stringify({ success: true, message: '密码重置成功' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset_password_by_email': {
        const { email, code, newPassword } = params;
        if (!email || !code || !newPassword) {
          return new Response(
            JSON.stringify({ error: '请提供完整信息' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (newPassword.length < 6) {
          return new Response(
            JSON.stringify({ error: '密码至少需要6个字符' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证验证码
        const stored = verificationCodes.get(`reset_email_${email}`);
        if (!stored || Date.now() > stored.expiresAt) {
          verificationCodes.delete(`reset_email_${email}`);
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (stored.code !== code) {
          return new Response(
            JSON.stringify({ error: '验证码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 获取用户
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);

        if (!user) {
          return new Response(
            JSON.stringify({ error: '用户不存在' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 更新密码
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password: newPassword }
        );

        if (updateError) throw updateError;

        verificationCodes.delete(`reset_email_${email}`);

        return new Response(
          JSON.stringify({ success: true, message: '密码重置成功' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ========== 手机验证码注册（供应商专用）==========
      case 'send_register_phone_code': {
        const { phone } = params;
        if (!phone || !isValidPhone(phone)) {
          return new Response(
            JSON.stringify({ error: '请输入有效的手机号' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 检查手机号是否已被注册
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .maybeSingle();

        if (existingProfile) {
          return new Response(
            JSON.stringify({ error: '该手机号已被注册' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const code = generateCode();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        verificationCodes.set(`register_phone_${phone}`, { code, expiresAt, type: 'phone' });

        console.log(`Register phone verification code for ${phone}: ${code}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '验证码已发送',
            code: code
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'phone_register': {
        const { phone, code, password } = params;
        if (!phone || !code || !password) {
          return new Response(
            JSON.stringify({ error: '请提供完整信息' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (password.length < 6) {
          return new Response(
            JSON.stringify({ error: '密码至少需要6个字符' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证验证码
        const stored = verificationCodes.get(`register_phone_${phone}`);
        if (!stored) {
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期，请重新获取' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (Date.now() > stored.expiresAt) {
          verificationCodes.delete(`register_phone_${phone}`);
          return new Response(
            JSON.stringify({ error: '验证码已过期，请重新获取' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (stored.code !== code) {
          return new Response(
            JSON.stringify({ error: '验证码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 再次检查手机号是否已被注册
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .maybeSingle();

        if (existingProfile) {
          verificationCodes.delete(`register_phone_${phone}`);
          return new Response(
            JSON.stringify({ error: '该手机号已被注册' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 生成一个临时邮箱用于注册（Supabase要求邮箱）
        const tempEmail = `${phone}@phone.supplier.local`;

        // 创建用户
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: tempEmail,
          password: password,
          email_confirm: true, // 自动确认邮箱
        });

        if (createError) {
          console.error('Create user error:', createError);
          return new Response(
            JSON.stringify({ error: '注册失败，请稍后重试' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 更新 profile 中的手机号
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ phone: phone })
          .eq('user_id', newUser.user.id);

        if (profileError) {
          console.error('Update profile error:', profileError);
        }

        // 分配供应商角色
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUser.user.id, role: 'supplier' });

        if (roleError) {
          console.error('Assign role error:', roleError);
        }

        // 删除验证码
        verificationCodes.delete(`register_phone_${phone}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '注册成功',
            email: tempEmail,
            password: password
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
    console.error('Auth API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
