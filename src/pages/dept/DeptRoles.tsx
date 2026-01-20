import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Edit, Trash2, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BackendRole {
  id: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  menu_permissions?: string[];
}

interface MenuPermission {
  id: string;
  menu_key: string;
  menu_name: string;
  menu_path: string;
  terminal: string;
  sort_order: number;
}

interface User {
  id: string;
  email: string;
  profile?: { full_name: string };
  backend_roles?: string[];
}

interface DeptRolesProps {
  embedded?: boolean;
}

export default function DeptRoles({ embedded = false }: DeptRolesProps) {
  const { currentRole } = useAuth();
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [menus, setMenus] = useState<MenuPermission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<BackendRole | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    menu_permissions: [] as string[],
  });
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);

  const terminal = currentRole === 'admin' ? 'admin' : 'department';

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('roles-api', {
        body: { action: 'get_roles_data', terminal },
      });
      if (error) throw error;
      setRoles(data.roles || []);
      setMenus(data.menus || []);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching roles data:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [terminal]);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      menu_permissions: [],
    });
    setShowRoleDialog(true);
  };

  const handleEditRole = (role: BackendRole) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
      menu_permissions: role.menu_permissions || [],
    });
    setShowRoleDialog(true);
  };

  const handleDeleteRole = (role: BackendRole) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const handleSaveRole = async () => {
    if (!formData.name || !formData.code) {
      toast.error('请填写角色名称和编码');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('roles-api', {
        body: {
          action: selectedRole ? 'update_role' : 'create_role',
          roleId: selectedRole?.id,
          role: formData,
        },
      });
      if (error) throw error;
      toast.success(selectedRole ? '角色已更新' : '角色已创建');
      setShowRoleDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('保存角色失败');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;
    
    try {
      const { error } = await supabase.functions.invoke('roles-api', {
        body: { action: 'delete_role', roleId: selectedRole.id },
      });
      if (error) throw error;
      toast.success('角色已删除');
      setShowDeleteDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('删除角色失败');
    }
  };

  const handleAssignRole = (user: User) => {
    setSelectedUser(user);
    setUserRoleIds(user.backend_roles || []);
    setShowUserDialog(true);
  };

  const handleSaveUserRoles = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase.functions.invoke('roles-api', {
        body: {
          action: 'assign_user_roles',
          userId: selectedUser.id,
          roleIds: userRoleIds,
        },
      });
      if (error) throw error;
      toast.success('用户角色已更新');
      setShowUserDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving user roles:', error);
      toast.error('保存用户角色失败');
    }
  };

  const toggleMenuPermission = (menuId: string) => {
    setFormData(prev => ({
      ...prev,
      menu_permissions: prev.menu_permissions.includes(menuId)
        ? prev.menu_permissions.filter(id => id !== menuId)
        : [...prev.menu_permissions, menuId],
    }));
  };

  const toggleUserRole = (roleId: string) => {
    setUserRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!embedded && <h1 className="text-2xl font-bold">后台角色管理</h1>}
        {embedded && <div />}
        <Button onClick={handleCreateRole}>
          <Plus className="mr-2 h-4 w-4" />
          新建角色
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 角色列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              角色列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>角色名称</TableHead>
                    <TableHead>编码</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        暂无角色，点击上方按钮创建
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.code}</TableCell>
                        <TableCell>
                          <Badge variant={role.is_active ? 'default' : 'secondary'}>
                            {role.is_active ? '启用' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* 用户角色分配 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              用户角色分配
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>已分配角色</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        暂无用户
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.profile?.full_name || '-'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.backend_roles && user.backend_roles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {roles
                                .filter(r => user.backend_roles?.includes(r.id))
                                .map(r => (
                                  <Badge key={r.id} variant="outline" className="text-xs">
                                    {r.name}
                                  </Badge>
                                ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">未分配</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignRole(user)}
                          >
                            分配角色
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
      </div>

      {/* 角色编辑弹窗 */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? '编辑角色' : '新建角色'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如：采购员"
                />
              </div>
              <div className="space-y-2">
                <Label>角色编码 *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="如：buyer"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="角色描述..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>菜单权限</Label>
              <div className="rounded-md border p-4 max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {menus.map((menu) => (
                    <div key={menu.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={menu.id}
                        checked={formData.menu_permissions.includes(menu.id)}
                        onCheckedChange={() => toggleMenuPermission(menu.id)}
                      />
                      <Label htmlFor={menu.id} className="text-sm font-normal cursor-pointer">
                        {menu.menu_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveRole}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 用户角色分配弹窗 */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              分配角色 - {selectedUser?.profile?.full_name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <div className="space-y-3">
                {roles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">暂无可分配的角色</p>
                ) : (
                  roles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={userRoleIds.includes(role.id)}
                        onCheckedChange={() => toggleUserRole(role.id)}
                      />
                      <Label htmlFor={`role-${role.id}`} className="text-sm font-normal cursor-pointer">
                        {role.name}
                        {role.description && (
                          <span className="text-muted-foreground ml-2">({role.description})</span>
                        )}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveUserRoles}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除角色"{selectedRole?.name}"吗？此操作不可恢复，且会移除所有用户的此角色分配。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
