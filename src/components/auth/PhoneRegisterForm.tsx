import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Phone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PhoneRegisterFormProps {
  onSuccess: () => void;
}

export function PhoneRegisterForm({ onSuccess }: PhoneRegisterFormProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'password' | 'success'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的手机号');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('auth-api', {
        body: { action: 'send_register_phone_code', phone }
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.code) {
        setDevCode(data.code);
      }

      setCountdown(60);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (code.length !== 6) {
      setError('请输入完整的6位验证码');
      return;
    }
    setError(null);
    setStep('password');
  };

  const handleRegister = async () => {
    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('auth-api', {
        body: { action: 'phone_register', phone, code, password }
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      // 注册成功，自动登录
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) throw signInError;

      // 标记需要跳转到供应商注册页面
      localStorage.setItem('pending_supplier_register', 'true');
      
      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  if (step === 'success') {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-success" />
        </div>
        <div>
          <h3 className="font-medium">注册成功</h3>
          <p className="text-sm text-muted-foreground mt-1">
            正在跳转至供应商信息填写页面...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'phone' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="register-phone">手机号</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="register-phone"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">手机号将用于快速登录和接收通知</p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSendCode}
            disabled={isLoading || !phone}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                发送中...
              </>
            ) : (
              '获取验证码'
            )}
          </Button>
        </>
      )}

      {step === 'code' && (
        <>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              验证码已发送至 {phone}
            </p>
            {devCode && (
              <Alert className="border-primary bg-primary/10">
                <AlertDescription className="text-primary font-mono text-center">
                  开发环境验证码：{devCode}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex justify-between text-sm">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => { setStep('phone'); setCode(''); setDevCode(null); }}
            >
              更换手机号
            </button>
            <button
              type="button"
              className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              onClick={handleResendCode}
              disabled={countdown > 0 || isLoading}
            >
              {countdown > 0 ? `${countdown}秒后重发` : '重新发送'}
            </button>
          </div>

          <Button 
            className="w-full" 
            onClick={handleVerifyCode}
            disabled={code.length !== 6}
          >
            下一步
          </Button>
        </>
      )}

      {step === 'password' && (
        <>
          <div className="text-center mb-2">
            <p className="text-sm text-muted-foreground">
              手机号：{phone}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-password">设置密码</Label>
            <Input
              id="reg-password"
              type="password"
              placeholder="至少6个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-confirm-password">确认密码</Label>
            <Input
              id="reg-confirm-password"
              type="password"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleRegister}
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                注册中...
              </>
            ) : (
              '完成注册'
            )}
          </Button>

          <button
            type="button"
            className="w-full text-sm text-primary hover:underline"
            onClick={() => setStep('code')}
          >
            返回上一步
          </button>
        </>
      )}
    </div>
  );
}
