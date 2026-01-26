import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AttachmentUpload } from '@/components/supplier/AttachmentUpload';
import { 
  Loader2, 
  Search,
  Eye,
  Edit,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Package,
  RefreshCw,
  AlertCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Users,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  ShieldOff,
  Star,
  StarOff,
  MoreHorizontal,
  Library,
  Crown,
  AlertTriangle,
  Paperclip,
  Download,
} from 'lucide-react';

interface SupplierProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface Supplier {
  id: string;
  user_id: string;
  supplier_type: 'enterprise' | 'overseas' | 'individual';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  company_name: string | null;
  unified_social_credit_code: string | null;
  legal_representative: string | null;
  registered_capital: number | null;
  establishment_date: string | null;
  business_scope: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  province: string | null;
  city: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  id_card_number: string | null;
  business_license_url: string | null;
  country: string | null;
  registration_number: string | null;
  production_capacity: string | null;
  main_products: string | null;
  annual_revenue: number | null;
  employee_count: number | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: SupplierProfile | null;
  is_blacklisted: boolean;
  is_recommended: boolean;
  has_objection: boolean;
  blacklisted_at: string | null;
  blacklist_reason: string | null;
  objection_reason: string | null;
}

interface Statistics {
  total: number;
  approved: number;
  pending: number;
  suspended: number;
  rejected: number;
  blacklisted: number;
  recommended: number;
  byType: {
    enterprise: number;
    overseas: number;
    individual: number;
  };
}

type LibraryTab = 'all' | 'premium' | 'blacklist';

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  suspended: '已暂停',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  suspended: 'bg-muted text-muted-foreground border-muted',
};

const typeLabels: Record<string, string> = {
  enterprise: '企业',
  overseas: '海外企业',
  individual: '个人',
};

const typeIcons: Record<string, any> = {
  enterprise: Building2,
  overseas: Globe,
  individual: User,
};

const TAB_CONFIG: Record<LibraryTab, { label: string; icon: React.ReactNode; description: string }> = {
  all: { 
    label: '总库', 
    icon: <Library className="h-4 w-4" />,
    description: '展示所有供应商'
  },
  premium: { 
    label: '优质库', 
    icon: <Crown className="h-4 w-4" />,
    description: '展示所有标签为优质供应商的供应商'
  },
  blacklist: { 
    label: '拉黑异议库', 
    icon: <ShieldOff className="h-4 w-4" />,
    description: '展示所有被拉黑和有异议标签的供应商'
  },
};

export default function AdminSuppliers() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;
  
  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierDetail, setSupplierDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 编辑对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Supplier>>({});
  const [processing, setProcessing] = useState(false);

  // 状态变更对话框
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<'suspend' | 'restore'>('suspend');
  const [statusReason, setStatusReason] = useState('');

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 拉黑对话框
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');

  // 异议对话框
  const [objectionDialogOpen, setObjectionDialogOpen] = useState(false);
  const [objectionReason, setObjectionReason] = useState('');

  const fetchStatistics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-suppliers', {
        body: { action: 'get_statistics' },
      });
      if (error) throw error;
      setStatistics(data);
    } catch (error: any) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      
      // 根据tab设置筛选条件
      let blacklistFilter = 'all';
      let recommendedFilter = 'all';
      let objectionFilter = 'all';
      
      if (activeTab === 'premium') {
        recommendedFilter = 'recommended';
      } else if (activeTab === 'blacklist') {
        // 拉黑异议库：筛选拉黑或异议的供应商
        blacklistFilter = 'blacklisted_or_objection';
      }
      
      const { data, error } = await supabase.functions.invoke('admin-suppliers', {
        body: { 
          action: 'list', 
          search,
          status: statusFilter,
          type: 'all',
          blacklistFilter,
          recommendedFilter,
          page,
          pageSize,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSuppliers(data.suppliers || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, activeTab, page, pageSize, toast]);

  useEffect(() => {
    fetchSuppliers();
    fetchStatistics();
  }, [fetchSuppliers]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as LibraryTab);
    setPage(1);
  };

  const fetchSupplierDetail = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailOpen(true);
    setLoadingDetail(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-suppliers', {
        body: { action: 'get_detail', supplierId: supplier.id },
      });

      if (error) throw error;
      setSupplierDetail(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '加载详情失败',
        description: error.message,
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setEditData({
      company_name: supplier.company_name,
      contact_name: supplier.contact_name,
      contact_phone: supplier.contact_phone,
      contact_email: supplier.contact_email,
      address: supplier.address,
      province: supplier.province,
      city: supplier.city,
      business_scope: supplier.business_scope,
      main_products: supplier.main_products,
      production_capacity: supplier.production_capacity,
      employee_count: supplier.employee_count,
      annual_revenue: supplier.annual_revenue,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSupplier) return;

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { 
          action: 'update', 
          supplierId: selectedSupplier.id,
          data: editData,
        },
      });

      if (error) throw error;

      toast({ title: '保存成功' });
      setEditDialogOpen(false);
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedSupplier) return;

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { 
          action: 'update_status', 
          supplierId: selectedSupplier.id,
          status: statusAction === 'suspend' ? 'suspended' : 'approved',
          reason: statusReason,
        },
      });

      if (error) throw error;

      toast({ title: statusAction === 'suspend' ? '已暂停供应商' : '已恢复供应商' });
      setStatusDialogOpen(false);
      setStatusReason('');
      setDetailOpen(false);
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { action: 'delete', supplierId: selectedSupplier.id },
      });

      if (error) throw error;

      toast({ title: '已删除供应商' });
      setDeleteDialogOpen(false);
      setDetailOpen(false);
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  // 拉黑供应商
  const handleBlacklist = async () => {
    if (!selectedSupplier) return;

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { 
          action: 'blacklist', 
          supplierId: selectedSupplier.id,
          reason: blacklistReason,
        },
      });

      if (error) throw error;

      toast({ title: '已拉黑供应商' });
      setBlacklistDialogOpen(false);
      setBlacklistReason('');
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  // 解除拉黑
  const handleUnblacklist = async (supplier: Supplier) => {
    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { action: 'unblacklist', supplierId: supplier.id },
      });

      if (error) throw error;

      toast({ title: '已解除拉黑' });
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  // 推荐供应商
  const handleRecommend = async (supplier: Supplier) => {
    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { action: 'recommend', supplierId: supplier.id },
      });

      if (error) throw error;

      toast({ title: '已推荐供应商' });
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  // 取消推荐
  const handleUnrecommend = async (supplier: Supplier) => {
    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { action: 'unrecommend', supplierId: supplier.id },
      });

      if (error) throw error;

      toast({ title: '已取消推荐' });
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  // 添加异议
  const handleAddObjection = async () => {
    if (!selectedSupplier) return;

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { 
          action: 'add_objection', 
          supplierId: selectedSupplier.id,
          reason: objectionReason,
        },
      });

      if (error) throw error;

      toast({ title: '已标记异议' });
      setObjectionDialogOpen(false);
      setObjectionReason('');
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  // 移除异议
  const handleRemoveObjection = async (supplier: Supplier) => {
    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-suppliers', {
        body: { action: 'remove_objection', supplierId: supplier.id },
      });

      if (error) throw error;

      toast({ title: '已移除异议' });
      fetchSuppliers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">供应商管理</h1>
          <p className="text-muted-foreground">管理所有已审核通过的供应商</p>
        </div>
        <Button variant="outline" onClick={() => { fetchSuppliers(); fetchStatistics(); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 - 只显示4个：总供应商数、海外供应商数、国内供应商数、个人供应商数 */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总供应商数</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Globe className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">海外供应商数</p>
                  <p className="text-2xl font-bold">{statistics.byType.overseas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">国内供应商数</p>
                  <p className="text-2xl font-bold">{statistics.byType.enterprise}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <User className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">个人供应商数</p>
                  <p className="text-2xl font-bold">{statistics.byType.individual}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          {(Object.keys(TAB_CONFIG) as LibraryTab[]).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="flex items-center gap-2">
              {TAB_CONFIG[tab].icon}
              <span>{TAB_CONFIG[tab].label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              {TAB_CONFIG[activeTab].description}
              <span className="ml-2 font-medium text-foreground">
                共 {total} 个供应商
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索公司名称、联系人、统一信用代码..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="suspended">已暂停</SelectItem>
                <SelectItem value="rejected">已驳回</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 供应商列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无数据</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>供应商名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>联系人</TableHead>
                      <TableHead>联系方式</TableHead>
                      <TableHead>地区</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead className="w-32 text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map(supplier => {
                      const TypeIcon = typeIcons[supplier.supplier_type];
                      return (
                        <TableRow key={supplier.id} className={supplier.is_blacklisted ? 'bg-destructive/5' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <div className="font-medium flex items-center gap-1.5 flex-wrap">
                                  <span>{supplier.company_name || supplier.contact_name || '未填写'}</span>
                                  {supplier.is_recommended && (
                                    <span className="text-xs text-amber-600 font-normal">优质</span>
                                  )}
                                  {supplier.is_blacklisted && (
                                    <span className="text-xs text-destructive font-normal">拉黑</span>
                                  )}
                                  {supplier.has_objection && (
                                    <span className="text-xs text-orange-500 font-normal">异议</span>
                                  )}
                                </div>
                                {supplier.unified_social_credit_code && (
                                  <div className="text-xs text-muted-foreground">
                                    {supplier.unified_social_credit_code}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{typeLabels[supplier.supplier_type]}</Badge>
                          </TableCell>
                          <TableCell>{supplier.contact_name || '-'}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{supplier.contact_phone || '-'}</div>
                              <div className="text-muted-foreground text-xs">{supplier.contact_email || ''}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {supplier.province && supplier.city 
                              ? `${supplier.province} ${supplier.city}`
                              : supplier.country || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[supplier.status]}>
                              {statusLabels[supplier.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(supplier.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={processing}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => fetchSupplierDetail(supplier)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {supplier.is_recommended ? (
                                  <DropdownMenuItem onClick={() => handleUnrecommend(supplier)}>
                                    <StarOff className="h-4 w-4 mr-2" />
                                    取消推荐
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleRecommend(supplier)}>
                                    <Star className="h-4 w-4 mr-2" />
                                    推荐
                                  </DropdownMenuItem>
                                )}
                                {supplier.is_blacklisted ? (
                                  <DropdownMenuItem onClick={() => handleUnblacklist(supplier)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    解除拉黑
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedSupplier(supplier);
                                      setBlacklistDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    拉黑
                                  </DropdownMenuItem>
                                )}
                                {supplier.has_objection ? (
                                  <DropdownMenuItem onClick={() => handleRemoveObjection(supplier)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    移除异议
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedSupplier(supplier);
                                      setObjectionDialogOpen(true);
                                    }}
                                    className="text-orange-500"
                                  >
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    标记异议
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    共 {total} 条，第 {page} / {totalPages} 页
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      下一页
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 详情抽屉 */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>供应商详情</SheetTitle>
            <SheetDescription>
              {selectedSupplier?.company_name || selectedSupplier?.contact_name}
            </SheetDescription>
          </SheetHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedSupplier && (
            <div className="mt-6 space-y-6">
              {/* 状态和标签 */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={statusColors[selectedSupplier.status]}>
                  {statusLabels[selectedSupplier.status]}
                </Badge>
                <Badge variant="outline">{typeLabels[selectedSupplier.supplier_type]}</Badge>
                {selectedSupplier.is_recommended && (
                  <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
                    <Star className="h-3 w-3" />
                    优质
                  </Badge>
                )}
                {selectedSupplier.is_blacklisted && (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldOff className="h-3 w-3" />
                    拉黑
                  </Badge>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2">
                {selectedSupplier.is_recommended ? (
                  <Button variant="outline" size="sm" onClick={() => handleUnrecommend(selectedSupplier)}>
                    <StarOff className="h-4 w-4 mr-1" />
                    取消推荐
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleRecommend(selectedSupplier)}>
                    <Star className="h-4 w-4 mr-1" />
                    推荐
                  </Button>
                )}
                {selectedSupplier.is_blacklisted ? (
                  <Button variant="outline" size="sm" onClick={() => handleUnblacklist(selectedSupplier)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    解除拉黑
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setBlacklistDialogOpen(true)}
                  >
                    <ShieldOff className="h-4 w-4 mr-1" />
                    拉黑
                  </Button>
                )}
                {selectedSupplier.status === 'approved' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusAction('suspend');
                      setStatusDialogOpen(true);
                    }}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    暂停
                  </Button>
                )}
                {selectedSupplier.status === 'suspended' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusAction('restore');
                      setStatusDialogOpen(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    恢复
                  </Button>
                )}
              </div>

              <Separator />

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="basic">基本信息</TabsTrigger>
                  <TabsTrigger value="qualifications">资质证书</TabsTrigger>
                  <TabsTrigger value="products">产品</TabsTrigger>
                  <TabsTrigger value="attachments">附件</TabsTrigger>
                  <TabsTrigger value="departments">关联部门</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  {/* 基本信息 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      企业信息
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedSupplier.supplier_type === 'enterprise' && (
                        <>
                          <div>
                            <span className="text-muted-foreground">企业名称：</span>
                            <span className="ml-1">{selectedSupplier.company_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">统一社会信用代码：</span>
                            <span className="ml-1">{selectedSupplier.unified_social_credit_code || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">法定代表人：</span>
                            <span className="ml-1">{selectedSupplier.legal_representative || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">注册资本：</span>
                            <span className="ml-1">
                              {selectedSupplier.registered_capital 
                                ? `${selectedSupplier.registered_capital.toLocaleString()} 万元` 
                                : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">成立日期：</span>
                            <span className="ml-1">
                              {selectedSupplier.establishment_date 
                                ? new Date(selectedSupplier.establishment_date).toLocaleDateString('zh-CN')
                                : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">员工人数：</span>
                            <span className="ml-1">{selectedSupplier.employee_count || '-'}</span>
                          </div>
                        </>
                      )}
                      {selectedSupplier.supplier_type === 'individual' && (
                        <>
                          <div>
                            <span className="text-muted-foreground">姓名：</span>
                            <span className="ml-1">{selectedSupplier.contact_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">身份证号：</span>
                            <span className="ml-1">
                              {selectedSupplier.id_card_number 
                                ? selectedSupplier.id_card_number.replace(/^(.{6})(.+)(.{4})$/, '$1****$3')
                                : '-'}
                            </span>
                          </div>
                        </>
                      )}
                      {selectedSupplier.supplier_type === 'overseas' && (
                        <>
                          <div>
                            <span className="text-muted-foreground">企业名称：</span>
                            <span className="ml-1">{selectedSupplier.company_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">国家/地区：</span>
                            <span className="ml-1">{selectedSupplier.country || '-'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">注册号：</span>
                            <span className="ml-1">{selectedSupplier.registration_number || '-'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* 联系信息 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      联系信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedSupplier.contact_name || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedSupplier.contact_phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedSupplier.contact_email || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {[selectedSupplier.province, selectedSupplier.city, selectedSupplier.address]
                            .filter(Boolean).join(' ') || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 经营信息 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      经营信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">经营范围：</span>
                        <p className="mt-1">{selectedSupplier.business_scope || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">主要产品：</span>
                        <p className="mt-1">{selectedSupplier.main_products || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">产能说明：</span>
                        <p className="mt-1">{selectedSupplier.production_capacity || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 银行信息 */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      银行信息
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">开户银行：</span>
                        <span className="ml-1">{selectedSupplier.bank_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">账户名称：</span>
                        <span className="ml-1">{selectedSupplier.bank_account_name || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">银行账号：</span>
                        <span className="ml-1">{selectedSupplier.bank_account || '-'}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="qualifications" className="mt-4">
                  {supplierDetail?.qualifications?.length > 0 ? (
                    <div className="space-y-3">
                      {supplierDetail.qualifications.map((q: any) => (
                        <div key={q.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{q.name}</span>
                            <Badge variant="outline" className={statusColors[q.status] || ''}>
                              {statusLabels[q.status] || q.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-2 grid grid-cols-2 gap-2">
                            <div>证书编号：{q.certificate_number || '-'}</div>
                            <div>发证机关：{q.issuing_authority || '-'}</div>
                            <div>发证日期：{q.issue_date || '-'}</div>
                            <div>有效期至：{q.expire_date || '-'}</div>
                          </div>
                          {q.file_url && (
                            <div className="mt-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(q.file_url, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                下载附件
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">暂无资质证书</p>
                  )}
                </TabsContent>

                <TabsContent value="products" className="mt-4">
                  {supplierDetail?.products?.length > 0 ? (
                    <div className="space-y-3">
                      {supplierDetail.products.map((p: any) => (
                        <div key={p.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{p.name}</span>
                            <Badge variant="outline">{p.status === 'active' ? '在售' : '停售'}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            <div>产品编码：{p.code || '-'}</div>
                            <div>单价：{p.price ? `¥${p.price}` : '-'}</div>
                            <div className="mt-1">{p.description || '-'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">暂无产品</p>
                  )}
                </TabsContent>

                <TabsContent value="attachments" className="mt-4 space-y-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      生产能力附件
                    </h4>
                    <AttachmentUpload
                      supplierId={selectedSupplier.id}
                      category="capacity"
                      title=""
                      description="设备清单、产能报告、生产线照片等"
                      readOnly
                    />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      财务状况附件
                    </h4>
                    <AttachmentUpload
                      supplierId={selectedSupplier.id}
                      category="finance"
                      title=""
                      description="财务报表、审计报告、纳税证明等"
                      readOnly
                    />
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      过往案例附件
                    </h4>
                    <AttachmentUpload
                      supplierId={selectedSupplier.id}
                      category="cases"
                      title=""
                      description="合作案例、项目经验、业绩证明等"
                      readOnly
                    />
                  </div>
                </TabsContent>

                <TabsContent value="departments" className="mt-4">
                  {supplierDetail?.departments?.length > 0 ? (
                    <div className="space-y-3">
                      {supplierDetail.departments.map((d: any) => (
                        <div key={d.id} className="p-3 border rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-medium">{d.departments?.name || '-'}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({d.departments?.code || '-'})
                            </span>
                          </div>
                          <Badge variant="outline">
                            {d.library_type === 'current' ? '在库' : d.library_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">暂未关联部门</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑供应商信息</DialogTitle>
            <DialogDescription>
              修改供应商的基本信息
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>企业/个人名称</Label>
                <Input
                  value={editData.company_name || editData.contact_name || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    company_name: e.target.value,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>联系人</Label>
                <Input
                  value={editData.contact_name || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contact_name: e.target.value,
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  value={editData.contact_phone || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contact_phone: e.target.value,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>联系邮箱</Label>
                <Input
                  type="email"
                  value={editData.contact_email || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    contact_email: e.target.value,
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>省份</Label>
                <Input
                  value={editData.province || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    province: e.target.value,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>城市</Label>
                <Input
                  value={editData.city || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    city: e.target.value,
                  }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>详细地址</Label>
              <Input
                value={editData.address || ''}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  address: e.target.value,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>经营范围</Label>
              <Textarea
                value={editData.business_scope || ''}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  business_scope: e.target.value,
                }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>主要产品</Label>
              <Textarea
                value={editData.main_products || ''}
                onChange={(e) => setEditData(prev => ({
                  ...prev,
                  main_products: e.target.value,
                }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>员工人数</Label>
                <Input
                  type="number"
                  value={editData.employee_count || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    employee_count: parseInt(e.target.value) || undefined,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>年营收（万元）</Label>
                <Input
                  type="number"
                  value={editData.annual_revenue || ''}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    annual_revenue: parseFloat(e.target.value) || undefined,
                  }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 状态变更对话框 */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction === 'suspend' ? '暂停供应商' : '恢复供应商'}
            </DialogTitle>
            <DialogDescription>
              {statusAction === 'suspend' 
                ? '暂停后供应商将无法正常使用系统功能'
                : '恢复后供应商可以正常使用系统功能'}
            </DialogDescription>
          </DialogHeader>
          
          {statusAction === 'suspend' && (
            <div className="space-y-2">
              <Label>暂停原因</Label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="请输入暂停原因..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant={statusAction === 'suspend' ? 'destructive' : 'default'}
              onClick={handleStatusChange} 
              disabled={processing}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认{statusAction === 'suspend' ? '暂停' : '恢复'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除供应商</DialogTitle>
            <DialogDescription>
              确定要删除该供应商吗？此操作将同时删除该供应商的所有相关数据（联系人、资质、产品等），且不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拉黑对话框 */}
      <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拉黑供应商</DialogTitle>
            <DialogDescription>
              拉黑后该供应商账号将无法登录系统，并会出现在拉黑名单中。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label>拉黑原因 *</Label>
            <Textarea
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
              placeholder="请输入拉黑原因..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBlacklist} 
              disabled={processing || !blacklistReason.trim()}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认拉黑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 异议对话框 */}
      <Dialog open={objectionDialogOpen} onOpenChange={setObjectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标记异议</DialogTitle>
            <DialogDescription>
              标记该供应商存在异议，将在列表中显示异议标签。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label>异议原因 *</Label>
            <Textarea
              value={objectionReason}
              onChange={(e) => setObjectionReason(e.target.value)}
              placeholder="请输入异议原因..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setObjectionDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleAddObjection} 
              disabled={processing || !objectionReason.trim()}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认标记
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
