import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Building2, 
  Users, 
  Package, 
  FileCheck, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Globe,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface DashboardData {
  supplierStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
  };
  supplierTypeStats: {
    enterprise: number;
    overseas: number;
    individual: number;
  };
  provinceDistribution: { name: string; value: number }[];
  userStats: {
    total: number;
    admins: number;
    departments: number;
    suppliers: number;
  };
  productStats: {
    total: number;
    active: number;
    suspended: number;
  };
  qualificationStats: {
    total: number;
    pending: number;
    approved: number;
    expiringSoon: number;
    expired: number;
  };
  departmentStats: {
    total: number;
    active: number;
  };
  monthlyTrend: { month: string; count: number }[];
  pendingTasks: {
    supplierAudit: number;
    qualificationAudit: number;
    expiringQualifications: number;
  };
}

const COLORS = ['#2563eb', '#0891b2', '#f59e0b', '#ef4444', '#8b5cf6'];

const supplierTypeLabels: Record<string, string> = {
  enterprise: '企业',
  overseas: '海外',
  individual: '个人',
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.functions.invoke('admin-dashboard');
      
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      
      setData(result);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">加载数据失败</p>
        <Button onClick={fetchData} className="mt-4">重试</Button>
      </div>
    );
  }

  const supplierStatusData = [
    { name: '待审核', value: data.supplierStats.pending, color: '#f59e0b' },
    { name: '已通过', value: data.supplierStats.approved, color: '#22c55e' },
    { name: '已驳回', value: data.supplierStats.rejected, color: '#ef4444' },
    { name: '已暂停', value: data.supplierStats.suspended, color: '#6b7280' },
  ].filter(item => item.value > 0);

  const supplierTypeData = [
    { name: '企业', value: data.supplierTypeStats.enterprise, color: '#2563eb' },
    { name: '海外', value: data.supplierTypeStats.overseas, color: '#0891b2' },
    { name: '个人', value: data.supplierTypeStats.individual, color: '#8b5cf6' },
  ].filter(item => item.value > 0);

  const totalPending = data.pendingTasks.supplierAudit + 
                       data.pendingTasks.qualificationAudit + 
                       data.pendingTasks.expiringQualifications;

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">数据看板</h1>
          <p className="text-muted-foreground">平台运营数据概览</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 待办提醒 */}
      {totalPending > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              待办事项
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {data.pendingTasks.supplierAudit > 0 && (
                <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 py-1.5">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {data.pendingTasks.supplierAudit} 个供应商待审核
                </Badge>
              )}
              {data.pendingTasks.qualificationAudit > 0 && (
                <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 py-1.5">
                  <FileCheck className="h-3.5 w-3.5 mr-1" />
                  {data.pendingTasks.qualificationAudit} 个资质待审核
                </Badge>
              )}
              {data.pendingTasks.expiringQualifications > 0 && (
                <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  {data.pendingTasks.expiringQualifications} 个资质即将过期
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">供应商总数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.supplierStats.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-success border-success/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                {data.supplierStats.approved}
              </Badge>
              <Badge variant="outline" className="text-warning border-warning/30">
                <Clock className="h-3 w-3 mr-1" />
                {data.supplierStats.pending}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">系统用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.userStats.total}</div>
            <p className="text-xs text-muted-foreground mt-2">
              管理员 {data.userStats.admins} · 部门 {data.userStats.departments}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">产品数量</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.productStats.total}</div>
            <p className="text-xs text-muted-foreground mt-2">
              上架中 {data.productStats.active}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">资质证书</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.qualificationStats.total}</div>
            <div className="flex gap-2 mt-2">
              {data.qualificationStats.expiringSoon > 0 && (
                <Badge variant="outline" className="text-warning border-warning/30">
                  即将过期 {data.qualificationStats.expiringSoon}
                </Badge>
              )}
              {data.qualificationStats.expired > 0 && (
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  已过期 {data.qualificationStats.expired}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 供应商趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              供应商增长趋势
            </CardTitle>
            <CardDescription>近6个月新增供应商数量</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="新增供应商"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 供应商状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle>供应商状态分布</CardTitle>
            <CardDescription>按审核状态统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {supplierStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={supplierStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {supplierStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 供应商类型分布 */}
        <Card>
          <CardHeader>
            <CardTitle>供应商类型分布</CardTitle>
            <CardDescription>按企业类型统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {supplierTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      width={60}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" name="数量" radius={[0, 4, 4, 0]}>
                      {supplierTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 地域分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              地域分布 TOP10
            </CardTitle>
            <CardDescription>供应商所在省份分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data.provinceDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.provinceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      name="供应商数" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{data.departmentStats.total}</div>
              <p className="text-sm text-muted-foreground">部门总数</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{data.supplierStats.approved}</div>
              <p className="text-sm text-muted-foreground">已审核通过</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{data.supplierStats.pending}</div>
              <p className="text-sm text-muted-foreground">待审核</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{data.qualificationStats.approved}</div>
              <p className="text-sm text-muted-foreground">有效资质</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
