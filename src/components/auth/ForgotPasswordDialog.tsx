import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Mail, Phone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType?: 'supplier' | 'department' | null;
}

export function ForgotPasswordDialog({ open, onOpenChange, userType }: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<'input' | 'verify' | 'reset' | 'success'>('input');
  const [verifyMethod, setVerifyMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  // 部门用户只能使用邮箱
  const isDepartment = userType === 'department';

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setStep('input');
      setEmail('');
      setPhone('');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setDevCode(null);
      setCountdown(0);
    }
  }, [open]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const action = verifyMethod === 'email' ? 'send_reset_email_code' : 'send_reset_phone_code';
      const payload = verifyMethod === 'email' ? { email } : { phone };

      const { data, error: invokeError } = await supabase.functions.invoke('auth-api', {
        body: { action, ...payload }
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      // 开发环境显示验证码
      if (data?.code) {
        setDevCode(data.code);
      }

      setCountdown(60);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('请输入完整的6位验证码');
      return;
    }
    setError(null);
    setStep('reset');
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const action = verifyMethod === 'email' ? 'reset_password_by_email' : 'reset_password_by_phone';
      const payload = verifyMethod === 'email' 
        ? { email, code, newPassword } 
        : { phone, code, newPassword };

      const { data, error: invokeError } = await supabase.functions.invoke('auth-api', {
        body: { action, ...payload }
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(data.error);

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  const renderInputStep = () => (
    <div className="space-y-4">
      {!isDepartment && (
        <Tabs value={verifyMethod} onValueChange={(v) => setVerifyMethod(v as 'email' | 'phone')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              邮箱验证
            </TabsTrigger>
            <TabsTrigger value="phone" className="gap-2">
              <Phone className="h-4 w-4" />
              手机验证
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">邮箱地址</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="请输入注册时使用的邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="phone" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-phone">手机号码</Label>
              <Input
                id="reset-phone"
                type="tel"
                placeholder="请输入绑定的手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {isDepartment && (
        <div className="space-y-2">
          <Label htmlFor="dept-reset-email">邮箱地址</Label>
          <Input
            id="dept-reset-email"
            type="email"
            placeholder="请输入注册时使用的邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">部门用户只能通过邮箱找回密码</p>
        </div>
      )}

      <Button 
        className="w-full" 
        onClick={handleSendCode}
        disabled={isLoading || (verifyMethod === 'email' ? !email : !phone)}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            发送中...
          </>
        ) : (
          '发送验证码'
        )}
      </Button>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          验证码已发送至 {verifyMethod === 'email' ? email : phone}
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

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
          onClick={handleResendCode}
          disabled={countdown > 0 || isLoading}
        >
          {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
        </button>
      </div>

      <Button 
        className="w-full" 
        onClick={handleVerifyCode}
        disabled={code.length !== 6}
      >
        下一步
      </Button>
    </div>
  );

  const renderResetStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">新密码</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="至少6个字符"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-new-password">确认新密码</Label>
        <Input
          id="confirm-new-password"
          type="password"
          placeholder="请再次输入新密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <Button 
        className="w-full" 
        onClick={handleResetPassword}
        disabled={isLoading || !newPassword || !confirmPassword}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            重置中...
          </>
        ) : (
          '重置密码'
        )}
      </Button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="space-y-4 text-center py-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
        <CheckCircle2 className="h-6 w-6 text-success" />
      </div>
      <div>
        <h3 className="font-medium">密码重置成功</h3>
        <p className="text-sm text-muted-foreground mt-1">
          请使用新密码登录
        </p>
      </div>
      <Button className="w-full" onClick={() => onOpenChange(false)}>
        返回登录
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>找回密码</DialogTitle>
          <DialogDescription>
            {step === 'input' && '请选择验证方式找回您的密码'}
            {step === 'verify' && '请输入收到的验证码'}
            {step === 'reset' && '请设置您的新密码'}
            {step === 'success' && ''}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'input' && renderInputStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'reset' && renderResetStep()}
        {step === 'success' && renderSuccessStep()}
      </DialogContent>
    </Dialog>
  );
}
