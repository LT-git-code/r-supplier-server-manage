import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Building2, 
  Loader2, 
  Send,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Profile() {
  const { authUser, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // 基本信息
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  // 修改密码
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordEmailCode, setPasswordEmailCode] = useState('');
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordCodeVerified, setPasswordCodeVerified] = useState(false);

  // 修改邮箱
  const [newEmail, setNewEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeVerified, setEmailCodeVerified] = useState(false);

  // 修改手机号
  const [newPhone, setNewPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCodeVerified, setPhoneCodeVerified] = useState(false);

  const isSupplier = authUser?.isSupplier || false;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: { action: 'get_profile' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setFullName(data.profile?.full_name || '');
      setEmail(data.email || '');
      setPhone(data.profile?.phone || '');
      setCompanyName(data.companyName || '');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: error.message || '无法加载个人信息',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendEmailCode = async (forPassword = false) => {
    try {
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: { action: 'send_email_code', email },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (forPassword) {
        setPasswordCodeSent(true);
      } else {
        setEmailCodeSent(true);
      }

      toast({
        title: '验证码已发送',
        description: data.message || '请查看您的邮箱',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '发送失败',
        description: error.message || '无法发送验证码',
      });
    }
  };

  const sendPhoneCode = async () => {
    if (!phone) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: '请先设置手机号',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: { action: 'send_phone_code', phone },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setPhoneCodeSent(true);
      toast({
        title: '验证码已发送',
        description: data.message || '请查看您的手机',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '发送失败',
        description: error.message || '无法发送验证码',
      });
    }
  };

  const verifyCode = async (type: 'email' | 'phone', code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: { action: 'verify_code', type, code },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (type === 'email') {
        setEmailCodeVerified(true);
      } else {
        setPhoneCodeVerified(true);
      }

      toast({
        title: '验证成功',
        description: '验证码验证通过',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: error.message || '验证码错误或已过期',
      });
    }
  };

  const handleUpdateName = async () => {
    try {
      setSaving(prev => ({ ...prev, name: true }));
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: { action: 'update_name', fullName },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: '更新成功',
        description: '姓名已更新',
      });
      await refreshUserData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error.message || '无法更新姓名',
      });
    } finally {
      setSaving(prev => ({ ...prev, name: false }));
    }
  };

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !passwordEmailCode) {
      toast({
        variant: 'destructive',
        title: '请填写完整信息',
        description: '需要旧密码、新密码和邮箱验证码',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: '密码不一致',
        description: '两次输入的新密码不一致',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: '密码太短',
        description: '密码至少需要6个字符',
      });
      return;
    }

    try {
      setSaving(prev => ({ ...prev, password: true }));
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: {
          action: 'update_password',
          oldPassword,
          newPassword,
          emailCode: passwordEmailCode,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: '更新成功',
        description: '密码已更新，请重新登录',
      });

      // 清空表单
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordEmailCode('');
      setPasswordCodeSent(false);
      setPasswordCodeVerified(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error.message || '无法更新密码',
      });
    } finally {
      setSaving(prev => ({ ...prev, password: false }));
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || !emailCode) {
      toast({
        variant: 'destructive',
        title: '请填写完整信息',
        description: '需要新邮箱和验证码',
      });
      return;
    }

    if (newEmail === email) {
      toast({
        variant: 'destructive',
        title: '邮箱未变更',
        description: '新邮箱与当前邮箱相同',
      });
      return;
    }

    try {
      setSaving(prev => ({ ...prev, email: true }));
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: {
          action: 'update_email',
          newEmail,
          emailCode,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: '更新成功',
        description: '邮箱已更新',
      });

      setEmail(newEmail);
      setNewEmail('');
      setEmailCode('');
      setEmailCodeSent(false);
      setEmailCodeVerified(false);
      await refreshUserData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error.message || '无法更新邮箱',
      });
    } finally {
      setSaving(prev => ({ ...prev, email: false }));
    }
  };

  const handleUpdatePhone = async () => {
    if (!newPhone || !phoneCode) {
      toast({
        variant: 'destructive',
        title: '请填写完整信息',
        description: '需要新手机号和验证码',
      });
      return;
    }

    if (newPhone === phone) {
      toast({
        variant: 'destructive',
        title: '手机号未变更',
        description: '新手机号与当前手机号相同',
      });
      return;
    }

    try {
      setSaving(prev => ({ ...prev, phone: true }));
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: {
          action: 'update_phone',
          newPhone,
          phoneCode,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: '更新成功',
        description: '手机号已更新',
      });

      setPhone(newPhone);
      setNewPhone('');
      setPhoneCode('');
      setPhoneCodeSent(false);
      setPhoneCodeVerified(false);
      await refreshUserData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error.message || '无法更新手机号',
      });
    } finally {
      setSaving(prev => ({ ...prev, phone: false }));
    }
  };

  const handleUpdateCompanyName = async () => {
    if (!companyName) {
      toast({
        variant: 'destructive',
        title: '请填写公司名称',
      });
      return;
    }

    try {
      setSaving(prev => ({ ...prev, company: true }));
      const { data, error } = await supabase.functions.invoke('profile-api', {
        body: {
          action: 'update_company_name',
          companyName,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: '更新成功',
        description: '公司名称已更新',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error.message || '无法更新公司名称',
      });
    } finally {
      setSaving(prev => ({ ...prev, company: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">个人设置</h1>
        <p className="text-muted-foreground">管理您的账户信息和安全设置</p>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            基本信息
          </CardTitle>
          <CardDescription>修改您的姓名</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>姓名</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="请输入您的姓名"
            />
          </div>
          <Button 
            onClick={handleUpdateName} 
            disabled={saving.name}
            className="w-full sm:w-auto"
          >
            {saving.name && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            保存
          </Button>
        </CardContent>
      </Card>

      {/* 供应商公司名称 */}
      {isSupplier && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              公司信息
            </CardTitle>
            <CardDescription>修改您的公司名称</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>公司名称</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="请输入公司名称"
              />
            </div>
            <Button 
              onClick={handleUpdateCompanyName} 
              disabled={saving.company}
              className="w-full sm:w-auto"
            >
              {saving.company && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            修改密码
          </CardTitle>
          <CardDescription>修改您的登录密码，需要验证旧密码和邮箱验证码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>旧密码</Label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入当前密码"
            />
          </div>
          <div className="space-y-2">
            <Label>新密码</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6个字符）"
            />
          </div>
          <div className="space-y-2">
            <Label>确认新密码</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
            />
          </div>
          <div className="space-y-2">
            <Label>邮箱验证码</Label>
            <div className="flex gap-2">
              <Input
                value={passwordEmailCode}
                onChange={(e) => setPasswordEmailCode(e.target.value)}
                placeholder="请输入邮箱验证码"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => sendEmailCode(true)}
                disabled={passwordCodeSent}
              >
                {passwordCodeSent ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    已发送
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    发送验证码
                  </>
                )}
              </Button>
            </div>
            {passwordCodeSent && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  验证码已发送至 {email}，请查收
                </AlertDescription>
              </Alert>
            )}
          </div>
          <Button 
            onClick={handleUpdatePassword} 
            disabled={saving.password}
            className="w-full sm:w-auto"
          >
            {saving.password && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            更新密码
          </Button>
        </CardContent>
      </Card>

      {/* 修改邮箱 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            修改邮箱
          </CardTitle>
          <CardDescription>修改您的登录邮箱，需要验证当前邮箱的验证码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>当前邮箱</Label>
            <Input value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label>新邮箱</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="请输入新邮箱地址"
            />
          </div>
          <div className="space-y-2">
            <Label>当前邮箱验证码</Label>
            <div className="flex gap-2">
              <Input
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                placeholder="请输入验证码"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => sendEmailCode(false)}
                disabled={emailCodeSent}
              >
                {emailCodeSent ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    已发送
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    发送验证码
                  </>
                )}
              </Button>
            </div>
            {emailCodeSent && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  验证码已发送至 {email}，请查收
                </AlertDescription>
              </Alert>
            )}
          </div>
          <Button 
            onClick={handleUpdateEmail} 
            disabled={saving.email}
            className="w-full sm:w-auto"
          >
            {saving.email && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            更新邮箱
          </Button>
        </CardContent>
      </Card>

      {/* 修改手机号 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            修改手机号
          </CardTitle>
          <CardDescription>修改您的手机号，需要验证当前手机号的验证码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>当前手机号</Label>
            <Input value={phone || '未设置'} disabled />
          </div>
          {phone && (
            <>
              <div className="space-y-2">
                <Label>新手机号</Label>
                <Input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="请输入新手机号"
                />
              </div>
              <div className="space-y-2">
                <Label>当前手机号验证码</Label>
                <div className="flex gap-2">
                  <Input
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="请输入验证码"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={sendPhoneCode}
                    disabled={phoneCodeSent}
                  >
                    {phoneCodeSent ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        已发送
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        发送验证码
                      </>
                    )}
                  </Button>
                </div>
                {phoneCodeSent && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      验证码已发送至 {phone}，请查收
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Button 
                onClick={handleUpdatePhone} 
                disabled={saving.phone}
                className="w-full sm:w-auto"
              >
                {saving.phone && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                更新手机号
              </Button>
            </>
          )}
          {!phone && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                您尚未设置手机号，请先在其他地方设置手机号后再进行修改
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
