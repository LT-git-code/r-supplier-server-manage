import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_roles: string[] | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员' },
  { value: 'department', label: '部门用户' },
  { value: 'supplier', label: '供应商' },
];

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_roles: [] as string[],
  });
  const { toast } = useToast();

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('admin-api', {
        body: { action: 'list_announcements' },
      });

      if (response.error) throw response.error;
      setAnnouncements(response.data || []);
    } catch (error) {
      toast({
        title: '获取公告列表失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setFormData({ title: '', content: '', target_roles: [] });
    setDialogOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_roles: announcement.target_roles || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteDialogOpen(true);
  };

  const handleTogglePublish = async (announcement: Announcement) => {
    try {
      const response = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'toggle_announcement_publish',
          id: announcement.id,
          is_published: !announcement.is_published,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: announcement.is_published ? '已取消发布' : '已发布',
        description: `公告"${announcement.title}"${announcement.is_published ? '已取消发布' : '已成功发布'}`,
      });
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: '操作失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: '请填写完整信息',
        description: '标题和内容不能为空',
        variant: 'destructive',
      });
      return;
    }

    try {
      const action = selectedAnnouncement ? 'update_announcement' : 'create_announcement';
      const response = await supabase.functions.invoke('admin-api', {
        body: {
          action,
          id: selectedAnnouncement?.id,
          title: formData.title,
          content: formData.content,
          target_roles: formData.target_roles.length > 0 ? formData.target_roles : null,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: selectedAnnouncement ? '更新成功' : '创建成功',
        description: `公告"${formData.title}"${selectedAnnouncement ? '已更新' : '已创建'}`,
      });
      setDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAnnouncement) return;

    try {
      const response = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'delete_announcement',
          id: selectedAnnouncement.id,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: '删除成功',
        description: `公告"${selectedAnnouncement.title}"已删除`,
      });
      setDeleteDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  const getRoleLabels = (roles: string[] | null) => {
    if (!roles || roles.length === 0) return '所有用户';
    return roles.map(r => ROLE_OPTIONS.find(o => o.value === r)?.label || r).join(', ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            公告管理
          </h1>
          <p className="text-muted-foreground">管理平台公告，发布通知给用户</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          新建公告
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>公告列表</CardTitle>
          <CardDescription>共 {announcements.length} 条公告</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无公告，点击"新建公告"创建第一条公告
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>目标用户</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>发布时间</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map(announcement => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {announcement.title}
                    </TableCell>
                    <TableCell>{getRoleLabels(announcement.target_roles)}</TableCell>
                    <TableCell>
                      <Badge variant={announcement.is_published ? 'default' : 'secondary'}>
                        {announcement.is_published ? '已发布' : '草稿'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {announcement.published_at
                        ? format(new Date(announcement.published_at), 'yyyy-MM-dd HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(announcement.created_at), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePublish(announcement)}
                          title={announcement.is_published ? '取消发布' : '发布'}
                        >
                          {announcement.is_published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(announcement)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement ? '编辑公告' : '新建公告'}</DialogTitle>
            <DialogDescription>
              {selectedAnnouncement ? '修改公告内容' : '创建新的公告通知'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="请输入公告标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="请输入公告内容"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>目标用户（不选则对所有用户可见）</Label>
              <div className="flex flex-wrap gap-4 pt-2">
                {ROLE_OPTIONS.map(role => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={role.value}
                      checked={formData.target_roles.includes(role.value)}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                    />
                    <label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除公告"{selectedAnnouncement?.title}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
