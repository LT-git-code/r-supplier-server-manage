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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Supplier {
  id: string;
  company_name: string;
  supplier_type: string;
  contact_name: string;
  contact_phone: string;
  status: string;
  main_products: string;
  dept_supplier_id: string | null;
  library_type: string;
}

export default function DeptSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'enable' | 'disable';
    supplier?: Supplier;
  }>({ open: false, type: 'enable' });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dept-api', {
        body: { action: 'get_dept_suppliers' },
      });
      if (error) throw error;
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('获取供应商列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleToggleSupplier = async (supplierId: string, enable: boolean) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('dept-api', {
        body: { 
          action: enable ? 'enable_supplier' : 'disable_supplier', 
          supplierId 
        },
      });
      if (error) throw error;
      toast.success(enable ? '供应商已启用' : '供应商已停用');
      fetchSuppliers();
      setConfirmDialog({ open: false, type: enable ? 'enable' : 'disable' });
    } catch (error) {
      console.error('Error toggling supplier:', error);
      toast.error('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const getSupplierTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      enterprise: { label: '企业', variant: 'default' },
      individual: { label: '个人', variant: 'secondary' },
      overseas: { label: '境外', variant: 'outline' },
    };
    const config = variants[type] || { label: type, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.main_products?.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = suppliers.filter(s => s.library_type === 'current').length;
  const disabledCount = suppliers.length - enabledCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">供应商管理</h1>
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            已启用: <span className="font-medium text-green-600">{enabledCount}</span>
          </span>
          <span className="text-muted-foreground">
            已停用: <span className="font-medium text-gray-500">{disabledCount}</span>
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">已批准供应商</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索供应商名称、联系人或主营产品..."
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
                  <TableHead>公司名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>主营产品</TableHead>
                  <TableHead>状态</TableHead>
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
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无已批准的供应商
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        {supplier.company_name || '-'}
                      </TableCell>
                      <TableCell>
                        {getSupplierTypeBadge(supplier.supplier_type)}
                      </TableCell>
                      <TableCell>{supplier.contact_name || '-'}</TableCell>
                      <TableCell>{supplier.contact_phone || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {supplier.main_products || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.library_type === 'current' ? 'default' : 'secondary'}>
                          {supplier.library_type === 'current' ? '已启用' : '已停用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {supplier.library_type === 'current' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDialog({ 
                              open: true, 
                              type: 'disable', 
                              supplier 
                            })}
                            disabled={actionLoading}
                          >
                            <PowerOff className="h-4 w-4 mr-1" />
                            停用
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDialog({ 
                              open: true, 
                              type: 'enable', 
                              supplier 
                            })}
                            disabled={actionLoading}
                          >
                            <Power className="h-4 w-4 mr-1" />
                            启用
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 确认弹窗 */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'enable' ? '启用供应商' : '停用供应商'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'enable' 
                ? `确定要启用供应商「${confirmDialog.supplier?.company_name}」吗？启用后该供应商的产品将显示在产品管理列表中。`
                : `确定要停用供应商「${confirmDialog.supplier?.company_name}」吗？停用后该供应商的产品将不再显示在产品管理列表中。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.supplier) {
                  handleToggleSupplier(confirmDialog.supplier.id, confirmDialog.type === 'enable');
                }
              }}
              disabled={actionLoading}
            >
              {actionLoading ? '处理中...' : '确定'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
