import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupplierApi } from '@/hooks/useSupplierApi';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  FileCheck,
  Bell,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  productCount: number;
  approvedQualifications: number;
  pendingQualifications: number;
  pendingReports: number;
  supplierStatus: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  published_at: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  status: string;
  created_at: string;
}

interface AuditRecord {
  id: string;
  audit_type: string;
  target_table: string;
  status: string;
  review_comment: string;
  created_at: string;
  reviewed_at: string;
}

export default function SupplierDashboard() {
  const api = useSupplierApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditRecord[]>([]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
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
