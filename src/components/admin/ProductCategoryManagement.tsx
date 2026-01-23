import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  FolderTree,
} from 'lucide-react';

interface ProductCategory {
  id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface ProductCategoryManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductCategoryManagement({
  open,
  onOpenChange,
}: ProductCategoryManagementProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    parent_id: '',
    level: 1,
    sort_order: 0,
  });

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'list_product_categories' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setCategories(data.categories || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, fetchCategories]);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      code: '',
      parent_id: '',
      level: 1,
      sort_order: 0,
    });
    setShowForm(true);
  };

  const handleEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code || '',
      parent_id: category.parent_id || '',
      level: category.level,
      sort_order: category.sort_order,
    });
    setShowForm(true);
  };

  const handleDelete = (category: ProductCategory) => {
    setDeletingCategory(category);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;

    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'delete_product_category', categoryId: deletingCategory.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: '分类已删除' });
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error.message,
      });
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
      setDeletingCategory(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: '请填写分类名称',
      });
      return;
    }

    try {
      setSaving(true);

      if (editingCategory) {
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: {
            action: 'update_product_category',
            categoryId: editingCategory.id,
            name: formData.name,
            code: formData.code || null,
            parent_id: formData.parent_id || null,
            level: formData.level,
            sort_order: formData.sort_order,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast({ title: '分类已更新' });
      } else {
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: {
            action: 'create_product_category',
            name: formData.name,
            code: formData.code || null,
            parent_id: formData.parent_id || null,
            level: formData.level,
            sort_order: formData.sort_order,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast({ title: '分类已创建' });
      }

      setShowForm(false);
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: ProductCategory) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'update_product_category',
          categoryId: category.id,
          is_active: !category.is_active,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: category.is_active ? '分类已禁用' : '分类已启用' });
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: error.message,
      });
    }
  };

  const getCategoryName = (parentId: string | null) => {
    if (!parentId) return '-';
    const parent = categories.find((c) => c.id === parentId);
    return parent?.name || '-';
  };

  // 获取可选的父级分类（排除自身及其子分类）
  const getAvailableParents = () => {
    if (!editingCategory) return categories.filter((c) => c.is_active);
    return categories.filter(
      (c) => c.id !== editingCategory.id && c.parent_id !== editingCategory.id && c.is_active
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              产品分类管理
            </DialogTitle>
            <DialogDescription>
              管理产品分类，所有终端新增产品时将从此处选择分类
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-4">
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              新增分类
            </Button>
            <Button variant="outline" onClick={fetchCategories} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无分类数据，点击"新增分类"添加
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分类名称</TableHead>
                    <TableHead>分类编码</TableHead>
                    <TableHead>父级分类</TableHead>
                    <TableHead>层级</TableHead>
                    <TableHead>排序</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-32">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.code || '-'}</TableCell>
                      <TableCell>{getCategoryName(category.parent_id)}</TableCell>
                      <TableCell>{category.level}</TableCell>
                      <TableCell>{category.sort_order}</TableCell>
                      <TableCell>
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={() => toggleActive(category)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(category)}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* 新增/编辑分类表单 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? '编辑分类' : '新增分类'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">分类名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入分类名称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">分类编码</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="请输入分类编码（可选）"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">父级分类</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parent_id: value === 'none' ? '' : value,
                    level: value === 'none' ? 1 : 2,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择父级分类（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无（顶级分类）</SelectItem>
                  {getAvailableParents().map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">层级</Label>
                <Input
                  id="level"
                  type="number"
                  min={1}
                  max={5}
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">排序</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除分类"{deletingCategory?.name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
