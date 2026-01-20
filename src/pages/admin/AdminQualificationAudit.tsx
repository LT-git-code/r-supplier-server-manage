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
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Building2,
  FileCheck,
  RefreshCw,
  AlertCircle,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

interface Qualification {
  id: string;
  name: string;
  certificate_number: string | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expire_date: string | null;
  file_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  supplier: {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    supplier_type: string;
  } | null;
  qualification_type: {
    id: string;
    name: string;
    code: string | null;
  } | null;
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

export default function AdminQualificationAudit() {
  const { toast } = useToast();
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedQualification, setSelectedQualification] = useState<Qualification | null>(null);

  // 驳回弹窗
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchQualifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'list_qualifications', status: activeTab === 'all' ? null : activeTab },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setQualifications(data.qualifications || []);
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
    fetchQualifications();
  }, [fetchQualifications]);

  const handleApprove = async (qualificationId: string) => {
    if (!confirm('确定要审核通过此资质吗？')) return;

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'approve_qualification', qualificationId },
      });

      if (error) throw error;

      toast({ title: '审核通过成功' });
      setDetailOpen(false);
      fetchQualifications();
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
    if (!selectedQualification || !rejectReason.trim()) {
      toast({ variant: 'destructive', title: '请填写驳回原因' });
      return;
    }

    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'reject_qualification', qualificationId: selectedQualification.id, reason: rejectReason },
      });

      if (error) throw error;

      toast({ title: '已驳回' });
      setRejectDialogOpen(false);
      setRejectReason('');
      setDetailOpen(false);
      fetchQualifications();
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

  const getSupplierName = (qualification: Qualification) => {
    return qualification.supplier?.company_name || qualification.supplier?.contact_name || '未知供应商';
  };

  const pendingCount = qualifications.filter(q => q.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">资质审核</h1>
          <p className="text-muted-foreground">审核供应商提交的资质证书</p>
        </div>
        <Button variant="outline" onClick={fetchQualifications} disabled={loading}>
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
              ) : qualifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无数据</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>资质名称</TableHead>
                        <TableHead>供应商</TableHead>
                        <TableHead>资质类型</TableHead>
                        <TableHead>证书编号</TableHead>
                        <TableHead>有效期</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>提交时间</TableHead>
                        <TableHead className="w-24">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualifications.map(qualification => (
                        <TableRow key={qualification.id}>
                          <TableCell className="font-medium">
                            {qualification.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{getSupplierName(qualification)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {qualification.qualification_type?.name || '-'}
                          </TableCell>
                          <TableCell>
                            {qualification.certificate_number || '-'}
                          </TableCell>
                          <TableCell>
                            {qualification.expire_date
                              ? format(new Date(qualification.expire_date), 'yyyy-MM-dd')
                              : '长期有效'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[qualification.status]}>
                              {statusLabels[qualification.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(qualification.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedQualification(qualification);
                                setDetailOpen(true);
                              }}
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
            <SheetTitle>资质详情</SheetTitle>
            <SheetDescription>
              {selectedQualification?.name}
            </SheetDescription>
          </SheetHeader>

          {selectedQualification && (
            <div className="mt-6 space-y-6">
              {/* 状态标签 */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[selectedQualification.status]}>
                  {statusLabels[selectedQualification.status]}
                </Badge>
              </div>

              {/* 驳回原因 */}
              {selectedQualification.rejection_reason && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-medium">驳回原因：</p>
                  <p className="text-sm text-destructive mt-1">{selectedQualification.rejection_reason}</p>
                </div>
              )}

              {/* 供应商信息 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  供应商信息
                </h4>
                <div className="text-sm">
                  <span className="text-muted-foreground">供应商名称：</span>
                  <span className="ml-1">{getSupplierName(selectedQualification)}</span>
                </div>
              </div>

              <Separator />

              {/* 资质信息 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  资质信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">资质名称：</span>
                    <span className="ml-1">{selectedQualification.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">资质类型：</span>
                    <span className="ml-1">{selectedQualification.qualification_type?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">证书编号：</span>
                    <span className="ml-1">{selectedQualification.certificate_number || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">颁发机构：</span>
                    <span className="ml-1">{selectedQualification.issuing_authority || '-'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 有效期信息 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  有效期信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">颁发日期：</span>
                    <span className="ml-1">
                      {selectedQualification.issue_date
                        ? format(new Date(selectedQualification.issue_date), 'yyyy-MM-dd')
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">有效期至：</span>
                    <span className="ml-1">
                      {selectedQualification.expire_date
                        ? format(new Date(selectedQualification.expire_date), 'yyyy-MM-dd')
                        : '长期有效'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 证书文件 */}
              {selectedQualification.file_url && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">证书文件</h4>
                    <Button variant="outline" asChild>
                      <a href={selectedQualification.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        查看证书文件
                      </a>
                    </Button>
                  </div>
                </>
              )}

              {/* 操作按钮 */}
              {selectedQualification.status === 'pending' && (
                <div className="pt-4 flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => handleApprove(selectedQualification.id)}
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
            <DialogTitle>驳回资质</DialogTitle>
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
