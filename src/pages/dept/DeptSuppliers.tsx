import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Search, Power, PowerOff, Upload, Building2, Star, FolderOpen, ShieldX } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SupplierImportDialog from '@/components/dept/SupplierImportDialog';

type LibraryTab = 'organization' | 'premium' | 'backup' | 'blacklist';

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
  is_recommended?: boolean;
  is_blacklisted?: boolean;
}

const TAB_CONFIG: Record<LibraryTab, { label: string; icon: React.ReactNode; description: string }> = {
  organization: { 
    label: '组织库', 
    icon: <Building2 className="h-4 w-4" />,
    description: '当前部门启用的供应商'
  },
  premium: { 
    label: '优质库', 
    icon: <Star className="h-4 w-4" />,
    description: '标签为推荐的优质供应商'
  },
  backup: { 
    label: '备选库', 
    icon: <FolderOpen className="h-4 w-4" />,
    description: '本部门未启用的非拉黑供应商'
  },
  blacklist: { 
    label: '拉黑异议库', 
    icon: <ShieldX className="h-4 w-4" />,
    description: '被拉黑或有异议标签的供应商'
  },
};

export default function DeptSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<LibraryTab>('organization');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'enable' | 'disable';
    supplier?: Supplier;
  }>({ open: false, type: 'enable' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const fetchSuppliers = async (tab: LibraryTab = activeTab) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dept-api', {
        body: { action: 'get_dept_suppliers', libraryTab: tab },
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
    fetchSuppliers(activeTab);
  }, [activeTab]);

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
      fetchSuppliers(activeTab);
      setConfirmDialog({ open: false, type: enable ? 'enable' : 'disable' });
    } catch (error) {
      console.error('Error toggling supplier:', error);
      toast.error('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as LibraryTab);
    setSearch('');
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

  // 根据不同Tab决定是否显示启用/停用操作
  const showEnableAction = activeTab === 'backup' || activeTab === 'premium';
  const showDisableAction = activeTab === 'organization';
  const showBlacklistInfo = activeTab === 'blacklist';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">供应商管理</h1>
        <Button onClick={() => setImportDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          批量导入
        </Button>
      </div>

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(TAB_CONFIG) as LibraryTab[]).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="flex items-center gap-2">
              {TAB_CONFIG[tab].icon}
              <span>{TAB_CONFIG[tab].label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          {/* Tab描述和统计 */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {TAB_CONFIG[activeTab].description}
              <span className="ml-2 font-medium text-foreground">
                共 {suppliers.length} 个供应商
              </span>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索供应商名称、联系人或主营产品..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
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
                  <TableHead>标签</TableHead>
                  {(showEnableAction || showDisableAction) && (
                    <TableHead className="text-right">操作</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={showEnableAction || showDisableAction ? 7 : 6} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showEnableAction || showDisableAction ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      暂无供应商
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
                        <div className="flex gap-1">
                          {supplier.is_recommended && (
                            <Badge variant="default" className="bg-amber-500">推荐</Badge>
                          )}
                          {supplier.is_blacklisted && (
                            <Badge variant="destructive">拉黑</Badge>
                          )}
                          {!supplier.is_recommended && !supplier.is_blacklisted && (
                            <Badge variant="secondary">普通</Badge>
                          )}
                          {supplier.library_type === 'current' && (
                            <Badge variant="outline" className="text-green-600 border-green-600">已启用</Badge>
                          )}
                        </div>
                      </TableCell>
                      {(showEnableAction || showDisableAction) && (
                        <TableCell className="text-right">
                          {showDisableAction && supplier.library_type === 'current' && (
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
                          )}
                          {showEnableAction && supplier.library_type !== 'current' && (
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
                      )}
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

      {/* 供应商导入弹窗 */}
      <SupplierImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={fetchSuppliers}
      />
    </div>
  );
}
