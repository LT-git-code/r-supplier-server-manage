import { useState, useEffect } from 'react';
import { useSupplierApi } from '@/hooks/useSupplierApi';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Upload,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import CreateReportDialog from '@/components/supplier/reports/CreateReportDialog';
import PendingReportCard, { PendingReport } from '@/components/supplier/reports/PendingReportCard';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  deadline: string;
  file_url: string;
  is_active: boolean;
}

interface ReportSubmission {
  id: string;
  template_id: string;
  file_url: string;
  status: string;
  submitted_at: string;
  review_comment: string;
  reviewed_at: string;
  report_templates?: {
    id: string;
    name: string;
    deadline: string;
    description: string;
    file_url?: string;
  };
}

interface DistributedReport {
  id: string;
  template_id: string;
  file_url: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  report_templates?: {
    id: string;
    name: string;
    deadline: string;
    description: string;
    file_url?: string;
  };
}

export default function SupplierReports() {
  const api = useSupplierApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [distributedReports, setDistributedReports] = useState<DistributedReport[]>([]);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [fileUrl, setFileUrl] = useState('');

  // New report states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingReport, setCreatingReport] = useState(false);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [selectedPendingReport, setSelectedPendingReport] = useState<PendingReport | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingFileUrl, setPendingFileUrl] = useState('');

  // Distributed report upload states
  const [showDistributedUploadDialog, setShowDistributedUploadDialog] = useState(false);
  const [selectedDistributedReport, setSelectedDistributedReport] = useState<DistributedReport | null>(null);
  const [distributedFileUrl, setDistributedFileUrl] = useState('');
  const [submittingDistributed, setSubmittingDistributed] = useState(false);

  // Load pending reports from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('supplier_pending_reports');
    if (saved) {
      try {
        setPendingReports(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse pending reports:', e);
      }
    }
  }, []);

  // Save pending reports to localStorage
  useEffect(() => {
    if (pendingReports.length > 0) {
      localStorage.setItem('supplier_pending_reports', JSON.stringify(pendingReports));
    }
  }, [pendingReports]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, submissionsData, distributedData] = await Promise.all([
        api.getReportTemplates(),
        api.getReportSubmissions(),
        api.getDistributedReports(),
      ]);
      setTemplates(templatesData || []);
      setSubmissions(submissionsData || []);
      setDistributedReports(distributedData || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '加载失败',
        description: err.message || '无法加载报表数据',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setFileUrl('');
    setShowSubmitDialog(true);
  };

  const confirmSubmit = async () => {
    if (!selectedTemplate || !fileUrl) {
      toast({
        title: '请填写报表文件URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.submitReport(selectedTemplate.id, fileUrl);
      toast({ title: '提交成功', description: '报表已提交审核' });
      setShowSubmitDialog(false);
      setSelectedTemplate(null);
      setFileUrl('');
      loadData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '提交失败',
        description: err.message || '无法提交报表',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />已通过</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />待审核</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />已拒绝</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDeadlineStatus = (deadline: string) => {
    if (!deadline) return null;
    const daysUntilDeadline = differenceInDays(parseISO(deadline), new Date());
    
    if (daysUntilDeadline < 0) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />已截止</Badge>;
    } else if (daysUntilDeadline <= 3) {
      return <Badge variant="outline" className="text-red-600 border-red-600"><AlertTriangle className="h-3 w-3 mr-1" />{daysUntilDeadline}天后截止</Badge>;
    } else if (daysUntilDeadline <= 7) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">{daysUntilDeadline}天后截止</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600">{daysUntilDeadline}天后截止</Badge>;
  };

  const getTemplateSubmission = (templateId: string) => {
    return submissions.find(s => s.template_id === templateId);
  };

  // Create new report handler
  const handleCreateReport = async (data: {
    reportType: string;
    reportTypeName: string;
    deadline: string;
  }) => {
    setCreatingReport(true);
    try {
      const newReport: PendingReport = {
        id: crypto.randomUUID(),
        reportType: data.reportType,
        reportTypeName: data.reportTypeName,
        issuedAt: new Date().toISOString(),
        deadline: data.deadline,
        status: 'pending',
      };
      setPendingReports(prev => [...prev, newReport]);
      toast({ title: '创建成功', description: `已创建${data.reportTypeName}` });
      setShowCreateDialog(false);
    } catch (error) {
      toast({
        title: '创建失败',
        description: '无法创建报表',
        variant: 'destructive',
      });
    } finally {
      setCreatingReport(false);
    }
  };

  // Upload handler for pending reports
  const handlePendingUpload = (report: PendingReport) => {
    setSelectedPendingReport(report);
    setPendingFileUrl('');
    setShowUploadDialog(true);
  };

  const confirmPendingUpload = () => {
    if (!selectedPendingReport || !pendingFileUrl) {
      toast({
        title: '请填写报表文件URL',
        variant: 'destructive',
      });
      return;
    }

    setPendingReports(prev =>
      prev.map(r =>
        r.id === selectedPendingReport.id
          ? { ...r, status: 'submitted' as const, fileUrl: pendingFileUrl }
          : r
      )
    );
    toast({ title: '上传成功', description: '报表已提交' });
    setShowUploadDialog(false);
    setSelectedPendingReport(null);
    setPendingFileUrl('');
  };

  // Download handler for pending reports
  const handlePendingDownload = (report: PendingReport) => {
    if (report.fileUrl) {
      window.open(report.fileUrl, '_blank');
    }
  };

  // Delete handler for pending reports
  const handlePendingDelete = (report: PendingReport) => {
    setSelectedPendingReport(report);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!selectedPendingReport) return;
    setPendingReports(prev => prev.filter(r => r.id !== selectedPendingReport.id));
    toast({ title: '删除成功', description: '报表已删除' });
    setShowDeleteConfirm(false);
    setSelectedPendingReport(null);
  };

  // Distributed report handlers
  const handleDistributedUpload = (report: DistributedReport) => {
    setSelectedDistributedReport(report);
    setDistributedFileUrl('');
    setShowDistributedUploadDialog(true);
  };

  const handleDistributedDownload = (report: DistributedReport) => {
    if (report.report_templates?.file_url) {
      window.open(report.report_templates.file_url, '_blank');
    }
  };

  const confirmDistributedUpload = async () => {
    if (!selectedDistributedReport || !distributedFileUrl) {
      toast({
        title: '请填写报表文件URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmittingDistributed(true);
      await api.submitDistributedReport(selectedDistributedReport.id, distributedFileUrl);
      toast({ title: '提交成功', description: '报表已提交审核' });
      setShowDistributedUploadDialog(false);
      setSelectedDistributedReport(null);
      setDistributedFileUrl('');
      loadData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '提交失败',
        description: err.message || '无法提交报表',
        variant: 'destructive',
      });
    } finally {
      setSubmittingDistributed(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">报表上报</h1>
          <p className="text-muted-foreground">按要求提交各类报表</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">报表上报</h1>
        <p className="text-muted-foreground">按要求提交各类报表</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">管理员下发</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {distributedReports.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待提交</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => !getTemplateSubmission(t.id)).length + pendingReports.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">待审核</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {submissions.filter(s => s.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">已通过</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {submissions.filter(s => s.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 管理员下发的报表 */}
      {distributedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
              管理员下发报表
            </CardTitle>
            <CardDescription>以下报表由管理员下发，请在截止日期前完成填写并提交</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {distributedReports.map(report => (
                <div
                  key={report.id}
                  className="border rounded-lg p-4 flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{report.report_templates?.name || '未命名报表'}</h4>
                      {report.report_templates?.deadline && getDeadlineStatus(report.report_templates.deadline)}
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        <Clock className="h-3 w-3 mr-1" />
                        待填写
                      </Badge>
                    </div>
                    {report.report_templates?.description && (
                      <p className="text-sm text-muted-foreground">{report.report_templates.description}</p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>下发时间：{format(new Date(report.created_at), 'yyyy-MM-dd')}</span>
                      {report.report_templates?.deadline && (
                        <span>截止时间：{format(new Date(report.report_templates.deadline), 'yyyy-MM-dd')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.report_templates?.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDistributedDownload(report)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        下载模板
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleDistributedUpload(report)}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      上传提交
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 新建报表 - 自定义报表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              待提交报表
            </CardTitle>
            <CardDescription>需要您填写并提交的报表</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新建报表
          </Button>
        </CardHeader>
        <CardContent>
          {pendingReports.length === 0 && templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无待提交报表</p>
              <p className="text-sm mt-2">点击"新建报表"按钮创建新报表</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 自定义新建的报表 */}
              {pendingReports.map(report => (
                <PendingReportCard
                  key={report.id}
                  report={report}
                  onUpload={handlePendingUpload}
                  onDownload={handlePendingDownload}
                  onDelete={handlePendingDelete}
                />
              ))}

              {/* 管理员下发的模板报表 */}
              {templates.map(template => {
                const submission = getTemplateSubmission(template.id);
                return (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.name}</h4>
                        {template.deadline && getDeadlineStatus(template.deadline)}
                        {submission && getStatusBadge(submission.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      {template.deadline && (
                        <p className="text-xs text-muted-foreground">
                          截止日期：{format(new Date(template.deadline), 'yyyy-MM-dd')}
                        </p>
                      )}
                      {submission?.status === 'rejected' && submission.review_comment && (
                        <p className="text-xs text-red-500 mt-2">
                          拒绝原因：{submission.review_comment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {template.file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={template.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" />
                            下载模板
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleSubmit(template)}
                        disabled={submission?.status === 'approved'}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {submission ? '重新提交' : '提交报表'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提交记录 */}
      <Card>
        <CardHeader>
          <CardTitle>提交记录</CardTitle>
          <CardDescription>您的报表提交历史</CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>暂无提交记录</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>报表名称</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>审核状态</TableHead>
                  <TableHead>审核时间</TableHead>
                  <TableHead>审核意见</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map(submission => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">
                      {submission.report_templates?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {submission.submitted_at
                        ? format(new Date(submission.submitted_at), 'yyyy-MM-dd HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>
                      {submission.reviewed_at
                        ? format(new Date(submission.reviewed_at), 'yyyy-MM-dd HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{submission.review_comment || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 提交对话框 */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交报表</DialogTitle>
            <DialogDescription>
              提交报表：{selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">报表文件URL</label>
              <Input
                placeholder="请输入已上传的报表文件URL"
                value={fileUrl}
                onChange={e => setFileUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                文件上传功能开发中，请先将文件上传至其他平台后填写URL
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmSubmit} disabled={submitting || !fileUrl}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建报表对话框 */}
      <CreateReportDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateReport}
        loading={creatingReport}
      />

      {/* 上传报表对话框 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传报表</DialogTitle>
            <DialogDescription>
              上传报表：{selectedPendingReport?.reportTypeName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">报表文件URL</label>
              <Input
                placeholder="请输入已上传的报表文件URL"
                value={pendingFileUrl}
                onChange={e => setPendingFileUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                文件上传功能开发中，请先将文件上传至其他平台后填写URL
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmPendingUpload} disabled={!pendingFileUrl}>
              确认上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除报表"{selectedPendingReport?.reportTypeName}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 管理员下发报表上传对话框 */}
      <Dialog open={showDistributedUploadDialog} onOpenChange={setShowDistributedUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传报表</DialogTitle>
            <DialogDescription>
              提交报表：{selectedDistributedReport?.report_templates?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">报表文件URL</label>
              <Input
                placeholder="请输入已上传的报表文件URL"
                value={distributedFileUrl}
                onChange={e => setDistributedFileUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                请将文件上传至云存储后填写文件URL
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributedUploadDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmDistributedUpload} disabled={submittingDistributed || !distributedFileUrl}>
              {submittingDistributed && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
