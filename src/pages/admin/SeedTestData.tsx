import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, Users, Building2, Package, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AccountInfo {
  email: string;
  password: string;
  fullName: string;
  department?: string;
  companyName?: string;
  supplierType?: string;
  status?: string;
}

interface SeedResult {
  success: boolean;
  message: string;
  summary: {
    departments: number;
    departmentUsers: number;
    supplierUsers: number;
    products: number;
    qualifications: number;
  };
  accounts: {
    departmentUsers: AccountInfo[];
    supplierUsers: AccountInfo[];
  };
}

export default function SeedTestData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSeedData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-test-data');
      
      if (error) throw error;
      
      setResult(data);
      toast({
        title: '测试数据创建成功',
        description: `创建了 ${data.summary.departmentUsers} 个部门用户和 ${data.summary.supplierUsers} 个供应商用户`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '创建测试数据失败';
      toast({
        title: '创建失败',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">创建测试数据</h1>
        <p className="text-muted-foreground">一键创建部门账号、供应商账号及相关测试数据</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>数据创建说明</CardTitle>
          <CardDescription>点击下方按钮将创建以下测试数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">3个部门</p>
                <p className="text-xs text-muted-foreground">采购/技术/财务</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">3个部门用户</p>
                <p className="text-xs text-muted-foreground">每部门1个管理员</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">5个供应商</p>
                <p className="text-xs text-muted-foreground">企业/个体/海外</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">产品&资质</p>
                <p className="text-xs text-muted-foreground">多条测试记录</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSeedData} 
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                正在创建测试数据...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                创建测试数据
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <FileCheck className="h-5 w-5" />
                创建成功
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded">
                  <p className="text-2xl font-bold">{result.summary.departments}</p>
                  <p className="text-sm text-muted-foreground">部门</p>
                </div>
                <div className="text-center p-3 bg-muted rounded">
                  <p className="text-2xl font-bold">{result.summary.departmentUsers}</p>
                  <p className="text-sm text-muted-foreground">部门用户</p>
                </div>
                <div className="text-center p-3 bg-muted rounded">
                  <p className="text-2xl font-bold">{result.summary.supplierUsers}</p>
                  <p className="text-sm text-muted-foreground">供应商</p>
                </div>
                <div className="text-center p-3 bg-muted rounded">
                  <p className="text-2xl font-bold">{result.summary.products}</p>
                  <p className="text-sm text-muted-foreground">产品</p>
                </div>
                <div className="text-center p-3 bg-muted rounded">
                  <p className="text-2xl font-bold">{result.summary.qualifications}</p>
                  <p className="text-sm text-muted-foreground">资质</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>部门用户账号</CardTitle>
              <CardDescription>可使用以下账号登录部门端</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">姓名</th>
                      <th className="text-left py-2">邮箱</th>
                      <th className="text-left py-2">密码</th>
                      <th className="text-left py-2">部门</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.accounts.departmentUsers.map((user, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{user.fullName}</td>
                        <td className="py-2 font-mono text-xs">{user.email}</td>
                        <td className="py-2 font-mono text-xs">{user.password}</td>
                        <td className="py-2">{user.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>供应商用户账号</CardTitle>
              <CardDescription>可使用以下账号登录供应商端</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">姓名</th>
                      <th className="text-left py-2">邮箱</th>
                      <th className="text-left py-2">密码</th>
                      <th className="text-left py-2">公司</th>
                      <th className="text-left py-2">类型</th>
                      <th className="text-left py-2">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.accounts.supplierUsers.map((user, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{user.fullName}</td>
                        <td className="py-2 font-mono text-xs">{user.email}</td>
                        <td className="py-2 font-mono text-xs">{user.password}</td>
                        <td className="py-2 max-w-[200px] truncate">{user.companyName}</td>
                        <td className="py-2">
                          {user.supplierType === 'enterprise' ? '企业' : 
                           user.supplierType === 'individual' ? '个体' : '海外'}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {user.status === 'approved' ? '已通过' : '待审核'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/admin/users')}>
              查看用户管理
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/suppliers')}>
              查看供应商管理
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
