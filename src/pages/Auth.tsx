import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, AlertCircle, Users, ShieldCheck } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('请输入有效的邮箱地址');
const passwordSchema = z.string().min(6, '密码至少需要6个字符');

type RegisterRole = 'supplier' | 'department' | null;

interface Department {
  id: string;
  name: string;
  code: string | null;
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signIn, signUp } = useAuth();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RegisterRole>(null);
  
  // 部门相关状态
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // 加载部门列表
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name, code')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        setDepartments(data || []);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      } finally {
        setLoadingDepartments(false);
      }
    };

    if (selectedRole === 'department') {
      fetchDepartments();
    }
  }, [selectedRole]);

  useEffect(() => {
    if (!loading && user) {
      // 检查是否需要跳转到供应商注册页面
      const pendingSupplierRegister = localStorage.getItem('pending_supplier_register');
      const pendingDeptRegister = localStorage.getItem('pending_department_register');
      
      if (pendingSupplierRegister === 'true') {
        localStorage.removeItem('pending_supplier_register');
        navigate('/supplier/register');
      } else if (pendingDeptRegister) {
        // 部门注册需要提交申请
        const deptData = JSON.parse(pendingDeptRegister);
        submitDepartmentRegistration(deptData);
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate]);

  const submitDepartmentRegistration = async (deptData: any) => {
    try {
      const { error } = await supabase
        .from('department_registrations')
        .insert({
          user_id: user!.id,
          department_id: deptData.departmentId,
          full_name: deptData.fullName,
          phone: deptData.phone,
          position: deptData.position,
        });

      if (error) throw error;
      localStorage.removeItem('pending_department_register');
      navigate('/');
    } catch (error) {
      console.error('Failed to submit department registration:', error);
      localStorage.removeItem('pending_department_register');
      navigate('/');
    }
  };

  const validateForm = () => {
    setError(null);
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return false;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return false;
    }
    
    if (activeTab === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    // 部门注册验证
    if (activeTab === 'register' && selectedRole === 'department') {
      if (!selectedDepartment) {
        setError('请选择要加入的部门');
        return false;
      }
      if (!fullName.trim()) {
        setError('请输入您的姓名');
        return false;
      }
    }
    
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('邮箱或密码错误');
      } else if (error.message.includes('Email not confirmed')) {
        setError('请先验证您的邮箱');
      } else {
        setError(error.message);
      }
    }
    
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        setError('该邮箱已被注册');
      } else {
        setError(error.message);
      }
    } else {
      // 如果选择了供应商角色，标记需要跳转到供应商注册页面
      if (selectedRole === 'supplier') {
        localStorage.setItem('pending_supplier_register', 'true');
      } else if (selectedRole === 'department') {
        // 部门角色需要保存选择的部门信息
        localStorage.setItem('pending_department_register', JSON.stringify({
          departmentId: selectedDepartment,
          fullName: fullName,
          phone: phone,
          position: position,
        }));
      }
      setSuccessMessage('注册成功！您现在可以登录了。');
      setActiveTab('login');
      setPassword('');
      setConfirmPassword('');
      setSelectedRole(null);
      setSelectedDepartment('');
      setFullName('');
      setPhone('');
      setPosition('');
    }
    
    setIsSubmitting(false);
  };

  const handleRoleSelect = (role: RegisterRole) => {
    setSelectedRole(role);
  };

  const handleBackToRoleSelect = () => {
    setSelectedRole(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 注册时的角色选择界面
  const renderRoleSelection = () => (
    <div className="space-y-4">
      <CardDescription className="text-center pb-2">
        请选择您的注册身份
      </CardDescription>
      
      <div className="grid gap-3">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md hover:border-primary ${
            selectedRole === 'supplier' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => handleRoleSelect('supplier')}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">供应商</h3>
              <p className="text-sm text-muted-foreground">注册成为供应商，提供产品和服务</p>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md hover:border-primary ${
            selectedRole === 'department' ? 'border-primary bg-primary/5' : ''
          }`}
          onClick={() => handleRoleSelect('department')}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">部门人员</h3>
              <p className="text-sm text-muted-foreground">企业内部人员，管理供应商关系</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 注册表单
  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
        {selectedRole === 'supplier' ? (
          <>
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">供应商注册</span>
          </>
        ) : (
          <>
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">部门人员注册</span>
          </>
        )}
        <button
          type="button"
          className="ml-auto text-xs text-primary hover:underline"
          onClick={handleBackToRoleSelect}
        >
          更换身份
        </button>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-email">邮箱</Label>
        <Input
          id="register-email"
          type="email"
          placeholder="请输入邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-password">密码</Label>
        <Input
          id="register-password"
          type="password"
          placeholder="至少6个字符"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="register-confirm">确认密码</Label>
        <Input
          id="register-confirm"
          type="password"
          placeholder="请再次输入密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      {/* 部门用户额外信息 */}
      {selectedRole === 'department' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="department">选择部门 *</Label>
            <Select
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
              disabled={isSubmitting || loadingDepartments}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingDepartments ? "加载中..." : "请选择要加入的部门"} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name} {dept.code && `(${dept.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">姓名 *</Label>
            <Input
              id="fullName"
              placeholder="请输入您的姓名"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">联系电话</Label>
            <Input
              id="phone"
              placeholder="请输入联系电话"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">职位</Label>
            <Input
              id="position"
              placeholder="请输入您的职位"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              部门人员注册后需要等待管理员审核分配权限
            </AlertDescription>
          </Alert>
        </>
      )}
      
      {selectedRole === 'supplier' && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            注册后需要填写供应商详细信息并等待审核
          </AlertDescription>
        </Alert>
      )}
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            注册中...
          </>
        ) : (
          '注册'
        )}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">供应商管理平台</h1>
          </div>
          <p className="text-muted-foreground text-sm">SRM - Supplier Relationship Management</p>
        </div>

        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedRole(null); }}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {successMessage && (
                <Alert className="mb-4 border-success bg-success/10">
                  <AlertDescription className="text-success">{successMessage}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">邮箱</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="请输入邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      '登录'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                {selectedRole === null ? renderRoleSelection() : renderRegisterForm()}
              </TabsContent>
            </CardContent>
          </Tabs>
          
          <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground pt-0">
            <p>
              {activeTab === 'login' ? (
                <>
                  还没有账号？{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab('register')}
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab('login')}
                  >
                    返回登录
                  </button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 供应商管理平台 · 版权所有
        </p>
      </div>
    </div>
  );
}