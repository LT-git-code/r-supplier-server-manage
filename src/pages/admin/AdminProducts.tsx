import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Loader2, 
  Search, 
  RefreshCw, 
  MoreHorizontal, 
  Package,
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  price: number | null;
  unit: string | null;
  status: string | null;
  is_active: boolean | null;
  specifications: string | null;
  min_order_quantity: number | null;
  lead_time_days: number | null;
  created_at: string;
  supplier: {
    id: string;
    company_name: string | null;
    contact_name: string | null;
    supplier_type: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
}

const statusLabels: Record<string, string> = {
  active: '上架中',
  inactive: '已下架',
  pending: '待审核',
};

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/30',
  inactive: 'bg-muted text-muted-foreground border-muted',
  pending: 'bg-warning/10 text-warning border-warning/30',
};

export default function AdminProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'list_products', status: activeTab === 'all' ? null : activeTab },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setProducts(data.products || []);
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
    fetchProducts();
  }, [fetchProducts]);

  const handleStatusChange = async (productId: string, newStatus: string) => {
    try {
      setProcessing(true);
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'update_product_status', productId, status: newStatus },
      });

      if (error) throw error;

      toast({ title: newStatus === 'active' ? '产品已上架' : '产品已下架' });
      fetchProducts();
      setDetailOpen(false);
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

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    const productName = product.name?.toLowerCase() || '';
    const supplierName = (product.supplier?.company_name || product.supplier?.contact_name || '').toLowerCase();
    const productCode = product.code?.toLowerCase() || '';
    
    return productName.includes(query) || supplierName.includes(query) || productCode.includes(query);
  });

  const getSupplierName = (product: Product) => {
    return product.supplier?.company_name || product.supplier?.contact_name || '未知供应商';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">产品管理</h1>
          <p className="text-muted-foreground">管理平台所有审核通过供应商的产品</p>
        </div>
        <Button variant="outline" onClick={fetchProducts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 搜索框 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索产品名称、供应商名称或产品编码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">上架中</TabsTrigger>
          <TabsTrigger value="inactive">已下架</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>产品列表</CardTitle>
              <CardDescription>
                共 {filteredProducts.length} 个产品
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无产品数据</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>产品名称</TableHead>
                        <TableHead>供应商</TableHead>
                        <TableHead>分类</TableHead>
                        <TableHead>价格</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead className="w-16">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map(product => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.code && (
                                <div className="text-sm text-muted-foreground">
                                  编码: {product.code}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{getSupplierName(product)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.category?.name || '-'}
                          </TableCell>
                          <TableCell>
                            {product.price ? `¥${product.price.toLocaleString()}` : '-'}
                            {product.unit && <span className="text-muted-foreground">/{product.unit}</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[product.status || 'active']}>
                              {statusLabels[product.status || 'active']}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(product.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedProduct(product);
                                  setDetailOpen(true);
                                }}>
                                  <Package className="h-4 w-4 mr-2" />
                                  查看详情
                                </DropdownMenuItem>
                                {product.status === 'active' ? (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(product.id, 'inactive')}
                                    className="text-warning"
                                  >
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    下架产品
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(product.id, 'active')}
                                    className="text-success"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    上架产品
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* 产品详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>产品详情</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">产品编码：</span>
                  <span className="ml-1">{selectedProduct.code || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">状态：</span>
                  <Badge variant="outline" className={`ml-1 ${statusColors[selectedProduct.status || 'active']}`}>
                    {statusLabels[selectedProduct.status || 'active']}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">供应商：</span>
                  <span className="ml-1">{getSupplierName(selectedProduct)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">分类：</span>
                  <span className="ml-1">{selectedProduct.category?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">价格：</span>
                  <span className="ml-1">
                    {selectedProduct.price ? `¥${selectedProduct.price.toLocaleString()}` : '-'}
                    {selectedProduct.unit && `/${selectedProduct.unit}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">最小订购量：</span>
                  <span className="ml-1">
                    {selectedProduct.min_order_quantity || '-'}
                    {selectedProduct.unit && ` ${selectedProduct.unit}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">交货周期：</span>
                  <span className="ml-1">
                    {selectedProduct.lead_time_days ? `${selectedProduct.lead_time_days} 天` : '-'}
                  </span>
                </div>
              </div>
              
              {selectedProduct.description && (
                <div>
                  <span className="text-muted-foreground text-sm">产品描述：</span>
                  <p className="mt-1 text-sm">{selectedProduct.description}</p>
                </div>
              )}
              
              {selectedProduct.specifications && (
                <div>
                  <span className="text-muted-foreground text-sm">规格参数：</span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedProduct.specifications}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              关闭
            </Button>
            {selectedProduct && (
              selectedProduct.status === 'active' ? (
                <Button 
                  variant="outline"
                  onClick={() => handleStatusChange(selectedProduct.id, 'inactive')}
                  disabled={processing}
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <EyeOff className="h-4 w-4 mr-2" />
                  下架产品
                </Button>
              ) : (
                <Button 
                  onClick={() => handleStatusChange(selectedProduct.id, 'active')}
                  disabled={processing}
                >
                  {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Eye className="h-4 w-4 mr-2" />
                  上架产品
                </Button>
              )
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
