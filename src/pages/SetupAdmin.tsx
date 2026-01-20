import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function SetupAdmin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('setup-admin', {
        body: { email, setupKey }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        setError(data.error);
      } else if (data.success) {
        setSuccess(data.message);
        // 3秒后跳转到登录页
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || '设置失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        {/* 警告提示 */}
        <Alert className="mb-6 border-warning bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            此页面仅用于初始化系统管理员账户。设置完成后请妥善保管账户信息。
          </AlertDescription>
        </Alert>

        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">初始化管理员账户</CardTitle>
            <CardDescription>
              设置系统的第一个管理员账户，该账户将拥有完整的系统管理权限
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4 border-success bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  {success}
                  <br />
                  <span className="text-sm">正在跳转到登录页...</span>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">管理员邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入已注册的邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting || !!success}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  请先在登录页面注册账号，然后在此输入注册邮箱
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="setupKey">设置密钥</Label>
                <Input
                  id="setupKey"
                  type="password"
                  placeholder="请输入初始化密钥"
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  disabled={isSubmitting || !!success}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  密钥: <code className="bg-muted px-1 py-0.5 rounded">SRM_INITIAL_SETUP_2024</code>
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !!success}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    设置中...
                  </>
                ) : (
                  '设置管理员'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => navigate('/auth')}
              >
                返回登录页面
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">使用说明：</h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>先访问 <code>/auth</code> 页面注册一个账号</li>
            <li>返回此页面，输入刚注册的邮箱</li>
            <li>输入初始化密钥完成管理员设置</li>
            <li>设置成功后，使用该账号登录即可管理系统</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
