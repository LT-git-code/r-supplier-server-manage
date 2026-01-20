import { useState, useEffect } from 'react';
import { useSupplierApi } from '@/hooks/useSupplierApi';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus,
  Pencil,
  Trash2,
  FileCheck,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Qualification {
  id: string;
  name: string;
  qualification_type_id: string;
  certificate_number: string;
  issuing_authority: string;
  issue_date: string;
  expire_date: string;
  file_url: string;
  status: string;
  rejection_reason: string;
  created_at: string;
  qualification_types?: {
    id: string;
    name: string;
    code: string;
  };
}

interface QualificationType {
  id: string;
  name: string;
  code: string;
  is_required: boolean;
  description: string;
}

const emptyQualification = {
  name: '',
  qualification_type_id: '',
  certificate_number: '',
  issuing_authority: '',
  issue_date: '',
  expire_date: '',
  file_url: '',
};

export default function SupplierQualifications() {
  const api = useSupplierApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [types, setTypes] = useState<QualificationType[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingQualification, setEditingQualification] = useState<Partial<Qualification> | null>(null);
  const [deletingQualification, setDeletingQualification] = useState<Qualification | null>(null);

  useEffect(() => {
    loadQualifications();
    loadQualificationTypes();
  }, []);

  const loadQualifications = async () => {
    try {
      setLoading(true);
      const data = await api.getQualifications();
      setQualifications(data || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '加载失败',
        description: err.message || '无法加载资质列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadQualificationTypes = async () => {
    try {
      const data = await api.getQualificationTypes();
      setTypes(data || []);
    } catch (error) {
      console.error('Failed to load qualification types:', error);
    }
  };

  const handleAdd = () => {
    setEditingQualification(emptyQualification);
    setShowDialog(true);
  };

  const handleEdit = (qualification: Qualification) => {
    setEditingQualification(qualification);
    setShowDialog(true);
  };

  const handleDelete = (qualification: Qualification) => {
    setDeletingQualification(qualification);
    setShowDeleteDialog(true);
  };

  const handleSave = async () => {
    if (!editingQualification?.name) {
      toast({
        title: '请填写资质名称',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      if ('id' in editingQualification && editingQualification.id) {
        await api.updateQualification(editingQualification.id, editingQualification);
        toast({ title: '更新成功', description: '资质信息已更新并重新提交审核' });
      } else {
        await api.createQualification(editingQualification);
        toast({ title: '添加成功', description: '新资质已添加并提交审核' });
      }
      setShowDialog(false);
      setEditingQualification(null);
      loadQualifications();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '保存失败',
        description: err.message || '无法保存资质',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingQualification) return;

    try {
      await api.deleteQualification(deletingQualification.id);
      toast({ title: '删除成功', description: '资质已删除' });
      setShowDeleteDialog(false);
      setDeletingQualification(null);
      loadQualifications();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '删除失败',
        description: err.message || '无法删除资质',
        variant: 'destructive',
      });
    }
  };

  const updateQualificationField = (field: string, value: unknown) => {
    if (!editingQualification) return;
    setEditingQualification({ ...editingQualification, [field]: value });
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

  const getExpiryStatus = (expireDate: string) => {
    if (!expireDate) return null;
    const daysUntilExpiry = differenceInDays(parseISO(expireDate), new Date());
    
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />已过期</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600"><AlertTriangle className="h-3 w-3 mr-1" />{daysUntilExpiry}天后过期</Badge>;
    } else if (daysUntilExpiry <= 90) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">{daysUntilExpiry}天后过期</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">资质提交</h1>
          <p className="text-muted-foreground">管理您的企业资质和证书</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          添加资质
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">资质总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">已通过</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {qualifications.filter(q => q.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">待审核</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {qualifications.filter(q => q.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">即将到期</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {qualifications.filter(q => {
                if (!q.expire_date) return false;
                const days = differenceInDays(parseISO(q.expire_date), new Date());
                return days >= 0 && days <= 90;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>资质列表</CardTitle>
          <CardDescription>您提交的所有企业资质和证书</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : qualifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无资质</p>
              <p className="text-sm mt-2">点击"添加资质"开始上传您的企业资质</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>资质名称</TableHead>
                  <TableHead>资质类型</TableHead>
                  <TableHead>证书编号</TableHead>
                  <TableHead>颁发机构</TableHead>
                  <TableHead>有效期</TableHead>
                  <TableHead>审核状态</TableHead>
                  <TableHead>临期提醒</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qualifications.map(qualification => (
                  <TableRow key={qualification.id}>
                    <TableCell className="font-medium">{qualification.name}</TableCell>
                    <TableCell>{qualification.qualification_types?.name || '-'}</TableCell>
                    <TableCell>{qualification.certificate_number || '-'}</TableCell>
                    <TableCell>{qualification.issuing_authority || '-'}</TableCell>
                    <TableCell>
                      {qualification.expire_date
                        ? format(new Date(qualification.expire_date), 'yyyy-MM-dd')
                        : '长期有效'}
                    </TableCell>
                    <TableCell>{getStatusBadge(qualification.status)}</TableCell>
                    <TableCell>{getExpiryStatus(qualification.expire_date)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(qualification)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(qualification)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 资质编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQualification && 'id' in editingQualification ? '编辑资质' : '添加资质'}
            </DialogTitle>
            <DialogDescription>
              填写资质信息，带 * 为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">资质名称 *</Label>
              <Input
                id="name"
                value={editingQualification?.name || ''}
                onChange={e => updateQualificationField('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">资质类型</Label>
              <Select
                value={editingQualification?.qualification_type_id || ''}
                onValueChange={value => updateQualificationField('qualification_type_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择资质类型" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} {type.is_required && <span className="text-red-500">*</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate_number">证书编号</Label>
              <Input
                id="certificate_number"
                value={editingQualification?.certificate_number || ''}
                onChange={e => updateQualificationField('certificate_number', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuing_authority">颁发机构</Label>
              <Input
                id="issuing_authority"
                value={editingQualification?.issuing_authority || ''}
                onChange={e => updateQualificationField('issuing_authority', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">颁发日期</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={editingQualification?.issue_date || ''}
                  onChange={e => updateQualificationField('issue_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expire_date">有效期至</Label>
                <Input
                  id="expire_date"
                  type="date"
                  value={editingQualification?.expire_date || ''}
                  onChange={e => updateQualificationField('expire_date', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file_url">证书文件URL</Label>
              <Input
                id="file_url"
                placeholder="上传证书后填写文件URL"
                value={editingQualification?.file_url || ''}
                onChange={e => updateQualificationField('file_url', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">文件上传功能开发中，请先填写文件URL</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存并提交审核
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除资质"{deletingQualification?.name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
