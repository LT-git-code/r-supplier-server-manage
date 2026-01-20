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
import { Search, Library, Plus, Power, PowerOff, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DeptSupplier {
  id: string;
  supplier_id: string;
  library_type: string;
  created_at: string;
  supplier?: {
    id: string;
    company_name: string;
    supplier_type: string;
    contact_name: string;
    contact_phone: string;
    status: string;
    main_products: string;
  };
}

interface Supplier {
  id: string;
  company_name: string;
  supplier_type: string;
  contact_name: string;
  contact_phone: string;
  status: string;
  main_products: string;
}

export default function DeptSuppliers() {
  const [suppliers, setSuppliers] = useState<DeptSupplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'enable' | 'disable' | 'add';
    supplier?: Supplier | DeptSupplier;
  }>({ open: false, type: 'enable' });

  const fetchDeptSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dept-api', {
        body: { action: 'get_dept_suppliers' },
      });
      if (error) throw error;
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error fetching dept suppliers:', error);
      toast.error('获取供应商列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSuppliers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('dept-api', {
        body: { action: 'get_all_approved_suppliers' },
      });
      if (error) throw error;
      setAllSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error fetching all suppliers:', error);
      toast.error('获取供应商库失败');
    }
  };

  useEffect(() => {
    fetchDeptSuppliers();
  }, []);

  useEffect(() => {
    if (showLibrary) {
      fetchAllSuppliers();
    }
  }, [showLibrary]);

  const handleAddSupplier = async (supplierId: string) => {
    try {
      const { error } = await supabase.functions.invoke('dept-api', {
        body: { action: 'add_supplier', supplierId },
      });
      if (error) throw error;
      toast.success('供应商已添加到本部门');
      fetchDeptSuppliers();
      setConfirmDialog({ open: false, type: 'add' });
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('添加供应商失败');
    }
  };

  const handleToggleSupplier = async (deptSupplierId: string, enable: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('dept-api', {
        body: { 
          action: enable ? 'enable_supplier' : 'disable_supplier', 
          deptSupplierId 
        },
      });
      if (error) throw error;
      toast.success(enable ? '供应商已启用' : '供应商已停用');
      fetchDeptSuppliers();
      setConfirmDialog({ open: false, type: enable ? 'enable' : 'disable' });
    } catch (error) {
      console.error('Error toggling supplier:', error);
      toast.error('操作失败');
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
    s.supplier?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.supplier?.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLibrarySuppliers = allSuppliers.filter(s => {
    const matchSearch = s.company_name?.toLowerCase().includes(librarySearch.toLowerCase()) ||
      s.contact_name?.toLowerCase().includes(librarySearch.toLowerCase());
    return matchSearch;
  });

  const isSupplierInDept = (supplierId: string) => {
    return suppliers.some(s => s.supplier_id === supplierId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">供应商管理</h1>
        <Button onClick={() => setShowLibrary(true)}>
          <Library className="mr-2 h-4 w-4" />
          供应商库
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">本部门供应商</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索供应商名称或联系人..."
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
                      暂无供应商，请从供应商库添加
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.supplier?.company_name || '-'}
                      </TableCell>
                      <TableCell>
                        {item.supplier?.supplier_type && getSupplierTypeBadge(item.supplier.supplier_type)}
                      </TableCell>
                      <TableCell>{item.supplier?.contact_name || '-'}</TableCell>
                      <TableCell>{item.supplier?.contact_phone || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.supplier?.main_products || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.library_type === 'current' ? 'default' : 'secondary'}>
                          {item.library_type === 'current' ? '启用' : '停用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.library_type === 'current' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDialog({ 
                              open: true, 
                              type: 'disable', 
                              supplier: item 
                            })}
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
                              supplier: item 
                            })}
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

      {/* 供应商库弹窗 */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>供应商库</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索供应商..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              导入供应商
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>公司名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>主营产品</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLibrarySuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      暂无审核通过的供应商
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLibrarySuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        {supplier.company_name || '-'}
                      </TableCell>
                      <TableCell>
                        {getSupplierTypeBadge(supplier.supplier_type)}
                      </TableCell>
                      <TableCell>{supplier.contact_name || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {supplier.main_products || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSupplierInDept(supplier.id) ? (
                          <Badge variant="secondary">已添加</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDialog({ 
                              open: true, 
                              type: 'add', 
                              supplier 
                            })}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            添加
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* 确认弹窗 */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'add' && '添加供应商'}
              {confirmDialog.type === 'enable' && '启用供应商'}
              {confirmDialog.type === 'disable' && '停用供应商'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'add' && '确定要将此供应商添加到本部门吗？'}
              {confirmDialog.type === 'enable' && '确定要启用此供应商吗？启用后该供应商的产品将显示在本部门产品列表中。'}
              {confirmDialog.type === 'disable' && '确定要停用此供应商吗？停用后该供应商的产品将不再显示在本部门产品列表中。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.type === 'add' && confirmDialog.supplier) {
                  handleAddSupplier((confirmDialog.supplier as Supplier).id);
                } else if (confirmDialog.supplier) {
                  const deptSupplier = confirmDialog.supplier as DeptSupplier;
                  handleToggleSupplier(deptSupplier.id, confirmDialog.type === 'enable');
                }
              }}
            >
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
