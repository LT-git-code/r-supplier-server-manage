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
    const { action, ...params } = await req.json();

    switch (action) {
      case 'get_profile': {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // 如果是供应商，获取公司名称
        let companyName = null;
        const { data: supplier } = await supabaseAdmin
          .from('suppliers')
          .select('company_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (supplier) {
          companyName = supplier.company_name;
        }

        return new Response(
          JSON.stringify({ 
            profile: profile || null,
            companyName,
            email: user.email 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_email_code': {
        const { email } = params;
        if (!email || email !== user.email) {
          return new Response(
            JSON.stringify({ error: '只能向当前登录邮箱发送验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const code = generateCode();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10分钟有效期
        verificationCodes.set(`email_${user.id}`, { code, expiresAt, type: 'email' });

        // 发送验证码邮件（这里使用 Supabase 的邮件功能）
        // 实际生产环境应该使用专业的邮件服务
        const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });

        // 由于 Supabase 没有直接的邮件发送 API，这里返回验证码
        // 实际生产环境应该通过邮件服务发送
        console.log(`Email verification code for ${email}: ${code}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '验证码已发送（开发环境：请查看控制台）',
            // 开发环境返回验证码，生产环境不应返回
            code: Deno.env.get('ENVIRONMENT') === 'development' ? code : undefined
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_phone_code': {
        const { phone } = params;
        if (!phone) {
          return new Response(
            JSON.stringify({ error: '请提供手机号' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证手机号是否属于当前用户
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('phone')
          .eq('user_id', user.id)
          .single();

        if (!profile || profile.phone !== phone) {
          return new Response(
            JSON.stringify({ error: '只能向当前绑定的手机号发送验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const code = generateCode();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10分钟有效期
        verificationCodes.set(`phone_${user.id}`, { code, expiresAt, type: 'phone' });

        // 实际生产环境应该通过短信服务发送验证码
        console.log(`Phone verification code for ${phone}: ${code}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: '验证码已发送（开发环境：请查看控制台）',
            // 开发环境返回验证码，生产环境不应返回
            code: Deno.env.get('ENVIRONMENT') === 'development' ? code : undefined
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify_code': {
        const { code, type } = params; // type: 'email' | 'phone'
        if (!code || !type) {
          return new Response(
            JSON.stringify({ error: '请提供验证码和类型' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const stored = verificationCodes.get(`${type}_${user.id}`);
        if (!stored) {
          return new Response(
            JSON.stringify({ error: '验证码不存在或已过期' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (Date.now() > stored.expiresAt) {
          verificationCodes.delete(`${type}_${user.id}`);
          return new Response(
            JSON.stringify({ error: '验证码已过期' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (stored.code !== code) {
          return new Response(
            JSON.stringify({ error: '验证码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证成功后删除验证码
        verificationCodes.delete(`${type}_${user.id}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_name': {
        const { fullName } = params;
        if (!fullName) {
          return new Response(
            JSON.stringify({ error: '请提供姓名' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ full_name: fullName })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_password': {
        const { oldPassword, newPassword, emailCode } = params;
        if (!oldPassword || !newPassword || !emailCode) {
          return new Response(
            JSON.stringify({ error: '请提供旧密码、新密码和邮箱验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证旧密码 - 使用临时客户端验证，不影响当前会话
        const tempClient = createClient(supabaseUrl, supabaseAnonKey);
        const { error: signInError } = await tempClient.auth.signInWithPassword({
          email: user.email!,
          password: oldPassword,
        });

        if (signInError) {
          return new Response(
            JSON.stringify({ error: '旧密码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证邮箱验证码
        const emailCodeStored = verificationCodes.get(`email_${user.id}`);
        if (!emailCodeStored || emailCodeStored.type !== 'email') {
          return new Response(
            JSON.stringify({ error: '请先获取邮箱验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (Date.now() > emailCodeStored.expiresAt) {
          verificationCodes.delete(`email_${user.id}`);
          return new Response(
            JSON.stringify({ error: '邮箱验证码已过期' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (emailCodeStored.code !== emailCode) {
          return new Response(
            JSON.stringify({ error: '邮箱验证码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 更新密码
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { password: newPassword }
        );

        if (updateError) throw updateError;

        // 删除验证码
        verificationCodes.delete(`email_${user.id}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_email': {
        const { newEmail, emailCode } = params;
        if (!newEmail || !emailCode) {
          return new Response(
            JSON.stringify({ error: '请提供新邮箱和验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证旧邮箱验证码
        const emailCodeStored = verificationCodes.get(`email_${user.id}`);
        if (!emailCodeStored || emailCodeStored.type !== 'email') {
          return new Response(
            JSON.stringify({ error: '请先获取旧邮箱验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (Date.now() > emailCodeStored.expiresAt) {
          verificationCodes.delete(`email_${user.id}`);
          return new Response(
            JSON.stringify({ error: '验证码已过期' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (emailCodeStored.code !== emailCode) {
          return new Response(
            JSON.stringify({ error: '验证码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 更新邮箱
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email: newEmail }
        );

        if (updateError) throw updateError;

        // 更新 profiles 表中的邮箱
        await supabaseAdmin
          .from('profiles')
          .update({ email: newEmail })
          .eq('user_id', user.id);

        // 删除验证码
        verificationCodes.delete(`email_${user.id}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_phone': {
        const { newPhone, phoneCode } = params;
        if (!newPhone || !phoneCode) {
          return new Response(
            JSON.stringify({ error: '请提供新手机号和验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 验证旧手机号验证码
        const phoneCodeStored = verificationCodes.get(`phone_${user.id}`);
        if (!phoneCodeStored || phoneCodeStored.type !== 'phone') {
          return new Response(
            JSON.stringify({ error: '请先获取旧手机号验证码' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (Date.now() > phoneCodeStored.expiresAt) {
          verificationCodes.delete(`phone_${user.id}`);
          return new Response(
            JSON.stringify({ error: '验证码已过期' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (phoneCodeStored.code !== phoneCode) {
          return new Response(
            JSON.stringify({ error: '验证码错误' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 更新手机号
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ phone: newPhone })
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // 删除验证码
        verificationCodes.delete(`phone_${user.id}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_company_name': {
        // 检查是否是供应商
        const { data: supplier } = await supabaseAdmin
          .from('suppliers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!supplier) {
          return new Response(
            JSON.stringify({ error: '只有供应商可以修改公司名称' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { companyName } = params;
        if (!companyName) {
          return new Response(
            JSON.stringify({ error: '请提供公司名称' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from('suppliers')
          .update({ company_name: companyName })
          .eq('user_id', user.id);

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
    console.error('Profile API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
