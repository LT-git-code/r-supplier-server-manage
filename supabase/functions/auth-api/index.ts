import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// 保存验证码到数据库
async function saveVerificationCode(
  supabaseAdmin: any,
  type: string,
  phone?: string,
  email?: string
): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分钟有效期

  // 先删除该手机号/邮箱相同类型的旧验证码
  if (phone) {
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('phone', phone)
      .eq('type', type);
  }
  if (email) {
    await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', type);
  }

  // 插入新验证码
  const { error } = await supabaseAdmin
    .from('verification_codes')
    .insert({
      phone: phone || null,
      email: email || null,
      code,
      type,
      expires_at: expiresAt,
      used: false,
    });

  if (error) {
    console.error('Save verification code error:', error);
    throw new Error('保存验证码失败');
  }

  return code;
}

// 验证验证码
async function verifyCode(
  supabaseAdmin: any,
  type: string,
  code: string,
  phone?: string,
  email?: string
): Promise<boolean> {
  let query = supabaseAdmin
    .from('verification_codes')
    .select('*')
    .eq('type', type)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString());

  if (phone) {
    query = query.eq('phone', phone);
  }
  if (email) {
    query = query.eq('email', email);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return false;
  }

  // 标记为已使用
  await supabaseAdmin
    .from('verification_codes')
    .update({ used: true })
    .eq('id', data.id);

  return true;
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

        const code = await saveVerificationCode(supabaseAdmin, 'login_phone', phone);
        console.log(`Login phone verification code for ${phone}: ${code}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '验证码已发送',
            code: code // 开发环境返回验证码
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
        const isValid = await verifyCode(supabaseAdmin, 'login_phone', code, phone);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期，请重新获取' }),
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

        const code = await saveVerificationCode(supabaseAdmin, 'reset_phone', phone);
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

        const code = await saveVerificationCode(supabaseAdmin, 'reset_email', undefined, email);
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
        const isValid = await verifyCode(supabaseAdmin, 'reset_phone', code, phone);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期' }),
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
        const isValid = await verifyCode(supabaseAdmin, 'reset_email', code, undefined, email);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期' }),
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

        const code = await saveVerificationCode(supabaseAdmin, 'register_phone', phone);
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
        const isValid = await verifyCode(supabaseAdmin, 'register_phone', code, phone);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期，请重新获取' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 生成临时邮箱
        const tempEmail = `${phone}@phone.supplier.local`;

        // 检查该临时邮箱是否已存在于auth系统中
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = existingUsers?.users?.find(u => u.email === tempEmail);

        if (existingAuthUser) {
          // 用户已存在，检查是否有供应商角色
          const { data: existingRole } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', existingAuthUser.id)
            .eq('role', 'supplier')
            .maybeSingle();

          if (existingRole) {
            return new Response(
              JSON.stringify({ error: '该手机号已被注册，请直接登录' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // 用户存在但没有供应商角色，可能是之前注册失败的情况
          // 更新密码并添加角色
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingAuthUser.id,
            { password: password }
          );

          if (updateError) {
            console.error('Update user error:', updateError);
            return new Response(
              JSON.stringify({ error: '注册失败，请稍后重试' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // 确保profile中有手机号
          await supabaseAdmin
            .from('profiles')
            .update({ phone: phone })
            .eq('user_id', existingAuthUser.id);

          // 添加供应商角色
          await supabaseAdmin
            .from('user_roles')
            .upsert({
              user_id: existingAuthUser.id,
              role: 'supplier'
            }, { onConflict: 'user_id,role' });

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

        // 再次检查手机号是否已被注册（profiles表）
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('phone', phone)
          .maybeSingle();

        if (existingProfile) {
          return new Response(
            JSON.stringify({ error: '该手机号已被注册，请直接登录' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 创建新用户
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: tempEmail,
          password: password,
          email_confirm: true, // 自动确认邮箱
        });

        if (createError) {
          console.error('Create user error:', createError);
          return new Response(
            JSON.stringify({ error: '注册失败：' + createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 等待profile被创建（由trigger创建），然后更新手机号
        // 使用upsert确保手机号被保存
        let profileUpdated = false;
        for (let i = 0; i < 5; i++) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
              user_id: newUser.user.id,
              phone: phone,
              email: tempEmail
            }, { 
              onConflict: 'user_id',
              ignoreDuplicates: false 
            });

          if (!profileError) {
            profileUpdated = true;
            break;
          }
          console.log(`Profile update attempt ${i + 1} failed:`, profileError);
          // 等待100ms后重试
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!profileUpdated) {
          console.error('Failed to update profile after retries');
        }

        // 添加供应商角色
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: newUser.user.id,
            role: 'supplier'
          });

        if (roleError) {
          console.error('Add role error:', roleError);
        }

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
    console.error('Auth API error:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
