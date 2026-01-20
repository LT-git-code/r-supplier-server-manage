import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Eye, Building2, Package, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  code: string;
  description: string;
  specifications: string;
  unit: string;
  price: number;
  min_order_quantity: number;
  lead_time_days: number;
  supplier_id: string;
  supplier?: {
    id: string;
    company_name: string;
    supplier_type: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    address: string;
    main_products: string;
  };
}

interface Supplier {
  id: string;
  company_name: string;
  supplier_type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  province: string;
  city: string;
  main_products: string;
  business_scope: string;
  registered_capital: number;
  employee_count: number;
  establishment_date: string;
}

interface SupplierDetail {
  supplier: Supplier;
  products: Product[];
  qualifications: Array<{
    id: string;
    name: string;
    certificate_number: string;
    issuing_authority: string;
    issue_date: string;
    expire_date: string;
    status: string;
  }>;
}

export default function DeptProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dept-api', {
        body: { action: 'get_dept_products' },
      });
      if (error) throw error;
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('获取产品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierDetail = async (supplierId: string) => {
    setLoadingDetail(true);
    try {
      const { data, error } = await supabase.functions.invoke('dept-api', {
        body: { action: 'get_supplier_detail', supplierId },
      });
      if (error) throw error;
      setSelectedSupplier(data);
      setShowDetail(true);
    } catch (error) {
      console.error('Error fetching supplier detail:', error);
      toast.error('获取供应商详情失败');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getSupplierTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      enterprise: { label: '企业', variant: 'default' },
      individual: { label: '个人', variant: 'secondary' },
      overseas: { label: '境外', variant: 'outline' },
    };
    const config = variants[type] || { label: type, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">产品管理</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">已批准供应商的产品</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索产品名称、编码或供应商..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>产品名称</TableHead>
                  <TableHead>产品编码</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>单价</TableHead>
                  <TableHead>最小起订量</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无产品，请先在供应商管理中启用供应商
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.code || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => fetchSupplierDetail(product.supplier_id)}
                          disabled={loadingDetail}
                        >
                          {product.supplier?.company_name || '-'}
                        </Button>
                      </TableCell>
                      <TableCell>{product.unit || '-'}</TableCell>
                      <TableCell>
                        {product.price ? `¥${product.price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>{product.min_order_quantity || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchSupplierDetail(product.supplier_id)}
                          disabled={loadingDetail}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看供应商
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 供应商详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedSupplier?.supplier.company_name}
              {selectedSupplier?.supplier.supplier_type && 
                getSupplierTypeBadge(selectedSupplier.supplier.supplier_type)}
            </DialogTitle>
          </DialogHeader>

          {selectedSupplier && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">
                  <Building2 className="h-4 w-4 mr-2" />
                  基本信息
                </TabsTrigger>
                <TabsTrigger value="products">
                  <Package className="h-4 w-4 mr-2" />
                  产品列表
                </TabsTrigger>
                <TabsTrigger value="qualifications">
                  <FileCheck className="h-4 w-4 mr-2" />
                  资质证书
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">联系人</div>
                    <div>{selectedSupplier.supplier.contact_name || '-'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">联系电话</div>
                    <div>{selectedSupplier.supplier.contact_phone || '-'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">联系邮箱</div>
                    <div>{selectedSupplier.supplier.contact_email || '-'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">地区</div>
                    <div>
                      {[selectedSupplier.supplier.province, selectedSupplier.supplier.city]
                        .filter(Boolean).join(' ') || '-'}
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="text-sm text-muted-foreground">详细地址</div>
                    <div>{selectedSupplier.supplier.address || '-'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">注册资本</div>
                    <div>
                      {selectedSupplier.supplier.registered_capital 
                        ? `${selectedSupplier.supplier.registered_capital}万元` 
                        : '-'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">员工人数</div>
                    <div>
                      {selectedSupplier.supplier.employee_count 
                        ? `${selectedSupplier.supplier.employee_count}人` 
                        : '-'}
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="text-sm text-muted-foreground">主营产品</div>
                    <div>{selectedSupplier.supplier.main_products || '-'}</div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <div className="text-sm text-muted-foreground">经营范围</div>
                    <div>{selectedSupplier.supplier.business_scope || '-'}</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="products" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>产品名称</TableHead>
                        <TableHead>产品编码</TableHead>
                        <TableHead>单位</TableHead>
                        <TableHead>单价</TableHead>
                        <TableHead>规格</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSupplier.products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            暂无产品
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedSupplier.products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.code || '-'}</TableCell>
                            <TableCell>{product.unit || '-'}</TableCell>
                            <TableCell>
                              {product.price ? `¥${product.price.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {product.specifications || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="qualifications" className="mt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>证书名称</TableHead>
                        <TableHead>证书编号</TableHead>
                        <TableHead>颁发机构</TableHead>
                        <TableHead>有效期至</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSupplier.qualifications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            暂无资质证书
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedSupplier.qualifications.map((qual) => (
                          <TableRow key={qual.id}>
                            <TableCell className="font-medium">{qual.name}</TableCell>
                            <TableCell>{qual.certificate_number || '-'}</TableCell>
                            <TableCell>{qual.issuing_authority || '-'}</TableCell>
                            <TableCell>{qual.expire_date || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={qual.status === 'approved' ? 'default' : 'secondary'}>
                                {qual.status === 'approved' ? '已审核' : qual.status === 'pending' ? '待审核' : '已拒绝'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
