import { useState, useEffect } from 'react';
import { useSupplierApi } from '@/hooks/useSupplierApi';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AttachmentUpload } from '@/components/supplier/AttachmentUpload';
import {
  Building2,
  CreditCard,
  Factory,
  FileBarChart,
  FolderOpen,
  Save,
  Loader2,
} from 'lucide-react';

interface SupplierInfo {
  id: string;
  company_name: string;
  unified_social_credit_code: string;
  legal_representative: string;
  registered_capital: number;
  establishment_date: string;
  business_scope: string;
  address: string;
  province: string;
  city: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  production_capacity: string;
  main_products: string;
  employee_count: number;
  annual_revenue: number;
  status: string;
  supplier_type: string;
}

export default function SupplierInfo() {
  const api = useSupplierApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<SupplierInfo | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    loadSupplierInfo();
  }, []);

  const loadSupplierInfo = async () => {
    try {
      setLoading(true);
      const data = await api.getSupplierInfo();
      setInfo(data);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '加载失败',
        description: err.message || '无法加载供应商信息',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!info) return;
    
    try {
      setSaving(true);
      const { id, status, supplier_type, ...updateData } = info;
      await api.updateSupplierInfo(updateData as Record<string, unknown>);
      toast({
        title: '保存成功',
        description: '供应商信息已更新',
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '保存失败',
        description: err.message || '无法保存供应商信息',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SupplierInfo, value: string | number) => {
    if (!info) return;
    setInfo({ ...info, [field]: value });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">信息管理</h1>
          <p className="text-muted-foreground">管理您的企业信息和资料</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={info?.status === 'approved' ? 'default' : 'secondary'}>
            {info?.status === 'approved' ? '已认证' : info?.status === 'pending' ? '待审核' : '未通过'}
          </Badge>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            保存修改
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            基础信息
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            银行信息
          </TabsTrigger>
          <TabsTrigger value="capacity" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            生产能力
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4" />
            财务状况
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            过往案例
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基础信息</CardTitle>
              <CardDescription>企业注册时填写的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">企业名称</Label>
                  <Input
                    id="company_name"
                    value={info?.company_name || ''}
                    onChange={e => updateField('company_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unified_social_credit_code">统一社会信用代码</Label>
                  <Input
                    id="unified_social_credit_code"
                    value={info?.unified_social_credit_code || ''}
                    onChange={e => updateField('unified_social_credit_code', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_representative">法定代表人</Label>
                  <Input
                    id="legal_representative"
                    value={info?.legal_representative || ''}
                    onChange={e => updateField('legal_representative', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registered_capital">注册资本（万元）</Label>
                  <Input
                    id="registered_capital"
                    type="number"
                    value={info?.registered_capital || ''}
                    onChange={e => updateField('registered_capital', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="establishment_date">成立日期</Label>
                  <Input
                    id="establishment_date"
                    type="date"
                    value={info?.establishment_date || ''}
                    onChange={e => updateField('establishment_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">省份</Label>
                  <Input
                    id="province"
                    value={info?.province || ''}
                    onChange={e => updateField('province', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">城市</Label>
                  <Input
                    id="city"
                    value={info?.city || ''}
                    onChange={e => updateField('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">详细地址</Label>
                  <Input
                    id="address"
                    value={info?.address || ''}
                    onChange={e => updateField('address', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="business_scope">经营范围</Label>
                  <Textarea
                    id="business_scope"
                    rows={3}
                    value={info?.business_scope || ''}
                    onChange={e => updateField('business_scope', e.target.value)}
                  />
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-4">联系人信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">联系人姓名</Label>
                    <Input
                      id="contact_name"
                      value={info?.contact_name || ''}
                      onChange={e => updateField('contact_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">联系电话</Label>
                    <Input
                      id="contact_phone"
                      value={info?.contact_phone || ''}
                      onChange={e => updateField('contact_phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">电子邮箱</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={info?.contact_email || ''}
                      onChange={e => updateField('contact_email', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>银行信息</CardTitle>
              <CardDescription>用于结算的银行账户信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">开户银行</Label>
                  <Input
                    id="bank_name"
                    value={info?.bank_name || ''}
                    onChange={e => updateField('bank_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_name">账户名称</Label>
                  <Input
                    id="bank_account_name"
                    value={info?.bank_account_name || ''}
                    onChange={e => updateField('bank_account_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bank_account">银行账号</Label>
                  <Input
                    id="bank_account"
                    value={info?.bank_account || ''}
                    onChange={e => updateField('bank_account', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity">
          <Card>
            <CardHeader>
              <CardTitle>生产服务能力</CardTitle>
              <CardDescription>企业的生产和服务能力描述</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_count">员工人数</Label>
                  <Input
                    id="employee_count"
                    type="number"
                    value={info?.employee_count || ''}
                    onChange={e => updateField('employee_count', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="main_products">主要产品/服务</Label>
                  <Textarea
                    id="main_products"
                    rows={3}
                    placeholder="请描述您的主要产品或服务内容"
                    value={info?.main_products || ''}
                    onChange={e => updateField('main_products', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="production_capacity">生产能力</Label>
                  <Textarea
                    id="production_capacity"
                    rows={4}
                    placeholder="请描述您的生产线情况、年产能、设备情况、技术人员数量等"
                    value={info?.production_capacity || ''}
                    onChange={e => updateField('production_capacity', e.target.value)}
                  />
                </div>
              </div>
              
              {info?.id && (
                <div className="border-t pt-6">
                  <AttachmentUpload
                    supplierId={info.id}
                    category="capacity"
                    title="生产能力相关附件"
                    description="上传设备清单、产能报告、生产线照片等文件"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <CardTitle>财务状况</CardTitle>
              <CardDescription>企业的财务信息概况</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annual_revenue">年营业收入（万元）</Label>
                  <Input
                    id="annual_revenue"
                    type="number"
                    value={info?.annual_revenue || ''}
                    onChange={e => updateField('annual_revenue', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              {info?.id && (
                <div className="border-t pt-6">
                  <AttachmentUpload
                    supplierId={info.id}
                    category="finance"
                    title="财务相关附件"
                    description="上传财务报表、审计报告、纳税证明等文件"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases">
          <Card>
            <CardHeader>
              <CardTitle>过往案例</CardTitle>
              <CardDescription>展示您的成功案例和项目经验</CardDescription>
            </CardHeader>
            <CardContent>
              {info?.id && (
                <AttachmentUpload
                  supplierId={info.id}
                  category="cases"
                  title="过往案例附件"
                  description="上传合作案例、项目经验、业绩证明等文件"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
