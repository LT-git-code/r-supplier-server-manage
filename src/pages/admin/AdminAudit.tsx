import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Package,
  RefreshCw,
  AlertCircle,
  Ban,
  RotateCcw,
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
  profiles: SupplierProfile | null;
}

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

export default function AdminAudit() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierDetail, setSupplierDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 驳回弹窗
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-audit', {
        body: { action: 'list_pending', status: activeTab === 'all' ? 'all' : activeTab },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSuppliers(data.suppliers || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const fetchSupplierDetail = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailOpen(true);
    setLoadingDetail(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-audit', {
        body: { action: 'get_supplier_detail', supplierId: supplier.id },
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

  const handleApprove = async (supplierId: string) => {
    if (!confirm('确定要审核通过此供应商吗？')) return;

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-audit', {
        body: { action: 'approve', supplierId },
      });

      if (error) throw error;

      toast({ title: '审核通过成功' });
      setDetailOpen(false);
      fetchSuppliers();
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

  const handleReject = async () => {
    if (!selectedSupplier || !rejectReason.trim()) {
      toast({ variant: 'destructive', title: '请填写驳回原因' });
      return;
    }

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-audit', {
        body: { action: 'reject', supplierId: selectedSupplier.id, reason: rejectReason },
      });

      if (error) throw error;

      toast({ title: '已驳回' });
      setRejectDialogOpen(false);
      setRejectReason('');
      setDetailOpen(false);
      fetchSuppliers();
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

  const handleSuspend = async (supplierId: string) => {
    if (!confirm('确定要暂停此供应商吗？')) return;

    try {
      const { error } = await supabase.functions.invoke('admin-audit', {
        body: { action: 'suspend', supplierId },
      });

      if (error) throw error;

      toast({ title: '已暂停' });
      setDetailOpen(false);
      fetchSuppliers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    }
  };

  const handleRestore = async (supplierId: string) => {
    if (!confirm('确定要恢复此供应商吗？')) return;

    try {
      const { error } = await supabase.functions.invoke('admin-audit', {
        body: { action: 'restore', supplierId },
      });

      if (error) throw error;

      toast({ title: '已恢复' });
      setDetailOpen(false);
      fetchSuppliers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    }
  };

  const pendingCount = suppliers.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">供应商审核</h1>
          <p className="text-muted-foreground">审核供应商入驻申请</p>
        </div>
        <Button variant="outline" onClick={fetchSuppliers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            待审核
            {pendingCount > 0 && (
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-warning text-warning-foreground">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">已通过</TabsTrigger>
          <TabsTrigger value="rejected">已驳回</TabsTrigger>
          <TabsTrigger value="suspended">已暂停</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>供应商名称</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>联系人</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead className="w-24">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map(supplier => (
                        <TableRow key={supplier.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {supplier.company_name || supplier.contact_name || '未填写'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {supplier.profiles?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{typeLabels[supplier.supplier_type]}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{supplier.contact_name || '-'}</div>
                              <div className="text-muted-foreground">{supplier.contact_phone || '-'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[supplier.status]}>
                              {statusLabels[supplier.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(supplier.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchSupplierDetail(supplier)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              查看
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              {/* 状态标签 */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[selectedSupplier.status]}>
                  {statusLabels[selectedSupplier.status]}
                </Badge>
                <Badge variant="outline">{typeLabels[selectedSupplier.supplier_type]}</Badge>
              </div>

              {/* 驳回原因 */}
              {selectedSupplier.rejection_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-medium">驳回原因：</p>
                  <p className="text-sm text-destructive mt-1">{selectedSupplier.rejection_reason}</p>
                </div>
              )}

              {/* 基本信息 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  基本信息
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
                        .filter(Boolean)
                        .join(' ') || '-'}
                    </span>
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
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">开户银行：</span>
                    <span className="ml-1">{selectedSupplier.bank_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">银行账号：</span>
                    <span className="ml-1">{selectedSupplier.bank_account || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">账户名称：</span>
                    <span className="ml-1">{selectedSupplier.bank_account_name || '-'}</span>
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
                    <span className="text-muted-foreground">主营产品：</span>
                    <span className="ml-1">{selectedSupplier.main_products || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">生产能力：</span>
                    <span className="ml-1">{selectedSupplier.production_capacity || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">年营业额：</span>
                    <span className="ml-1">
                      {selectedSupplier.annual_revenue 
                        ? `${selectedSupplier.annual_revenue.toLocaleString()} 万元` 
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">员工人数：</span>
                    <span className="ml-1">
                      {selectedSupplier.employee_count ? `${selectedSupplier.employee_count} 人` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="pt-4 flex gap-2">
                {selectedSupplier.status === 'pending' && (
                  <>
                    <Button 
                      className="flex-1" 
                      onClick={() => handleApprove(selectedSupplier.id)}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      通过
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={processing}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      驳回
                    </Button>
                  </>
                )}
                {selectedSupplier.status === 'approved' && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleSuspend(selectedSupplier.id)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    暂停
                  </Button>
                )}
                {(selectedSupplier.status === 'rejected' || selectedSupplier.status === 'suspended') && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleRestore(selectedSupplier.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    恢复
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 驳回弹窗 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回申请</DialogTitle>
            <DialogDescription>
              请填写驳回原因，供应商将收到通知
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">驳回原因 *</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入驳回原因..."
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
