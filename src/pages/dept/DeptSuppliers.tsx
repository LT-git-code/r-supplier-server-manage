import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Power, PowerOff, Upload, Building2, Star, FolderOpen, ShieldX, Eye, Filter, X, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SupplierImportDialog from '@/components/dept/SupplierImportDialog';
import { AttachmentUpload } from '@/components/supplier/AttachmentUpload';

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
  is_hidden?: boolean;
  is_hidden_by_other?: boolean;
  product_names?: string[];
}

interface Filters {
  tag: string;
  type: string;
  companyName: string;
  contactName: string;
  productName: string;
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

const TAG_OPTIONS = [
  { value: 'all', label: '全部标签' },
  { value: 'recommended', label: '推荐' },
  { value: 'normal', label: '普通' },
  { value: 'blacklisted', label: '拉黑' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'enterprise', label: '企业' },
  { value: 'individual', label: '个人' },
  { value: 'overseas', label: '境外' },
];

export default function DeptSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LibraryTab>('organization');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'enable' | 'disable';
    supplier?: Supplier;
  }>({ open: false, type: 'enable' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [filters, setFilters] = useState<Filters>({
    tag: 'all',
    type: 'all',
    companyName: '',
    contactName: '',
    productName: '',
  });
  const [showFilters, setShowFilters] = useState(false);

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

  const handleToggleHidden = async (supplier: Supplier) => {
    setActionLoading(true);
    try {
      const newHiddenState = !supplier.is_hidden;
      const { error } = await supabase.functions.invoke('dept-api', {
        body: { 
          action: 'toggle_supplier_hidden', 
          supplierId: supplier.id,
          isHidden: newHiddenState,
        },
      });
      if (error) throw error;
      toast.success(newHiddenState ? '供应商联系信息已对其他部门隐藏' : '供应商联系信息已取消隐藏');
      fetchSuppliers(activeTab);
    } catch (error) {
      console.error('Error toggling hidden:', error);
      toast.error('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as LibraryTab);
    resetFilters();
  };

  const resetFilters = () => {
    setFilters({
      tag: 'all',
      type: 'all',
      companyName: '',
      contactName: '',
      productName: '',
    });
  };

  const hasActiveFilters = filters.tag !== 'all' || filters.type !== 'all' || filters.companyName || filters.contactName || filters.productName;

  const getSupplierTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      enterprise: { label: '企业', variant: 'default' },
      individual: { label: '个人', variant: 'secondary' },
      overseas: { label: '境外', variant: 'outline' },
    };
    const config = variants[type] || { label: type, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredSuppliers = suppliers.filter(s => {
    // 标签筛选
    if (filters.tag !== 'all') {
      if (filters.tag === 'recommended' && !s.is_recommended) return false;
      if (filters.tag === 'blacklisted' && !s.is_blacklisted) return false;
      if (filters.tag === 'normal' && (s.is_recommended || s.is_blacklisted)) return false;
    }
    
    // 类型筛选
    if (filters.type !== 'all' && s.supplier_type !== filters.type) return false;
    
    // 公司名称模糊搜索
    if (filters.companyName && !s.company_name?.toLowerCase().includes(filters.companyName.toLowerCase())) return false;
    
    // 联系人模糊搜索
    if (filters.contactName && !s.contact_name?.toLowerCase().includes(filters.contactName.toLowerCase())) return false;
    
    // 产品名称模糊搜索
    if (filters.productName) {
      const productMatch = s.product_names?.some(name => 
        name.toLowerCase().includes(filters.productName.toLowerCase())
      );
      if (!productMatch) return false;
    }
    
    return true;
  });

  // 根据不同Tab决定是否显示启用/停用操作
  const showEnableAction = activeTab === 'backup' || activeTab === 'premium';
  const showDisableAction = activeTab === 'organization';
  const showBlacklistInfo = activeTab === 'blacklist';

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailOpen(true);
  };

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
                {hasActiveFilters && ` (已筛选 ${filteredSuppliers.length} 个)`}
              </span>
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              筛选
              {hasActiveFilters && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
          </div>

          {/* 筛选区域 */}
          {showFilters && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">筛选条件</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    清除筛选
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* 标签筛选 */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">标签</label>
                  <Select
                    value={filters.tag}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, tag: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择标签" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAG_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 类型筛选 */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">类型</label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 公司名称搜索 */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">公司名称</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="模糊搜索..."
                      value={filters.companyName}
                      onChange={(e) => setFilters(prev => ({ ...prev, companyName: e.target.value }))}
                      className="h-9 pl-8"
                    />
                  </div>
                </div>

                {/* 联系人搜索 */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">联系人</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="模糊搜索..."
                      value={filters.contactName}
                      onChange={(e) => setFilters(prev => ({ ...prev, contactName: e.target.value }))}
                      className="h-9 pl-8"
                    />
                  </div>
                </div>

                {/* 产品名称搜索 */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">产品名称</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="模糊搜索..."
                      value={filters.productName}
                      onChange={(e) => setFilters(prev => ({ ...prev, productName: e.target.value }))}
                      className="h-9 pl-8"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(supplier)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                          {showDisableAction && supplier.library_type === 'current' && (
                            <>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleHidden(supplier)}
                                disabled={actionLoading}
                                className={supplier.is_hidden ? 'text-orange-500' : ''}
                              >
                                <EyeOff className="h-4 w-4 mr-1" />
                                {supplier.is_hidden ? '取消隐藏' : '隐藏'}
                              </Button>
                            </>
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
                        </div>
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

      {/* 供应商导入弹窗 */}
      <SupplierImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={fetchSuppliers}
      />

      {/* 供应商详情抽屉 */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>供应商详情</SheetTitle>
            <SheetDescription>
              {selectedSupplier?.company_name || selectedSupplier?.contact_name}
            </SheetDescription>
          </SheetHeader>

          {selectedSupplier && (
            <div className="mt-6 space-y-6">
              {/* 基本信息 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  基本信息
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">公司名称：</span>
                    <span className="ml-1">{selectedSupplier.company_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">类型：</span>
                    <span className="ml-1">{getSupplierTypeBadge(selectedSupplier.supplier_type)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">联系人：</span>
                    <span className="ml-1">{selectedSupplier.contact_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">联系电话：</span>
                    <span className="ml-1">{selectedSupplier.contact_phone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">主营产品：</span>
                    <span className="ml-1">{selectedSupplier.main_products || '-'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 附件信息 */}
              <Tabs defaultValue="capacity" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="capacity">生产能力</TabsTrigger>
                  <TabsTrigger value="finance">财务状况</TabsTrigger>
                  <TabsTrigger value="cases">过往案例</TabsTrigger>
                </TabsList>

                <TabsContent value="capacity" className="mt-4">
                  <AttachmentUpload
                    supplierId={selectedSupplier.id}
                    category="capacity"
                    title="生产能力附件"
                    description="设备清单、产能报告、生产线照片等"
                    readOnly
                  />
                </TabsContent>

                <TabsContent value="finance" className="mt-4">
                  <AttachmentUpload
                    supplierId={selectedSupplier.id}
                    category="finance"
                    title="财务状况附件"
                    description="财务报表、审计报告、纳税证明等"
                    readOnly
                  />
                </TabsContent>

                <TabsContent value="cases" className="mt-4">
                  <AttachmentUpload
                    supplierId={selectedSupplier.id}
                    category="cases"
                    title="过往案例附件"
                    description="合作案例、项目经验、业绩证明等"
                    readOnly
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
