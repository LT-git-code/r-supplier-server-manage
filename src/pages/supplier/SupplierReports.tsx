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
  FileText,
  Upload,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

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
  };
}

export default function SupplierReports() {
  const api = useSupplierApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, submissionsData] = await Promise.all([
        api.getReportTemplates(),
        api.getReportSubmissions(),
      ]);
      setTemplates(templatesData || []);
      setSubmissions(submissionsData || []);
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待提交</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => !getTemplateSubmission(t.id)).length}
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

      {/* 待提交报表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            待提交报表
          </CardTitle>
          <CardDescription>需要您填写并提交的报表</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无待提交报表</p>
            </div>
          ) : (
            <div className="space-y-4">
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
    </div>
  );
}
