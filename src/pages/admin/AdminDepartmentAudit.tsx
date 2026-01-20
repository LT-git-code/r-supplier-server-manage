import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
  RefreshCw,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

interface DepartmentRegistration {
  id: string;
  user_id: string;
  department_id: string;
  full_name: string | null;
  phone: string | null;
  position: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  department?: {
    name: string;
    code: string | null;
  };
  profile?: {
    email: string | null;
  };
}

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function AdminDepartmentAudit() {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<DepartmentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<DepartmentRegistration | null>(null);

  // 驳回弹窗
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-audit', {
        body: { action: 'list_department_registrations', status: activeTab === 'all' ? 'all' : activeTab },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setRegistrations(data.registrations || []);
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
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleViewDetail = (registration: DepartmentRegistration) => {
    setSelectedRegistration(registration);
    setDetailOpen(true);
  };

  const handleApprove = async (registrationId: string) => {
    if (!confirm('确定要审核通过此部门用户申请吗？')) return;

    try {
      setProcessing(true);
      const { error, data } = await supabase.functions.invoke('admin-audit', {
        body: { action: 'approve_department_registration', registrationId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: '审核通过成功' });
      setDetailOpen(false);
      fetchRegistrations();
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
    if (!selectedRegistration || !rejectReason.trim()) {
      toast({ variant: 'destructive', title: '请填写驳回原因' });
      return;
    }

    try {
      setProcessing(true);
      const { error, data } = await supabase.functions.invoke('admin-audit', {
        body: { 
          action: 'reject_department_registration', 
          registrationId: selectedRegistration.id, 
          reason: rejectReason 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: '已驳回' });
      setRejectDialogOpen(false);
      setRejectReason('');
      setDetailOpen(false);
      fetchRegistrations();
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

  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">部门用户审核</h1>
          <p className="text-muted-foreground">审核部门用户的加入申请</p>
        </div>
        <Button variant="outline" onClick={fetchRegistrations} disabled={loading}>
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
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无数据</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>申请人</TableHead>
                        <TableHead>申请部门</TableHead>
                        <TableHead>联系方式</TableHead>
                        <TableHead>职位</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead className="w-24">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.map(registration => (
                        <TableRow key={registration.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{registration.full_name || '未填写'}</div>
                              <div className="text-sm text-muted-foreground">
                                {registration.profile?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {registration.department?.name || '未知部门'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{registration.phone || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{registration.position || '-'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[registration.status]}>
                              {statusLabels[registration.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(registration.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(registration)}
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
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>部门用户申请详情</SheetTitle>
            <SheetDescription>
              {selectedRegistration?.full_name || '未填写姓名'}
            </SheetDescription>
          </SheetHeader>

          {selectedRegistration && (
            <div className="mt-6 space-y-6">
              {/* 状态标签 */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[selectedRegistration.status]}>
                  {statusLabels[selectedRegistration.status]}
                </Badge>
              </div>

              {/* 驳回原因 */}
              {selectedRegistration.rejection_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-medium">驳回原因：</p>
                  <p className="text-sm text-destructive mt-1">{selectedRegistration.rejection_reason}</p>
                </div>
              )}

              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  申请人信息
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">姓名：</span>
                    <span>{selectedRegistration.full_name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">邮箱：</span>
                    <span>{selectedRegistration.profile?.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">电话：</span>
                    <span>{selectedRegistration.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">职位：</span>
                    <span>{selectedRegistration.position || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">申请部门：</span>
                    <span>{selectedRegistration.department?.name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">申请时间：</span>
                    <span>{new Date(selectedRegistration.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              {selectedRegistration.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    驳回
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleApprove(selectedRegistration.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    通过
                  </Button>
                </div>
              )}
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
              请填写驳回原因，将通知申请人
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="请输入驳回原因..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
