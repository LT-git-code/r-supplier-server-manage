import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Eye, MessageSquare, ExternalLink } from 'lucide-react';

interface Complaint {
  id: string;
  subject: string;
  complaint_type: string;
  content: string;
  company_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  attachments: string[] | null;
  status: string;
  response: string | null;
  created_at: string;
  responded_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待处理', variant: 'destructive' },
  processing: { label: '处理中', variant: 'secondary' },
  resolved: { label: '已处理', variant: 'default' },
  closed: { label: '已关闭', variant: 'outline' },
};

const TYPE_MAP: Record<string, string> = {
  complaint: '投诉',
  suggestion: '建议',
  report: '举报',
  other: '其他',
};

export default function AdminComplaints() {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints((data || []) as Complaint[]);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      toast({
        title: '加载失败',
        description: '无法加载投诉建议数据',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setViewDialogOpen(true);
  };

  const handleOpenResponse = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setResponseText(complaint.response || '');
    setResponseDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedComplaint || !responseText.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          response: responseText,
          status: 'resolved',
          responded_at: new Date().toISOString(),
        })
        .eq('id', selectedComplaint.id);

      if (error) throw error;

      toast({
        title: '回复成功',
        description: '投诉建议已处理',
      });

      setResponseDialogOpen(false);
      fetchComplaints();
    } catch (error) {
      console.error('Failed to submit response:', error);
      toast({
        title: '操作失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (complaint: Complaint, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', complaint.id);

      if (error) throw error;

      toast({ title: '状态已更新' });
      fetchComplaints();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: '更新失败',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
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
        <h1 className="text-2xl font-bold">投诉建议管理</h1>
        <Badge variant="outline">{complaints.length} 条记录</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>投诉建议列表</CardTitle>
        </CardHeader>
        <CardContent>
          {complaints.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无投诉建议
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>内容摘要</TableHead>
                  <TableHead>公司/姓名</TableHead>
                  <TableHead>联系方式</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {TYPE_MAP[complaint.complaint_type] || complaint.subject}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {complaint.content}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {complaint.company_name && <div>{complaint.company_name}</div>}
                        {complaint.contact_name && <div className="text-muted-foreground">{complaint.contact_name}</div>}
                        {!complaint.company_name && !complaint.contact_name && <span className="text-muted-foreground">匿名</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {complaint.contact_phone || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_MAP[complaint.status]?.variant || 'outline'}>
                        {STATUS_MAP[complaint.status]?.label || complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(complaint.created_at)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleView(complaint)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenResponse(complaint)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>投诉建议详情</DialogTitle>
            <DialogDescription>
              提交时间：{selectedComplaint && formatDate(selectedComplaint.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">类型：</span>
                  <Badge variant="outline" className="ml-2">
                    {TYPE_MAP[selectedComplaint.complaint_type] || selectedComplaint.subject}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">状态：</span>
                  <Badge variant={STATUS_MAP[selectedComplaint.status]?.variant} className="ml-2">
                    {STATUS_MAP[selectedComplaint.status]?.label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground">具体内容</Label>
                <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedComplaint.content}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">公司：</span>
                  <div>{selectedComplaint.company_name || '-'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">姓名：</span>
                  <div>{selectedComplaint.contact_name || '-'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">联系方式：</span>
                  <div>{selectedComplaint.contact_phone || '-'}</div>
                </div>
              </div>

              {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">附件</Label>
                  <div className="space-y-1">
                    {selectedComplaint.attachments.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        附件 {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedComplaint.response && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">处理回复</Label>
                  <div className="p-3 bg-primary/10 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedComplaint.response}
                  </div>
                  {selectedComplaint.responded_at && (
                    <p className="text-xs text-muted-foreground">
                      回复时间：{formatDate(selectedComplaint.responded_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>处理投诉建议</DialogTitle>
            <DialogDescription>
              填写处理意见并提交
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>处理回复</Label>
              <Textarea
                placeholder="请输入处理意见..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitResponse} disabled={submitting || !responseText.trim()}>
              {submitting ? '提交中...' : '提交回复'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
