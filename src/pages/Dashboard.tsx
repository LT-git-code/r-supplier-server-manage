import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSupplierApi } from '@/hooks/useSupplierApi';
import { useDeptApi } from '@/hooks/useDeptApi';
import { useAdminDashboardApi } from '@/hooks/useAdminDashboardApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  FileCheck, 
  Bell, 
  TrendingUp, 
  Users, 
  Building2, 
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
  XCircle,
  ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';

// 供应商工作台
function SupplierDashboard() {
  const api = useSupplierApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    productCount: number;
    approvedQualifications: number;
    pendingQualifications: number;
    pendingReports: number;
    supplierStatus: string;
  } | null>(null);
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    content: string;
    published_at: string;
  }>>([]);
  const [recentProducts, setRecentProducts] = useState<Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    created_at: string;
  }>>([]);
  const [recentAudits, setRecentAudits] = useState<Array<{
    id: string;
    audit_type: string;
    target_table: string;
    status: string;
    review_comment: string;
    created_at: string;
    reviewed_at: string;
  }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, announcementsData, productsData, auditsData] = await Promise.all([
        api.getDashboardStats(),
        api.getAnnouncements(5),
        api.getRecentProducts(10),
        api.getRecentAudits(10),
      ]);
      setStats(statsData);
      setAnnouncements(announcementsData || []);
      setRecentProducts(productsData || []);
      setRecentAudits(auditsData || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '加载失败',
        description: err.message || '无法加载工作台数据',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600">已通过</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">待审核</Badge>;
      case 'rejected':
        return <Badge variant="destructive">已拒绝</Badge>;
      case 'suspended':
        return <Badge variant="secondary">已暂停</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAuditTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      registration: '注册审核',
      qualification: '资质审核',
      product: '产品审核',
      info_change: '信息变更',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">供应商工作台</h1>
          <p className="text-muted-foreground">欢迎回来，这是您的业务概览</p>
        </div>
        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* 公告和审核记录骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border-b pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        {/* 产品表格骨架 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-28" />
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
      <div>
        <h1 className="text-2xl font-bold">供应商工作台</h1>
        <p className="text-muted-foreground">欢迎回来，这是您的业务概览</p>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">产品数量</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.productCount || 0}</div>
            <p className="text-xs text-muted-foreground">已发布产品</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">有效资质</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedQualifications || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingQualifications ? `${stats.pendingQualifications}项待审核` : '全部已审核'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待填报表</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReports || 0}</div>
            <p className="text-xs text-muted-foreground">需要填写</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">账户状态</CardTitle>
            {stats?.supplierStatus === 'approved' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : stats?.supplierStatus === 'pending' ? (
              <Clock className="h-4 w-4 text-yellow-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            {getStatusBadge(stats?.supplierStatus || 'pending')}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 公告通知 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                最新公告
              </CardTitle>
              <CardDescription>平台发布的最新通知</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/announcements">
                更多 <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无公告
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map(announcement => (
                  <div key={announcement.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(announcement.published_at), 'MM-dd')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近审核结果 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              最近审核结果
            </CardTitle>
            <CardDescription>您提交的审核记录</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAudits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无审核记录
              </div>
            ) : (
              <div className="space-y-3">
                {recentAudits.slice(0, 5).map(audit => (
                  <div key={audit.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      {audit.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : audit.status === 'rejected' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{getAuditTypeLabel(audit.audit_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(audit.created_at), 'yyyy-MM-dd')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(audit.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近产品提交 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              最近产品提交
            </CardTitle>
            <CardDescription>最近10条产品记录</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/supplier/products">
              管理产品 <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无产品记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">产品名称</th>
                    <th className="text-left py-2 font-medium">产品编码</th>
                    <th className="text-left py-2 font-medium">状态</th>
                    <th className="text-left py-2 font-medium">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProducts.map(product => (
                    <tr key={product.id} className="border-b last:border-0">
                      <td className="py-2">{product.name}</td>
                      <td className="py-2">{product.code || '-'}</td>
                      <td className="py-2">
                        <Badge variant="outline">{product.status || 'active'}</Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {format(new Date(product.created_at), 'yyyy-MM-dd HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 部门工作台
function DepartmentDashboard() {
  const api = useDeptApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    enabledSuppliers: number;
    availableSuppliers: number;
    totalProducts: number;
    totalApprovedSuppliers: number;
  } | null>(null);
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    content: string;
    published_at: string;
  }>>([]);
  const [recentSuppliers, setRecentSuppliers] = useState<Array<{
    id: string;
    created_at: string;
    supplier: {
      id: string;
      company_name: string;
      supplier_type: string;
      main_products: string;
    };
  }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, announcementsData, recentData] = await Promise.all([
        api.getDashboardStats(),
        api.getAnnouncements(5),
        api.getRecentEnabledSuppliers(5),
      ]);
      setStats(statsData);
      setAnnouncements(announcementsData || []);
      setRecentSuppliers(recentData || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '加载失败',
        description: err.message || '无法加载工作台数据',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSupplierTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      enterprise: '企业',
      individual: '个人',
      overseas: '海外',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">部门工作台</h1>
          <p className="text-muted-foreground">管理您部门的供应商资源</p>
        </div>
        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* 公告和供应商列表骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border-b pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">部门工作台</h1>
        <p className="text-muted-foreground">管理您部门的供应商资源</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">在用供应商</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.enabledSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">当前启用</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">可用供应商</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.availableSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">可启用</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">全部供应商</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalApprovedSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">已审核通过</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">产品总数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">可选产品</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 公告通知 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                最新公告
              </CardTitle>
              <CardDescription>平台发布的最新通知</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/announcements">
                更多 <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无公告
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map(announcement => (
                  <div key={announcement.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(announcement.published_at), 'MM-dd')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近启用的供应商 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                最近启用供应商
              </CardTitle>
              <CardDescription>您最近启用的供应商</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dept/suppliers">
                管理 <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentSuppliers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无启用的供应商
              </div>
            ) : (
              <div className="space-y-3">
                {recentSuppliers.map(item => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{item.supplier?.company_name || '未知供应商'}</p>
                      <p className="text-xs text-muted-foreground">
                        {getSupplierTypeLabel(item.supplier?.supplier_type || '')} · {item.supplier?.main_products || '暂无主营产品'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), 'MM-dd')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 管理员工作台
function AdminDashboard() {
  const api = useAdminDashboardApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    supplierStats: { total: number; pending: number; approved: number; rejected: number; suspended: number };
    userStats: { total: number; admins: number; departments: number; suppliers: number };
    productStats: { total: number; active: number; suspended: number };
    qualificationStats: { total: number; pending: number; approved: number; expiringSoon: number; expired: number };
    departmentStats: { total: number; active: number };
    pendingTasks: { supplierAudit: number; qualificationAudit: number; expiringQualifications: number };
  } | null>(null);
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    content: string;
    published_at: string;
  }>>([]);
  const [recentAudits, setRecentAudits] = useState<Array<{
    id: string;
    audit_type: string;
    target_table: string;
    status: string;
    review_comment: string;
    created_at: string;
    reviewed_at: string;
  }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, announcementsData, auditsData] = await Promise.all([
        api.getDashboardStats(),
        api.getAnnouncements(5),
        api.getRecentAudits(5),
      ]);
      setStats(statsData);
      setAnnouncements(announcementsData || []);
      setRecentAudits(auditsData || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '加载失败',
        description: err.message || '无法加载工作台数据',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600">已通过</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">待审核</Badge>;
      case 'rejected':
        return <Badge variant="destructive">已拒绝</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAuditTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      registration: '注册审核',
      qualification: '资质审核',
      product: '产品审核',
      info_change: '信息变更',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">管理员工作台</h1>
          <p className="text-muted-foreground">平台运营数据概览</p>
        </div>
        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* 待办任务骨架 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* 公告和审核记录骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border-b pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalPending = (stats?.pendingTasks?.supplierAudit || 0) + 
                       (stats?.pendingTasks?.qualificationAudit || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理员工作台</h1>
        <p className="text-muted-foreground">平台运营数据概览</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总供应商数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.supplierStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              已通过 {stats?.supplierStats?.approved || 0} · 待审核 {stats?.supplierStats?.pending || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待审核任务</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending}</div>
            <p className="text-xs text-muted-foreground">需要处理</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">用户账号</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.userStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              部门 {stats?.userStats?.departments || 0} · 管理员 {stats?.userStats?.admins || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">产品总数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.productStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              上架 {stats?.productStats?.active || 0} · 下架 {stats?.productStats?.suspended || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 待办事项卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={stats?.pendingTasks?.supplierAudit ? 'border-yellow-200 bg-yellow-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              供应商审核
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.pendingTasks?.supplierAudit || 0}</div>
            <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto" asChild>
              <Link to="/admin/audit">去审核 <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={stats?.pendingTasks?.qualificationAudit ? 'border-yellow-200 bg-yellow-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              资质审核
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.pendingTasks?.qualificationAudit || 0}</div>
            <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto" asChild>
              <Link to="/admin/qualification-audit">去审核 <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={stats?.pendingTasks?.expiringQualifications ? 'border-orange-200 bg-orange-50/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              即将过期资质
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.pendingTasks?.expiringQualifications || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">30天内过期</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 公告通知 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                最新公告
              </CardTitle>
              <CardDescription>平台发布的通知</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无公告
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map(announcement => (
                  <div key={announcement.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(announcement.published_at), 'MM-dd')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近审核记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              最近审核记录
            </CardTitle>
            <CardDescription>平台审核动态</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAudits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无审核记录
              </div>
            ) : (
              <div className="space-y-3">
                {recentAudits.map(audit => (
                  <div key={audit.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      {audit.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : audit.status === 'rejected' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{getAuditTypeLabel(audit.audit_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(audit.created_at), 'yyyy-MM-dd HH:mm')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(audit.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentRole } = useAuth();

  switch (currentRole) {
    case 'supplier':
      return <SupplierDashboard />;
    case 'department':
      return <DepartmentDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <SupplierDashboard />;
  }
}
