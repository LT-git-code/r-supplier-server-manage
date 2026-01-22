import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Menu, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MenuPermission {
  id: string;
  menu_key: string;
  menu_name: string;
  menu_path: string;
  terminal: string;
  sort_order: number;
  icon: string | null;
  is_active: boolean;
  parent_key: string | null;
}

const ICON_OPTIONS = [
  'LayoutDashboard',
  'Building2',
  'Package',
  'FileCheck',
  'FileText',
  'Users',
  'CheckCircle',
  'Settings',
  'BarChart3',
  'FolderOpen',
  'Bell',
  'Shield',
  'Briefcase',
];

export default function MenuManagement() {
  const [menus, setMenus] = useState<MenuPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuPermission | null>(null);
  const [terminalFilter, setTerminalFilter] = useState<string>('admin');
  const [formData, setFormData] = useState({
    menu_key: '',
    menu_name: '',
    menu_path: '',
    terminal: 'admin',
    sort_order: 0,
    icon: 'LayoutDashboard',
    parent_key: '',
  });

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('roles-api', {
        body: { action: 'get_all_menus', terminal: terminalFilter },
      });
      if (error) throw error;
      setMenus(data.menus || []);
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast.error('获取菜单数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, [terminalFilter]);

  const handleCreate = () => {
    setSelectedMenu(null);
    setFormData({
      menu_key: '',
      menu_name: '',
      menu_path: '',
      terminal: terminalFilter,
      sort_order: menus.length * 10,
      icon: 'LayoutDashboard',
      parent_key: '',
    });
    setShowDialog(true);
  };

  const handleEdit = (menu: MenuPermission) => {
    setSelectedMenu(menu);
    setFormData({
      menu_key: menu.menu_key,
      menu_name: menu.menu_name,
      menu_path: menu.menu_path,
      terminal: menu.terminal,
      sort_order: menu.sort_order,
      icon: menu.icon || 'LayoutDashboard',
      parent_key: menu.parent_key || '',
    });
    setShowDialog(true);
  };

  const handleDisable = (menu: MenuPermission) => {
    setSelectedMenu(menu);
    setShowDisableDialog(true);
  };

  const handleDelete = (menu: MenuPermission) => {
    setSelectedMenu(menu);
    setShowDeleteDialog(true);
  };

  const handleSave = async () => {
    if (!formData.menu_key || !formData.menu_name || !formData.menu_path) {
      toast.error('请填写菜单键、名称和路径');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('roles-api', {
        body: {
          action: selectedMenu ? 'update_menu' : 'create_menu',
          menuId: selectedMenu?.id,
          menu: formData,
        },
      });
      if (error) throw error;
      toast.success(selectedMenu ? '菜单已更新' : '菜单已创建');
      setShowDialog(false);
      fetchMenus();
    } catch (error) {
      console.error('Error saving menu:', error);
      toast.error('保存菜单失败');
    }
  };

  const handleConfirmDisable = async () => {
    if (!selectedMenu) return;
    
    try {
      const { error } = await supabase.functions.invoke('roles-api', {
        body: { 
          action: 'toggle_menu_status', 
          menuId: selectedMenu.id,
          isActive: !selectedMenu.is_active,
        },
      });
      if (error) throw error;
      toast.success(selectedMenu.is_active ? '菜单已禁用' : '菜单已启用');
      setShowDisableDialog(false);
      fetchMenus();
    } catch (error) {
      console.error('Error toggling menu status:', error);
      toast.error('操作失败');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedMenu) return;
    
    try {
      const { error } = await supabase.functions.invoke('roles-api', {
        body: { action: 'delete_menu', menuId: selectedMenu.id },
      });
      if (error) throw error;
      toast.success('菜单已删除');
      setShowDeleteDialog(false);
      fetchMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.error('删除菜单失败');
    }
  };

  const activeMenus = menus.filter(m => m.is_active);
  const disabledMenus = menus.filter(m => !m.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={terminalFilter} onValueChange={setTerminalFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">管理员端</SelectItem>
              <SelectItem value="department">部门端</SelectItem>
              <SelectItem value="supplier">供应商端</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            共 {menus.length} 个菜单项，其中 {activeMenus.length} 个启用
          </span>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建菜单
        </Button>
      </div>

      {/* 启用的菜单 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Menu className="h-5 w-5" />
            菜单列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">排序</TableHead>
                  <TableHead>菜单键</TableHead>
                  <TableHead>菜单名称</TableHead>
                  <TableHead>路径</TableHead>
                  <TableHead>图标</TableHead>
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
                ) : menus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无菜单，点击上方按钮创建
                    </TableCell>
                  </TableRow>
                ) : (
                  menus.map((menu) => (
                    <TableRow key={menu.id} className={!menu.is_active ? 'opacity-50' : ''}>
                      <TableCell>{menu.sort_order}</TableCell>
                      <TableCell className="font-mono text-sm">{menu.menu_key}</TableCell>
                      <TableCell className="font-medium">{menu.menu_name}</TableCell>
                      <TableCell className="font-mono text-sm">{menu.menu_path}</TableCell>
                      <TableCell>{menu.icon || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                          {menu.is_active ? '启用' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(menu)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisable(menu)}
                        >
                          {menu.is_active ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        {!menu.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(menu)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* 菜单编辑弹窗 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedMenu ? '编辑菜单' : '新建菜单'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>菜单键 *</Label>
                <Input
                  value={formData.menu_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, menu_key: e.target.value }))}
                  placeholder="如：admin_dashboard"
                />
              </div>
              <div className="space-y-2">
                <Label>菜单名称 *</Label>
                <Input
                  value={formData.menu_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, menu_name: e.target.value }))}
                  placeholder="如：数据看板"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>菜单路径 *</Label>
              <Input
                value={formData.menu_path}
                onChange={(e) => setFormData(prev => ({ ...prev, menu_path: e.target.value }))}
                placeholder="如：/admin/dashboard"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>终端</Label>
                <Select
                  value={formData.terminal}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, terminal: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员端</SelectItem>
                    <SelectItem value="department">部门端</SelectItem>
                    <SelectItem value="supplier">供应商端</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>排序</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>图标</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>父级菜单键</Label>
                <Input
                  value={formData.parent_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_key: e.target.value }))}
                  placeholder="留空为顶级菜单"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 禁用/启用确认弹窗 */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedMenu?.is_active ? '禁用菜单' : '启用菜单'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMenu?.is_active 
                ? `确定要禁用菜单"${selectedMenu?.menu_name}"吗？禁用后该菜单将不再显示。`
                : `确定要启用菜单"${selectedMenu?.menu_name}"吗？`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDisable}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除菜单</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除菜单"{selectedMenu?.menu_name}"吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
