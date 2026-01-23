import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Phone, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PhoneLoginFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PhoneLoginForm({ onSuccess, onError }: PhoneLoginFormProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
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
        body: { action: 'send_login_phone_code', phone }
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      // 开发环境显示验证码
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

  const handleLogin = async () => {
    if (code.length !== 6) {
      setError('请输入完整的6位验证码');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('auth-api', {
        body: { action: 'phone_login', phone, code }
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      // 使用返回的临时密码登录
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.tempPassword,
      });

      if (signInError) throw signInError;

      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      setError(message);
      onError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'phone' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="login-phone">手机号</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-phone"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">仅限已绑定手机号的供应商使用</p>
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
      ) : (
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
            onClick={handleLogin}
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </Button>
        </>
      )}
    </div>
  );
}
