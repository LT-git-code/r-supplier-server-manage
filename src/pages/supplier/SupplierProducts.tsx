import { useState, useEffect } from 'react';
import { useSupplierApi } from '@/hooks/useSupplierApi';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Search,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  code: string;
  category_id: string;
  description: string;
  specifications: string;
  unit: string;
  price: number;
  min_order_quantity: number;
  lead_time_days: number;
  images: string[];
  status: string;
  is_active: boolean;
  created_at: string;
  product_categories?: {
    name: string;
  };
}

interface ProductCategory {
  id: string;
  name: string;
  code: string;
  level: number;
  parent_id: string | null;
}

const emptyProduct = {
  name: '',
  code: '',
  category_id: '',
  description: '',
  specifications: '',
  unit: '',
  price: 0,
  min_order_quantity: 1,
  lead_time_days: 0,
};

export default function SupplierProducts() {
  const api = useSupplierApi();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await api.getProducts(page, pageSize, search);
      setProducts(result.data || []);
      setTotal(result.total || 0);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '加载失败',
        description: err.message || '无法加载产品列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getProductCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleAdd = () => {
    setEditingProduct(emptyProduct);
    setShowDialog(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowDialog(true);
  };

  const handleDelete = (product: Product) => {
    setDeletingProduct(product);
    setShowDeleteDialog(true);
  };

  const buildProductPayload = (p: Partial<Product>) => {
    // 只提交数据库真实存在的字段，避免把关联对象/只读字段传给后端
    const payload: Record<string, unknown> = {
      name: p.name,
      code: p.code || null,
      category_id: p.category_id || null,
      description: p.description || null,
      specifications: p.specifications || null,
      unit: p.unit || null,
      price: typeof p.price === 'number' ? p.price : null,
      min_order_quantity: typeof p.min_order_quantity === 'number' ? p.min_order_quantity : null,
      lead_time_days: typeof p.lead_time_days === 'number' ? p.lead_time_days : null,
    };

    // 可选字段
    if (p.images !== undefined) payload.images = p.images;
    if (p.is_active !== undefined) payload.is_active = p.is_active;
    if (p.status !== undefined) payload.status = p.status;

    return payload;
  };

  const handleSave = async () => {
    if (!editingProduct?.name) {
      toast({
        title: '请填写产品名称',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const payload = buildProductPayload(editingProduct);

      if ('id' in editingProduct && editingProduct.id) {
        await api.updateProduct(editingProduct.id, payload);
        toast({ title: '更新成功', description: '产品信息已更新' });
      } else {
        await api.createProduct(payload);
        toast({ title: '添加成功', description: '新产品已添加' });
      }
      setShowDialog(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '保存失败',
        description: err.message || '无法保存产品',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;

    try {
      await api.deleteProduct(deletingProduct.id);
      toast({ title: '删除成功', description: '产品已删除' });
      setShowDeleteDialog(false);
      setDeletingProduct(null);
      loadProducts();
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '删除失败',
        description: err.message || '无法删除产品',
        variant: 'destructive',
      });
    }
  };

  const updateProductField = (field: string, value: unknown) => {
    if (!editingProduct) return;
    setEditingProduct({ ...editingProduct, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">产品服务</h1>
          <p className="text-muted-foreground">管理您提供的产品和服务</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          添加产品
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>产品列表</CardTitle>
              <CardDescription>共 {total} 个产品</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索产品名称或编码..."
                className="pl-9"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无产品</p>
              <p className="text-sm mt-2">点击"添加产品"开始添加您的产品</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>产品名称</TableHead>
                    <TableHead>产品编码</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>规格型号</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>价格</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.code || '-'}</TableCell>
                      <TableCell>{product.product_categories?.name || '-'}</TableCell>
                      <TableCell>{product.specifications || '-'}</TableCell>
                      <TableCell>{product.unit || '-'}</TableCell>
                      <TableCell>{product.price ? `¥${product.price}` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? '上架' : '下架'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(product.created_at), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 产品编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct && 'id' in editingProduct ? '编辑产品' : '添加产品'}
            </DialogTitle>
            <DialogDescription>
              填写产品信息，带 * 为必填项
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">产品名称 *</Label>
              <Input
                id="name"
                value={editingProduct?.name || ''}
                onChange={e => updateProductField('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">产品编码</Label>
              <Input
                id="code"
                value={editingProduct?.code || ''}
                onChange={e => updateProductField('code', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">产品分类</Label>
              <Select
                value={editingProduct?.category_id || ''}
                onValueChange={value => updateProductField('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specifications">规格型号</Label>
              <Input
                id="specifications"
                value={editingProduct?.specifications || ''}
                onChange={e => updateProductField('specifications', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">计量单位</Label>
              <Input
                id="unit"
                placeholder="如：件、台、套"
                value={editingProduct?.unit || ''}
                onChange={e => updateProductField('unit', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">市场价格</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={editingProduct?.price || ''}
                onChange={e => updateProductField('price', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_order_quantity">最小起订量</Label>
              <Input
                id="min_order_quantity"
                type="number"
                value={editingProduct?.min_order_quantity || 1}
                onChange={e => updateProductField('min_order_quantity', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_time_days">交货周期（天）</Label>
              <Input
                id="lead_time_days"
                type="number"
                value={editingProduct?.lead_time_days || 0}
                onChange={e => updateProductField('lead_time_days', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">产品描述</Label>
              <Textarea
                id="description"
                rows={3}
                value={editingProduct?.description || ''}
                onChange={e => updateProductField('description', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
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
              确定要删除产品"{deletingProduct?.name}"吗？此操作无法撤销。
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
